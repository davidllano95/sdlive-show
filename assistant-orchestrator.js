export const ASSISTANT_ORCHESTRATOR_ACTIONS = Object.freeze([
  "reply",
  "check_availability",
  "check_rental",
  "request_consent",
  "capture_lead",
  "handoff"
]);

const ACTION_SET = new Set(ASSISTANT_ORCHESTRATOR_ACTIONS);
const TOOL_ACTIONS = new Set(["check_availability", "check_rental"]);
const MAX_TOOL_HOPS_PER_TURN = 2;

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

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
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

function mergeSlotPatch(current, incoming) {
  const base = plainObject(current) ? { ...current } : {};
  if (!plainObject(incoming)) return base;

  for (const [key, value] of Object.entries(incoming)) {
    if (["contact", "project"].includes(key) && plainObject(value)) {
      base[key] = {
        ...(plainObject(base[key]) ? base[key] : {}),
        ...value
      };
    } else {
      base[key] = value;
    }
  }
  return base;
}

function rentalRequestedName(rentalQuery, issue) {
  const items = Array.isArray(rentalQuery?.items) ? rentalQuery.items : [];
  const requestedQuantity = Number(issue?.requestedQuantity);
  const match = items.find((item) => Number(item?.quantity) === requestedQuantity) || items[0];
  const name = String(match?.name || "").trim();
  return name || String(issue?.key || "requested item").trim();
}

