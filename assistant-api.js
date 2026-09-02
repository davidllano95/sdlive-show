import {
  createAssistantBackendDependencies,
  runComposedAssistantTurn
} from "./assistant-backend-composition.js";
import {
  buildAssistantConsentEvidence,
  assistantConsentPrompt
} from "./assistant-consent-contract.js";
import {
  createAssistantRequestId,
  createAssistantSessionId
} from "./assistant-idempotency.js";
import { validateAssistantPublicRequest } from "./assistant-public-request-security.js";
import { enforceAssistantRateLimit } from "./assistant-rate-limit.js";
import {
  assistantFallback,
  assistantFallbackFromError
} from "./assistant-safe-fallbacks.js";
import {
  logAssistantSafeEvent,
  assistantSafeErrorCode
} from "./assistant-safe-logging.js";
import {
  sealAssistantSessionEnvelope,
  unsealAssistantSessionEnvelope
} from "./assistant-sealed-session.js";
import {
  applyAssistantConsentState,
  assistantSessionLeadDraft,
  createAssistantSessionState
} from "./assistant-session-state.js";
import { verifyTurnstileToken } from "./turnstile-verification.js";

export const ASSISTANT_API_VERSION = "assistant-api-v1";
export const ASSISTANT_API_PATH = "/api/assistant";

function normalizedPath(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  } catch {
    return "";
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
}

function sessionLanguage(state, fallback = "en") {
  return safeLanguage(state?.slots?.language || fallback);
}

function cancellationReply(language) {
  return safeLanguage(language) === "es"
    ? "No se guardó ni envió la solicitud. Puedes seguir conversando si quieres cambiar algún dato."
    : "The request was not saved or submitted. You can keep chatting if you want to change any details.";
}

function submissionReply(language) {
  return safeLanguage(language) === "es"
    ? "Tu solicitud fue guardada y quedó disponible para seguimiento por parte de SD.Live."
    : "Your request was saved and is available for SD.Live follow-up.";
}

function requestFailure(validation) {
  return json({
    ok: false,
    version: ASSISTANT_API_VERSION,
    error: validation?.error || "request_invalid"
  }, Number(validation?.status) || 400);
}

async function safeLog(logger, event, data, now) {
  try {
    return logAssistantSafeEvent(logger, event, data, { now });
  } catch {
    return null;
  }
}

async function issueSessionToken(sealSession, env, state, consentEvidence, now) {
  return sealSession(env, {
    state,
    consentEvidence: consentEvidence || null
  }, { now });
}

async function resolveSession({
  value,
  env,
  now,
  unsealSession,
  createSessionId,
  createSessionState,
  randomUUID
}) {
  if (value.sessionToken) {
    const envelope = await unsealSession(env, value.sessionToken, { now });
    return {
      state: envelope.state,
      consentEvidence: envelope.consentEvidence || null,
      existing: true
    };
  }

  return {
    state: createSessionState({
      sessionId: createSessionId({ randomUUID }),
      language: value.language,
      now
    }),
    consentEvidence: null,
    existing: false
  };
}

function publicTurnPayload(result, sessionToken) {
  const payload = {
    ok: true,
    version: ASSISTANT_API_VERSION,
    kind: result.kind,
    language: safeLanguage(result.language),
    reply: String(result.reply || ""),
    serviceCategory: result.serviceCategory || null,
    sessionToken,
    submitted: result.kind === "lead_captured"
  };

  if (result.kind === "request_consent" && result.consentPrompt) {
    payload.consentPrompt = result.consentPrompt;
  }
  if (result.kind === "lead_captured") {
    payload.notificationSent = result.notificationSent === true;
  }
  return payload;
}

async function notifyCapturedLead(deps, { leadId, leadDraft, language }) {
  try {
    await deps.handoffLead({ leadId, leadDraft, language });
    return { sent: true, errorCode: null };
  } catch (error) {
    return {
      sent: false,
      errorCode: assistantSafeErrorCode(error, "notification_failed")
    };
  }
}

