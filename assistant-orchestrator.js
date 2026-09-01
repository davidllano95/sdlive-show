export const ASSISTANT_ORCHESTRATOR_ACTIONS = Object.freeze([
  "reply",
  "check_availability",
  "request_consent",
  "capture_lead",
  "handoff"
]);

const ACTION_SET = new Set(ASSISTANT_ORCHESTRATOR_ACTIONS);

function orchestrationError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function requiredFunction(deps, name) {
  const fn = deps?.[name];
  if (typeof fn !== "function") {
    throw orchestrationError("ORCHESTRATOR_NOT_CONFIGURED", `${name} dependency is required`);
  }
  return fn;
}

function validLeadId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validModelOutput(result) {
  if (!result || result.ok !== true || !result.output) {
    throw orchestrationError("PROVIDER_INVALID_OUTPUT", "Validated model output is required");
  }
  const action = String(result.output.nextAction || "").trim();
  if (!ACTION_SET.has(action)) {
    throw orchestrationError("ACTION_NOT_ALLOWED", "Assistant action is not allowed");
  }
  return result.output;
}

async function validatedModelTurn({
  message,
  session,
  consentGranted,
  toolResult = null,
  deps
}) {
  const buildModelContext = requiredFunction(deps, "buildModelContext");
  const callModel = requiredFunction(deps, "callModel");
  const validateModelOutput = requiredFunction(deps, "validateModelOutput");

  const context = await buildModelContext(session, { toolResult });
  const raw = await callModel({
    message,
    context,
    toolResult
  });
  return validModelOutput(
    await validateModelOutput(raw, {
      privacyConsentGranted: consentGranted
    })
  );
}

async function consentIsFresh(consentEvidence, deps) {
  if (!consentEvidence) return false;
  const isConsentFresh = requiredFunction(deps, "isConsentFresh");
  return (await isConsentFresh(consentEvidence)) === true;
}

async function consentResult({ output, session, reason, deps }) {
  const getConsentPrompt = requiredFunction(deps, "getConsentPrompt");
  return {
    kind: "request_consent",
    reason,
    reply: output.reply,
    language: output.language,
    serviceCategory: output.serviceCategory,
    session,
    consentPrompt: await getConsentPrompt(output.language)
  };
}

async function notifyCapturedLead({ leadId, leadDraft, language, deps }) {
  if (typeof deps?.handoffLead !== "function") {
    return { notificationSent: false, notificationErrorCode: "handoff_not_configured" };
  }
  try {
    await deps.handoffLead({ leadId, leadDraft, language });
    return { notificationSent: true, notificationErrorCode: null };
  } catch (error) {
    return {
      notificationSent: false,
      notificationErrorCode: /^[a-z0-9_]{1,80}$/.test(String(error?.code || "").toLowerCase())
        ? String(error.code).toLowerCase()
        : "handoff_failed"
    };
  }
}

export async function runAssistantTurn({
  requestId,
  message,
  session,
  consentEvidence = null,
  existingLeadId = null
} = {}, deps = {}) {
  const safeRequestId = String(requestId || "").trim();
  const safeMessage = String(message || "").trim();
  if (!safeRequestId || !safeMessage || !session) {
    throw orchestrationError("REQUEST_INVALID", "requestId, message and session are required");
  }

  const consentGranted = await consentIsFresh(consentEvidence, deps);

  let output = await validatedModelTurn({
    message: safeMessage,
    session,
    consentGranted,
    deps
  });

  let availability = null;
  if (output.nextAction === "check_availability") {
    const readAvailability = requiredFunction(deps, "readAvailability");
    availability = await readAvailability();

    output = await validatedModelTurn({
      message: safeMessage,
      session,
      consentGranted,
      toolResult: {
        type: "availability",
        value: availability
      },
      deps
    });

    if (output.nextAction === "check_availability") {
      throw orchestrationError("TOOL_LOOP_BLOCKED", "Availability may be checked only once per turn");
    }
  }

  const applyTurn = requiredFunction(deps, "applyTurn");
  const nextSession = await applyTurn(session, output);

  if (output.nextAction === "reply") {
    return {
      kind: "reply",
      reply: output.reply,
      language: output.language,
      serviceCategory: output.serviceCategory,
      session: nextSession,
      availability
    };
  }

  if (output.nextAction === "request_consent") {
    return consentResult({
      output,
      session: nextSession,
      reason: "model_requested_consent",
      deps
    });
  }

  if (output.nextAction === "capture_lead") {
    // The model validator gets the server-side consent boolean, but the
    // orchestrator independently enforces it again before the irreversible write.
    if (!consentGranted) {
      return consentResult({
        output,
        session: nextSession,
        reason: "fresh_consent_required",
        deps
      });
    }

    if (!output.leadDraft) {
      throw orchestrationError("LEAD_DRAFT_REQUIRED", "capture_lead requires leadDraft");
    }

    const captureLead = requiredFunction(deps, "captureLead");
    const captured = await captureLead({
      requestId: safeRequestId,
      session: nextSession,
      consentEvidence,
      leadDraft: output.leadDraft
    });
    const leadId = validLeadId(captured?.leadId);
    if (!leadId) {
      throw orchestrationError("LEAD_CREATE_FAILED", "Lead capture returned no leadId");
    }

    const notification = await notifyCapturedLead({
      leadId,
      leadDraft: output.leadDraft,
      language: output.language,
      deps
    });

    return {
      kind: "lead_captured",
      reply: output.reply,
      language: output.language,
      serviceCategory: output.serviceCategory,
      session: nextSession,
      leadId,
      availability,
      ...notification
    };
  }

  if (output.nextAction === "handoff") {
    const leadId = validLeadId(existingLeadId);
    if (!leadId) {
      throw orchestrationError(
        "HANDOFF_REQUIRES_SERVER_LEAD_ID",
        "handoff requires an existing server-provided leadId"
      );
    }

    const handoffLead = requiredFunction(deps, "handoffLead");
    await handoffLead({
      leadId,
      leadDraft: output.leadDraft,
      language: output.language
    });

    return {
      kind: "handoff",
      reply: output.reply,
      language: output.language,
      serviceCategory: output.serviceCategory,
      session: nextSession,
      leadId,
      availability
    };
  }

  throw orchestrationError("ACTION_NOT_ALLOWED", "Assistant action is not allowed");
}

export function assistantOrchestratorPolicy() {
  return Object.freeze({
    maxAvailabilityToolCallsPerTurn: 1,
    modelExecutesToolsDirectly: false,
    modelControlsConsent: false,
    captureRequiresFreshServerConsent: true,
    handoffRequiresServerLeadId: true,
    notificationFailureRollsBackLead: false,
    financeWrites: false,
    rentalPricingWrites: false,
    leadSourceOfTruth: "leads"
  });
}
