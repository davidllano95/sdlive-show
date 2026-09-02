import test from "node:test";
import assert from "node:assert/strict";

import {
  OPENAI_RESPONSES_URL,
  buildOpenAIResponsesRequest,
  callOpenAIResponses,
  openAIProviderConfig,
  openAIProviderPolicy,
  parseOpenAIResponsesOutput
} from "../openai-assistant-provider.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "nextAction"],
  properties: {
    reply: { type: "string" },
    nextAction: { type: "string", enum: ["reply", "request_consent", "capture_lead"] }
  }
};

function completed(output = { reply: "Hello", nextAction: "reply" }) {
  return {
    status: "completed",
    model: "test-model",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(output)
          }
        ]
      }
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      total_tokens: 120
    }
  };
}

test("provider policy uses Responses API, strict structured output and no provider state", () => {
  assert.deepEqual(openAIProviderPolicy(), {
    endpoint: OPENAI_RESPONSES_URL,
    api: "responses",
    structuredOutputs: true,
    strictSchema: true,
    store: false,
    providerManagedConversationState: false,
    builtInTools: false,
    modelBinding: "OPENAI_ASSISTANT_MODEL",
    apiKeyBinding: "OPENAI_API_KEY",
    timeoutMs: 10000,
    maxOutputTokens: 700
  });
});

test("configuration requires explicit API key and model", () => {
  assert.throws(
    () => openAIProviderConfig({}),
    (error) => error?.code === "OPENAI_NOT_CONFIGURED"
  );
  assert.throws(
    () => openAIProviderConfig({ OPENAI_API_KEY: "secret" }),
    (error) => error?.code === "OPENAI_NOT_CONFIGURED"
  );
  assert.deepEqual(
    openAIProviderConfig({ OPENAI_API_KEY: "secret", OPENAI_ASSISTANT_MODEL: "gpt-test" }),
    { apiKey: "secret", model: "gpt-test" }
  );
});

test("request uses store=false and strict json_schema without tools or previous_response_id", () => {
  const body = buildOpenAIResponsesRequest({
    model: "gpt-test",
    instructions: "You are SD.Live Assistant.",
    message: "I need sound for a show",
    context: { language: "en", serviceCategory: "live" },
    schema
  });

  assert.equal(body.model, "gpt-test");
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 700);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema, schema);
  assert.equal(Object.hasOwn(body, "tools"), false);
  assert.equal(Object.hasOwn(body, "previous_response_id"), false);
  assert.equal(Object.hasOwn(body, "user"), false);

  const encoded = body.input[0].content[0].text;
  assert.deepEqual(JSON.parse(encoded), {
    message: "I need sound for a show",
    context: { language: "en", serviceCategory: "live" }
  });
});

test("request size and output token bounds fail closed", () => {
  assert.throws(
    () => buildOpenAIResponsesRequest({
      model: "gpt-test",
      instructions: "x",
      message: "y",
      schema,
      maxOutputTokens: 5000
    }),
    (error) => error?.code === "OPENAI_REQUEST_INVALID"
  );

  assert.throws(
    () => buildOpenAIResponsesRequest({
      model: "gpt-test",
      instructions: "x",
      message: "y",
      context: { huge: "z".repeat(40000) },
      schema
    }),
    (error) => error?.code === "OPENAI_REQUEST_INVALID"
  );
});

test("parser extracts structured JSON and bounded usage only", () => {
  assert.deepEqual(parseOpenAIResponsesOutput(completed()), {
    output: { reply: "Hello", nextAction: "reply" },
    model: "test-model",
    usage: {
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120
    }
  });
});

test("refusal, incomplete and malformed structured output fail closed", () => {
  assert.throws(
    () => parseOpenAIResponsesOutput({
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal", refusal: "No" }] }]
    }),
    (error) => error?.code === "PROVIDER_REFUSAL"
  );

  assert.throws(
    () => parseOpenAIResponsesOutput({ status: "incomplete", output: [] }),
    (error) => error?.code === "PROVIDER_INCOMPLETE"
  );

  assert.throws(
    () => parseOpenAIResponsesOutput({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "not-json" }] }]
    }),
    (error) => error?.code === "PROVIDER_INVALID_OUTPUT"
  );
});

test("provider call sends authorization only server-side and returns parsed output", async () => {
  const calls = [];
  const result = await callOpenAIResponses(
    {
      OPENAI_API_KEY: "server-secret",
      OPENAI_ASSISTANT_MODEL: "gpt-test"
    },
    {
      instructions: "You are SD.Live Assistant.",
      message: "Need theatre audio",
      context: { language: "en" },
      schema
    },
    {
      fetchImpl: async (...args) => {
        calls.push(args);
        return new Response(JSON.stringify(completed()), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  );

  assert.equal(calls[0][0], OPENAI_RESPONSES_URL);
  assert.equal(calls[0][1].headers.Authorization, "Bearer server-secret");
  const sent = JSON.parse(calls[0][1].body);
  assert.equal(sent.store, false);
  assert.equal(JSON.stringify(sent).includes("server-secret"), false);
  assert.equal(result.output.nextAction, "reply");
});

test("provider HTTP errors expose only stable codes, never raw body", async () => {
  await assert.rejects(
    () => callOpenAIResponses(
      { OPENAI_API_KEY: "secret", OPENAI_ASSISTANT_MODEL: "gpt-test" },
      { instructions: "x", message: "y", schema },
      {
        fetchImpl: async () => new Response(
          JSON.stringify({ error: { message: "private provider diagnostic" } }),
          { status: 500 }
        )
      }
    ),
    (error) => {
      assert.equal(error?.code, "PROVIDER_UNAVAILABLE");
      assert.equal(String(error?.message).includes("private provider diagnostic"), false);
      return true;
    }
  );
});

test("provider 429 has a distinct bounded code", async () => {
  await assert.rejects(
    () => callOpenAIResponses(
      { OPENAI_API_KEY: "secret", OPENAI_ASSISTANT_MODEL: "gpt-test" },
      { instructions: "x", message: "y", schema },
      { fetchImpl: async () => new Response("{}", { status: 429 }) }
    ),
    (error) => error?.code === "PROVIDER_RATE_LIMITED"
  );
});

test("provider timeout aborts and reports a stable code", async () => {
  await assert.rejects(
    () => callOpenAIResponses(
      { OPENAI_API_KEY: "secret", OPENAI_ASSISTANT_MODEL: "gpt-test" },
      { instructions: "x", message: "y", schema },
      {
        timeoutMs: 1000,
        fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
      }
    ),
    (error) => error?.code === "PROVIDER_TIMEOUT"
  );
});