async function handleConsentOperation({
  env,
  value,
  requestId,
  session,
  language,
  now,
  buildConsentEvidence,
  applyConsentState,
  leadDraftFromSession,
  deps,
  sealSession,
  logger
}) {
  if (value.consentAction === "cancel") {
    const clearedState = applyConsentState(session.state, {
      granted: false
    }, { now });
    const sessionToken = await issueSessionToken(
      sealSession,
      env,
      clearedState,
      null,
      now
    );

    await safeLog(logger, "response_sent", {
      requestId,
      language,
      outcome: "ok",
      httpStatus: 200,
      turnCount: clearedState.turnCount
    }, now);

    return json({
      ok: true,
      version: ASSISTANT_API_VERSION,
      kind: "consent_cancelled",
      language,
      reply: cancellationReply(language),
      sessionToken,
      submitted: false
    });
  }

  const built = buildConsentEvidence({
    action: value.consentAction,
    policyVersion: value.privacyPolicyVersion,
    language
  }, { now });
  if (!built?.ok || !built.evidence) {
    return requestFailure({
      status: 409,
      error: built?.error || "explicit_authorization_required"
    });
  }

  const evidence = built.evidence;
  const consentedState = applyConsentState(session.state, {
    granted: true,
    policyVersion: evidence.privacyPolicyVersion,
    grantedAt: evidence.grantedAt
  }, { now });
  const leadDraft = leadDraftFromSession(consentedState);

  await safeLog(logger, "consent_granted", {
    requestId,
    language,
    outcome: "ok",
    turnCount: consentedState.turnCount
  }, now);

  let captured;
  try {
    captured = await deps.captureLead({
      requestId,
      session: consentedState,
      consentEvidence: evidence,
      leadDraft
    });
  } catch (error) {
    const fallback = assistantFallbackFromError(error, language);
    const retryToken = await issueSessionToken(
      sealSession,
      env,
      consentedState,
      evidence,
      now
    );
    await safeLog(logger, "lead_create_failed", {
      requestId,
      language,
      outcome: "failed",
      errorCode: assistantSafeErrorCode(error, fallback.code),
      httpStatus: fallback.httpStatus,
      turnCount: consentedState.turnCount
    }, now);
    return json({
      ok: false,
      version: ASSISTANT_API_VERSION,
      kind: "submission_failed",
      language,
      reply: fallback.reply,
      error: fallback.code,
      retryable: fallback.retryable,
      sessionToken: retryToken,
      submitted: false
    }, fallback.httpStatus);
  }

  const leadId = Number(captured?.leadId);
  if (!Number.isInteger(leadId) || leadId < 1) {
    const fallback = assistantFallback("lead_create_failed", language);
    return json({
      ok: false,
      version: ASSISTANT_API_VERSION,
      kind: "submission_failed",
      language,
      reply: fallback.reply,
      error: fallback.code,
      retryable: fallback.retryable,
      submitted: false
    }, fallback.httpStatus);
  }

  await safeLog(logger, "lead_created", {
    requestId,
    leadId,
    language,
    outcome: "ok",
    turnCount: consentedState.turnCount
  }, now);

  const notification = await notifyCapturedLead(deps, {
    leadId,
    leadDraft,
    language
  });

  await safeLog(logger, notification.sent ? "notification_sent" : "notification_failed", {
    requestId,
    leadId,
    language,
    outcome: notification.sent ? "ok" : "failed",
    errorCode: notification.errorCode,
    notificationAttempted: true,
    notificationSent: notification.sent
  }, now);

  // Consent is single-use for an irreversible Lead submission. The exact
  // evidence remains persisted in privacy_consents, but the browser session is
  // resealed without reusable authorization so another Lead requires another
  // explicit product action.
  const consumedState = applyConsentState(consentedState, {
    granted: false
  }, { now });
  const sessionToken = await issueSessionToken(
    sealSession,
    env,
    consumedState,
    null,
    now
  );

  if (!notification.sent) {
    const fallback = assistantFallback("notification_failed", language, {
      leadPersisted: true
    });
    return json({
      ok: true,
      version: ASSISTANT_API_VERSION,
      kind: "lead_captured",
      language,
      reply: fallback.reply,
      sessionToken,
      submitted: true,
      notificationSent: false
    }, fallback.httpStatus);
  }

  return json({
    ok: true,
    version: ASSISTANT_API_VERSION,
    kind: "lead_captured",
    language,
    reply: submissionReply(language),
    sessionToken,
    submitted: true,
    notificationSent: true
  }, 201);
}

/**
 * Fully composed Assistant HTTP handler. It is intentionally transport-only:
 * importing this module does not mount /api/assistant anywhere. Runtime wiring
 * is a separate gate after the pending production smoke is closed.
 */
