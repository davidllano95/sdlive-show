export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const OPENAI_PROVIDER_TIMEOUT_MS = 10000;
export const OPENAI_PROVIDER_MAX_OUTPUT_TOKENS = 700;

function providerError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function boundedText(value, maxLength) {
  return String(value ?? "").slice(0, maxLength);
}

function validModelName(value) {
  const model = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(model) ? model : null;
}

function validSchemaName(value) {
  const name = String(value || "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(name) ? name : null;
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function openAIProviderConfig(env = {}) {
  const apiKey = String(env.OPENAI_API_KEY || "").trim();
  const model = validModelName(env.OPENAI_ASSISTANT_MODEL);

  if (!apiKey) {
    throw providerError("OPENAI_NOT_CONFIGURED", "OPENAI_API_KEY is missing");
  }
  if (!model) {
    throw providerError("OPENAI_NOT_CONFIGURED", "OPENAI_ASSISTANT_MODEL is missing or invalid");
  }

  return { apiKey, model };
}

export function buildOpenAIResponsesRequest({
  model,
  instructions,
  message,
  context = {},
  schema,
  schemaName = "sdlive_assistant_turn",
  maxOutputTokens = OPENAI_PROVIDER_MAX_OUTPUT_TOKENS
} = {}) {
  const safeModel = validModelName(model);
  if (!safeModel) throw providerError("OPENAI_REQUEST_INVALID", "A valid model is required");

  const safeSchemaName = validSchemaName(schemaName);
  if (!safeSchemaName) throw providerError("OPENAI_REQUEST_INVALID", "A valid schema name is required");

  if (!plainObject(schema)) {
    throw providerError("OPENAI_REQUEST_INVALID", "A JSON schema is required");
  }

  const safeInstructions = boundedText(instructions, 24000).trim();
  const safeMessage = boundedText(message, 4000).trim();
  if (!safeInstructions || !safeMessage) {
    throw providerError("OPENAI_REQUEST_INVALID", "Instructions and message are required");
  }

  const tokens = Number(maxOutputTokens);
  if (!Number.isInteger(tokens) || tokens < 64 || tokens > 2000) {
    throw providerError("OPENAI_REQUEST_INVALID", "maxOutputTokens is out of bounds");
  }

  const modelInput = JSON.stringify({
    message: safeMessage,
    context: plainObject(context) ? context : {}
  });

  if (modelInput.length > 30000) {
    throw providerError("OPENAI_REQUEST_INVALID", "Model input is too large");
  }

  return {
    model: safeModel,
    store: false,
    max_output_tokens: tokens,
    instructions: safeInstructions,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: modelInput
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: safeSchemaName,
        strict: true,
        schema
      }
    }
  };
}

function extractStructuredText(data) {
  if (!plainObject(data)) {
    throw providerError("PROVIDER_INVALID_OUTPUT", "Provider response is not an object");
  }

  if (data.status !== "completed") {
    throw providerError(
      data.status === "incomplete" ? "PROVIDER_INCOMPLETE" : "PROVIDER_INVALID_OUTPUT",
      "Provider response did not complete"
    );
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === "refusal") {
        throw providerError("PROVIDER_REFUSAL", "Provider refused the request");
      }
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw providerError("PROVIDER_INVALID_OUTPUT", "Provider returned no structured text");
}

function safeUsage(data) {
  const usage = plainObject(data?.usage) ? data.usage : {};
  const integer = (value) => Number.isInteger(value) && value >= 0 ? value : null;
  return {
    inputTokens: integer(usage.input_tokens),
    outputTokens: integer(usage.output_tokens),
    totalTokens: integer(usage.total_tokens)
  };
}

export function parseOpenAIResponsesOutput(data) {
  const text = extractStructuredText(data);
  let output;
  try {
    output = JSON.parse(text);
  } catch {
    throw providerError("PROVIDER_INVALID_OUTPUT", "Structured output was not valid JSON");
  }

  if (!plainObject(output)) {
    throw providerError("PROVIDER_INVALID_OUTPUT", "Structured output must be an object");
  }

  return {
    output,
    model: validModelName(data.model) || null,
    usage: safeUsage(data)
  };
}

export async function callOpenAIResponses(
  env,
  requestInput,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = OPENAI_PROVIDER_TIMEOUT_MS
  } = {}
) {
  const { apiKey, model } = openAIProviderConfig(env);
  if (typeof fetchImpl !== "function") {
    throw providerError("OPENAI_NOT_CONFIGURED", "Provider fetch implementation is missing");
  }

  const timeout = Number(timeoutMs);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000) {
    throw providerError("OPENAI_REQUEST_INVALID", "Provider timeout is out of bounds");
  }

  const body = buildOpenAIResponsesRequest({
    ...requestInput,
    model
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw providerError("PROVIDER_TIMEOUT", "Provider request timed out");
    }
    throw providerError("PROVIDER_UNAVAILABLE", "Provider request failed");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw providerError("PROVIDER_RATE_LIMITED", "Provider rate limited the request");
    }
    throw providerError("PROVIDER_UNAVAILABLE", "Provider returned an error");
  }

  const data = await response.json().catch(() => null);
  return parseOpenAIResponsesOutput(data);
}

export function openAIProviderPolicy() {
  return Object.freeze({
    endpoint: OPENAI_RESPONSES_URL,
    api: "responses",
    structuredOutputs: true,
    strictSchema: true,
    store: false,
    providerManagedConversationState: false,
    builtInTools: false,
    modelBinding: "OPENAI_ASSISTANT_MODEL",
    apiKeyBinding: "OPENAI_API_KEY",
    timeoutMs: OPENAI_PROVIDER_TIMEOUT_MS,
    maxOutputTokens: OPENAI_PROVIDER_MAX_OUTPUT_TOKENS
  });
}