function rentalFailClosedReply(rentalQuery, result, language) {
  const lang = safeLanguage(language);
  const issues = Array.isArray(result?.issues) ? result.issues : [];
  const unresolved = Array.isArray(result?.unresolved) ? result.unresolved : [];
  const limitIssue = issues.find((issue) => issue?.type === "quantity_exceeds_current_backend_limit");

  if (limitIssue) {
    const itemName = rentalRequestedName(rentalQuery, limitIssue);
    const requested = Number(limitIssue.requestedQuantity) || 0;
    const maximum = Number(limitIssue.maxQuantity) || 0;
    if (lang === "es") {
      return `El catálogo actual de Rental admite hasta ${maximum} unidades de ${itemName}, así que no puedo confirmar una solicitud de ${requested}. Tampoco puedo cotizar el precio ni confirmar disponibilidad de inventario desde esta consulta; ambos requieren una cotización o revisión aparte.`;
    }
    return `The current Rental catalog supports up to ${maximum} ${itemName} units, so I can't confirm a request for ${requested}. I also can't quote pricing or confirm inventory availability from this check; both require a separate quote or review.`;
  }

  if (unresolved.length > 0) {
    const names = unresolved
      .map((item) => String(item?.requested || "").trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    if (lang === "es") {
      return `No pude relacionar ${names || "esa selección"} con el catálogo actual de Rental, así que no voy a sustituir ni adivinar otro equipo. Tampoco puedo cotizar el precio ni confirmar disponibilidad de inventario desde esta consulta; aclara el modelo exacto o solicita una revisión humana.`;
    }
    return `I couldn't match ${names || "that selection"} to the current Rental catalog, so I won't substitute or guess another item. I also can't quote pricing or confirm inventory availability from this check; please clarify the exact model or request a human review.`;
  }

  if (lang === "es") {
    return "No pude validar esa selección dentro de los límites actuales del catálogo de Rental. No puedo cotizar el precio ni confirmar disponibilidad de inventario desde esta consulta; ajusta la solicitud o solicita una revisión humana.";
  }
  return "I couldn't validate that selection within the current Rental catalog limits. I can't quote pricing or confirm inventory availability from this check; please adjust the request or request a human review.";
}

export function inferAssistantDeterministicSlotPatch(message) {
  const text = String(message || "").trim();
  if (!text) return {};

  const venueIsUnconfirmed = [
    /\bvenue\s+(?:(?:is|remains?)\s+)?(?:still\s+)?(?:tbd|to be (?:confirmed|determined)|not (?:yet )?confirmed)\b/i,
    /\b(?:venue|lugar|sede)\s+(?:(?:es|est[aá]|sigue)\s+)?(?:(?:a[uú]n|todav[ií]a)\s+)?(?:tbd|por confirmar|sin confirmar)\b/i
  ].some((pattern) => pattern.test(text));

  return venueIsUnconfirmed
    ? { project: { venue: "TBD" } }
    : {};
}

async function validatedModelTurn({
  message,
  session,
  consentGranted,
  toolResults = [],
  deps
}) {
  const buildModelContext = requiredFunction(deps, "buildModelContext");
  const callModel = requiredFunction(deps, "callModel");
  const validateModelOutput = requiredFunction(deps, "validateModelOutput");

  const safeToolResults = Array.isArray(toolResults) ? toolResults.slice(0, MAX_TOOL_HOPS_PER_TURN) : [];
  const context = await buildModelContext(session, { toolResults: safeToolResults });
  const raw = await callModel({
    message,
    context,
    toolResults: safeToolResults
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

async function consentResult({ output, session, reason, deps, toolResults }) {
  const getConsentPrompt = requiredFunction(deps, "getConsentPrompt");
  return {
    kind: "request_consent",
    reason,
    reply: output.reply,
    language: output.language,
    serviceCategory: output.serviceCategory,
    session,
    toolResults,
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

async function executeTool(output, deps) {
  if (output.nextAction === "check_availability") {
    const readAvailability = requiredFunction(deps, "readAvailability");
    return {
      type: "availability",
      value: await readAvailability()
    };
  }

  if (output.nextAction === "check_rental") {
    if (!output.rentalQuery) {
      throw orchestrationError("RENTAL_QUERY_REQUIRED", "check_rental requires a validated rentalQuery");
    }
    const resolveRentalQuery = requiredFunction(deps, "resolveRentalQuery");
    return {
      type: "rental",
      value: await resolveRentalQuery(output.rentalQuery)
    };
  }

  throw orchestrationError("ACTION_NOT_ALLOWED", "Requested action is not a tool action");
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
  const toolResults = [];
  const usedToolActions = new Set();
  let mergedSlotPatch = inferAssistantDeterministicSlotPatch(safeMessage);

  let output = await validatedModelTurn({
    message: safeMessage,
    session,
    consentGranted,
    toolResults,
    deps
  });
  mergedSlotPatch = mergeSlotPatch(mergedSlotPatch, output.slotPatch);

  while (TOOL_ACTIONS.has(output.nextAction)) {
    if (usedToolActions.has(output.nextAction)) {
      throw orchestrationError("TOOL_LOOP_BLOCKED", `${output.nextAction} may run only once per turn`);
    }
    if (toolResults.length >= MAX_TOOL_HOPS_PER_TURN) {
      throw orchestrationError("TOOL_LOOP_BLOCKED", "Assistant tool-hop limit reached");
    }

    usedToolActions.add(output.nextAction);
    const toolResult = await executeTool(output, deps);
    toolResults.push(toolResult);

    // Rental selections that are already conclusively outside the deterministic
    // boundary must fail closed at the server. Do not ask the model to reason
    // over the same rejected selection again, because that can cause a second
    // check_rental request and surface an internal tool-loop error to the user.
    if (toolResult.type === "rental" && toolResult.value?.readyForBackendEvaluation !== true) {
      const applyTurn = requiredFunction(deps, "applyTurn");
      const nextSession = await applyTurn(session, mergedSlotPatch);
      return {
        kind: "reply",
        reply: rentalFailClosedReply(output.rentalQuery, toolResult.value, output.language),
        language: safeLanguage(output.language),
        serviceCategory: output.serviceCategory || "rental",
        session: nextSession,
        toolResults
      };
    }

    output = await validatedModelTurn({
      message: safeMessage,
      session,
      consentGranted,
      toolResults,
      deps
    });
    mergedSlotPatch = mergeSlotPatch(mergedSlotPatch, output.slotPatch);
  }

  const applyTurn = requiredFunction(deps, "applyTurn");
  const nextSession = await applyTurn(session, mergedSlotPatch);

  if (output.nextAction === "reply") {
    return {
      kind: "reply",
      reply: output.reply,
      language: output.language,
      serviceCategory: output.serviceCategory,
      session: nextSession,
      toolResults
    };
  }

  if (output.nextAction === "request_consent") {
    return consentResult({
      output,
      session: nextSession,
      reason: "model_requested_consent",
      deps,
      toolResults
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
        deps,
        toolResults
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
      toolResults,
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
      toolResults
    };
  }

  throw orchestrationError("ACTION_NOT_ALLOWED", "Assistant action is not allowed");
}

export function assistantOrchestratorPolicy() {
  return Object.freeze({
    maxToolHopsPerTurn: MAX_TOOL_HOPS_PER_TURN,
    maxAvailabilityToolCallsPerTurn: 1,
    maxRentalToolCallsPerTurn: 1,
    modelExecutesToolsDirectly: false,
    modelControlsConsent: false,
    incrementalSlotsAppliedOncePerTurn: true,
    captureRequiresFreshServerConsent: true,
    handoffRequiresServerLeadId: true,
    notificationFailureRollsBackLead: false,
    financeWrites: false,
    rentalPricingWrites: false,
    leadSourceOfTruth: "leads"
  });
}