export async function handleAssistantApi(
  request,
  env,
  {
    validateRequest = validateAssistantPublicRequest,
    rateLimit = enforceAssistantRateLimit,
    verifyTurnstile = verifyTurnstileToken,
    turnstileFetch = globalThis.fetch,
    unsealSession = unsealAssistantSessionEnvelope,
    sealSession = sealAssistantSessionEnvelope,
    createSessionId = createAssistantSessionId,
    createRequestId = createAssistantRequestId,
    createSessionState = createAssistantSessionState,
    applyConsentState = applyAssistantConsentState,
    leadDraftFromSession = assistantSessionLeadDraft,
    buildConsentEvidence = buildAssistantConsentEvidence,
    runTurn = runComposedAssistantTurn,
    createDependencies = createAssistantBackendDependencies,
    compositionOptions = {},
    now: nowFactory = () => new Date(),
    randomUUID,
    logger = console
  } = {}
) {
  if (normalizedPath(request) !== ASSISTANT_API_PATH) return null;

  const validation = await validateRequest(request);
  if (!validation?.ok) {
    return requestFailure(validation);
  }

  const rateLimitResponse = await rateLimit(request, env);
  if (rateLimitResponse) return rateLimitResponse;

  const turnstile = await verifyTurnstile(
    request,
    env,
    validation.value.turnstileToken,
    validation.security.expectedTurnstileAction,
    { fetchImpl: turnstileFetch }
  ).catch(() => ({ ok: false, reason: "siteverify_unavailable" }));
  if (!turnstile?.ok) {
    const fallback = assistantFallback("turnstile_failed", validation.value.language);
    return json({
      ok: false,
      version: ASSISTANT_API_VERSION,
      error: fallback.code,
      reply: fallback.reply,
      retryable: fallback.retryable
    }, fallback.httpStatus);
  }

  const now = nowFactory();
  const requestId = createRequestId({ randomUUID });
  let session;
  try {
    session = await resolveSession({
      value: validation.value,
      env,
      now,
      unsealSession,
      createSessionId,
      createSessionState,
      randomUUID
    });
  } catch (error) {
    const expired = error?.code === "SESSION_TOKEN_EXPIRED";
    const fallback = assistantFallback("request_invalid", validation.value.language);
    return json({
      ok: false,
      version: ASSISTANT_API_VERSION,
      error: expired ? "session_expired" : "session_invalid",
      reply: fallback.reply,
      retryable: expired
    }, expired ? 409 : 400);
  }

  const language = sessionLanguage(session.state, validation.value.language);
  await safeLog(logger, "request_received", {
    requestId,
    language,
    outcome: "ok",
    turnCount: session.state.turnCount
  }, now);

  const deps = createDependencies(env, {
    ...compositionOptions,
    now: () => now
  });

  if (validation.operation === "consent") {
    return handleConsentOperation({
      env,
      value: validation.value,
      requestId,
      session,
      language,
      now,
      buildConsentEvidence,
      applyConsentState,
      leadDraftFromSession,
      deps,
      sealSession,
      logger
    });
  }

  let result;
  try {
    result = await runTurn(env, {
      requestId,
      message: validation.value.message,
      session: session.state,
      consentEvidence: session.consentEvidence
    }, {
      ...compositionOptions,
      now: () => now
    });
  } catch (error) {
    const fallback = assistantFallbackFromError(error, language);
    await safeLog(logger, "model_failed", {
      requestId,
      language,
      outcome: "failed",
      errorCode: assistantSafeErrorCode(error, fallback.code),
      httpStatus: fallback.httpStatus,
      turnCount: session.state.turnCount
    }, now);
    return json({
      ok: false,
      version: ASSISTANT_API_VERSION,
      error: fallback.code,
      reply: fallback.reply,
      retryable: fallback.retryable,
      submitted: false
    }, fallback.httpStatus);
  }

  // Any capture performed inside the orchestrator also consumes authorization
  // in the returned browser session. Normal replies/request_consent retain only
  // the still-valid evidence that entered the turn.
  const captured = result.kind === "lead_captured";
  const stateForToken = captured
    ? applyConsentState(result.session, { granted: false }, { now })
    : result.session;
  const evidenceForToken = captured ? null : session.consentEvidence;
  const sessionToken = await issueSessionToken(
    sealSession,
    env,
    stateForToken,
    evidenceForToken,
    now
  );

  if (captured && result.notificationSent !== true) {
    const fallback = assistantFallback("notification_failed", language, {
      leadPersisted: true
    });
    return json({
      ok: true,
      version: ASSISTANT_API_VERSION,
      kind: "lead_captured",
      language,
      reply: fallback.reply,
      serviceCategory: result.serviceCategory || null,
      sessionToken,
      submitted: true,
      notificationSent: false
    }, fallback.httpStatus);
  }

  await safeLog(logger, result.kind === "request_consent" ? "consent_prompted" : "response_sent", {
    requestId,
    language,
    serviceCategory: result.serviceCategory,
    outcome: "ok",
    httpStatus: captured ? 201 : 200,
    turnCount: stateForToken.turnCount,
    notificationSent: captured ? result.notificationSent === true : undefined
  }, now);

  return json(publicTurnPayload(result, sessionToken), captured ? 201 : 200);
}

export function assistantApiPolicy() {
  return Object.freeze({
    path: ASSISTANT_API_PATH,
    mounted: false,
    browserOperations: Object.freeze(["message", "consent"]),
    consentModelControlled: false,
    consentSingleUseAfterSubmission: true,
    sessionPersistence: "sealed_browser_token",
    transcriptPersistence: false,
    rateLimitBeforeTurnstile: true,
    turnstileBeforeSessionDecrypt: true,
    leadSourceOfTruth: "leads",
    notificationTransport: "resend",
    financeWrites: false
  });
}
