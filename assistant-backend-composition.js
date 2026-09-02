import { readAssistantAvailability } from "./assistant-availability-tool.js";
import {
  assistantConsentPrompt,
  isFreshAssistantConsentEvidence
} from "./assistant-consent-contract.js";
import { buildAssistantHandoff } from "./assistant-handoff.js";
import {
  assistantModelOutputJsonSchema,
  validateAssistantModelOutput
} from "./assistant-model-output.js";
import { buildAssistantNotificationFromEnv } from "./assistant-notification-contract.js";
import { runAssistantTurn } from "./assistant-orchestrator.js";
import { resolveAssistantRentalQuery } from "./assistant-rental-query.js";
import {
  applyAssistantTurnSlots,
  assistantSessionModelContext
} from "./assistant-session-state.js";
import { assistantSystemInstructions } from "./assistant-system-policy.js";
import { callOpenAIResponses } from "./openai-assistant-provider.js";

export const ASSISTANT_BACKEND_COMPOSITION_VERSION = "assistant-backend-composition-v1";

function compositionError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
}

function preferredReplyTo(leadDraft) {
  const email = String(leadDraft?.contact?.email || "").trim();
  return email || null;
}

async function defaultProviderCall(env, input, { fetchImpl } = {}) {
  const result = await callOpenAIResponses(env, input, { fetchImpl });
  return result.output;
}

async function defaultNotificationSend(env, {
  leadId,
  leadDraft,
  language
}, {
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw compositionError("ASSISTANT_NOTIFICATION_NOT_CONFIGURED", "Notification fetch is unavailable");
  }

  const canonical = {
    ...leadDraft,
    source: "assistant",
    status: "new"
  };
  const handoff = buildAssistantHandoff(canonical);
  const request = buildAssistantNotificationFromEnv(env, {
    leadId,
    subject: handoff.subject,
    text: safeLanguage(language) === "es" ? handoff.textEs : handoff.textEn,
    replyTo: preferredReplyTo(leadDraft)
  });

  let response;
  try {
    response = await fetchImpl(request.url, request.init);
  } catch {
    throw compositionError("notification_unavailable", "Assistant notification transport failed");
  }

  if (!response?.ok) {
    throw compositionError("notification_failed", "Assistant notification was rejected");
  }

  return { ok: true };
}

export function createAssistantBackendDependencies(
  env,
  {
    providerCall = defaultProviderCall,
    providerFetch = globalThis.fetch,
    availabilityReader = readAssistantAvailability,
    rentalResolver = resolveAssistantRentalQuery,
    captureLeadEffect = null,
    notificationSend = defaultNotificationSend,
    notificationFetch = globalThis.fetch,
    now = () => new Date()
  } = {}
) {
  return {
    async buildModelContext(session, { toolResults = [] } = {}) {
      return {
        session: assistantSessionModelContext(session),
        toolResults: Array.isArray(toolResults) ? toolResults.slice(0, 2) : []
      };
    },

    async callModel({ message, context }) {
      const language = safeLanguage(context?.session?.slots?.language);
      const raw = await providerCall(env, {
        instructions: assistantSystemInstructions(language),
        message,
        context,
        schema: assistantModelOutputJsonSchema(),
        schemaName: "sdlive_assistant_turn"
      }, {
        fetchImpl: providerFetch
      });

      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw compositionError("PROVIDER_INVALID_OUTPUT", "Assistant provider returned no object");
      }
      return raw;
    },

    validateModelOutput(raw, context) {
      return validateAssistantModelOutput(raw, context);
    },

    applyTurn(session, slotPatch) {
      return applyAssistantTurnSlots(session, slotPatch || {}, { now: now() });
    },

    readAvailability() {
      return availabilityReader(env);
    },

    resolveRentalQuery(query) {
      return rentalResolver(query);
    },

    getConsentPrompt(language) {
      return assistantConsentPrompt(language);
    },

    isConsentFresh(evidence) {
      return isFreshAssistantConsentEvidence(evidence, now());
    },

    async captureLead(input) {
      if (typeof captureLeadEffect !== "function") {
        throw compositionError(
          "LEAD_CAPTURE_PERSISTENCE_NOT_CONFIGURED",
          "Assistant Lead capture persistence is not configured"
        );
      }
      return captureLeadEffect(env, input, { now: now() });
    },

    handoffLead(input) {
      return notificationSend(env, input, { fetchImpl: notificationFetch });
    }
  };
}

export async function runComposedAssistantTurn(
  env,
  input,
  options = {}
) {
  return runAssistantTurn(
    input,
    createAssistantBackendDependencies(env, options)
  );
}

export function assistantBackendCompositionPolicy() {
  return Object.freeze({
    version: ASSISTANT_BACKEND_COMPOSITION_VERSION,
    provider: "openai_responses_structured_output",
    providerExecutesTools: false,
    transcriptPersistence: false,
    modelReceivesStructuredSessionOnly: true,
    availabilityAuthority: "availability_core",
    rentalAuthority: "deterministic_rental_boundary",
    consentAuthority: "product_server",
    leadSourceOfTruth: "leads",
    leadCaptureRequiresExplicitPersistenceAdapter: true,
    notificationTransport: "resend",
    financeWrites: false
  });
}
