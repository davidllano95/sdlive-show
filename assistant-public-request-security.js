import { ASSISTANT_PRIVACY_POLICY_VERSION } from "./assistant-consent-contract.js";

export const ASSISTANT_PUBLIC_REQUEST_POLICY = Object.freeze({
  path: "/api/assistant",
  method: "POST",
  contentType: "application/json",
  allowedOrigins: Object.freeze(["https://sdlive.show"]),
  maxBodyBytes: 32000,
  maxMessageChars: 2500,
  maxSessionTokenChars: 24000,
  maxTurnstileTokenChars: 2048,
  maxPrivacyPolicyVersionChars: 80,
  turnstileAction: "assistant",
  rateLimitBinding: "ASSISTANT_RATE_LIMITER",
  retryAfterSeconds: 60,
  operations: Object.freeze(["message", "consent"]),
  consentActions: Object.freeze(["authorize", "cancel"])
});

const ALLOWED_BODY_KEYS = new Set([
  "message",
  "language",
  "sessionToken",
  "turnstileToken",
  "consentAction",
  "privacyPolicyVersion"
]);

function cleanString(value, maxLength) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function requestPath(request) {
  try {
    const url = new URL(request.url);
    return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  } catch {
    return "";
  }
}

function normalizedLanguage(value) {
  const language = cleanString(value, 8).toLowerCase();
  return language === "es" ? "es" : "en";
}

export function isValidAssistantSessionTokenShape(value) {
  if (value === undefined || value === null || value === "") return true;
  const token = String(value).trim();
  if (token.length > ASSISTANT_PUBLIC_REQUEST_POLICY.maxSessionTokenChars) return false;
  const parts = token.split(".");
  return parts.length === 3 &&
    parts[0] === "ast1" &&
    /^[A-Za-z0-9_-]{16}$/.test(parts[1]) &&
    /^[A-Za-z0-9_-]{20,23970}$/.test(parts[2]);
}

export function assistantPublicRateLimitConfig() {
  return {
    binding: ASSISTANT_PUBLIC_REQUEST_POLICY.rateLimitBinding,
    retryAfter: ASSISTANT_PUBLIC_REQUEST_POLICY.retryAfterSeconds
  };
}

export function assistantPublicRateLimitKey(request) {
  const ip = cleanString(request?.headers?.get?.("CF-Connecting-IP"), 120);
  return ip || "unknown-client";
}

function validateOperationFields(body, common) {
  const rawConsentAction = cleanString(body.consentAction, 40).toLowerCase();
  const hasConsentFields = Boolean(
    rawConsentAction ||
    body.privacyPolicyVersion !== undefined
  );
  const hasMessageField = body.message !== undefined && body.message !== null;

  if (hasConsentFields && hasMessageField) {
    return { ok: false, status: 400, error: "mixed_operation_not_allowed" };
  }

  if (hasConsentFields) {
    if (!common.sessionToken) {
      return { ok: false, status: 400, error: "consent_requires_session" };
    }
    if (!ASSISTANT_PUBLIC_REQUEST_POLICY.consentActions.includes(rawConsentAction)) {
      return { ok: false, status: 400, error: "invalid_consent_action" };
    }

    const policyVersion = cleanString(
      body.privacyPolicyVersion,
      ASSISTANT_PUBLIC_REQUEST_POLICY.maxPrivacyPolicyVersionChars + 1
    );
    if (!policyVersion) {
      return { ok: false, status: 400, error: "privacy_policy_version_required" };
    }
    if (policyVersion.length > ASSISTANT_PUBLIC_REQUEST_POLICY.maxPrivacyPolicyVersionChars) {
      return { ok: false, status: 400, error: "privacy_policy_version_too_long" };
    }
    if (policyVersion !== ASSISTANT_PRIVACY_POLICY_VERSION) {
      return { ok: false, status: 409, error: "privacy_policy_version_mismatch" };
    }

    return {
      ok: true,
      operation: "consent",
      value: {
        ...common,
        consentAction: rawConsentAction,
        privacyPolicyVersion: policyVersion,
        message: null
      }
    };
  }

  const message = cleanString(
    body.message,
    ASSISTANT_PUBLIC_REQUEST_POLICY.maxMessageChars + 1
  );
  if (!message) {
    return { ok: false, status: 400, error: "message_required" };
  }
  if (message.length > ASSISTANT_PUBLIC_REQUEST_POLICY.maxMessageChars) {
    return { ok: false, status: 400, error: "message_too_long" };
  }
  if (message.includes("\u0000")) {
    return { ok: false, status: 400, error: "invalid_message" };
  }

  return {
    ok: true,
    operation: "message",
    value: {
      ...common,
      message,
      consentAction: null,
      privacyPolicyVersion: null
    }
  };
}

export async function validateAssistantPublicRequest(request) {
  if (!request || typeof request !== "object") {
    return { ok: false, status: 400, error: "invalid_request" };
  }

  if (requestPath(request) !== ASSISTANT_PUBLIC_REQUEST_POLICY.path) {
    return { ok: false, status: 404, error: "invalid_path" };
  }

  if (String(request.method || "").toUpperCase() !== ASSISTANT_PUBLIC_REQUEST_POLICY.method) {
    return { ok: false, status: 405, error: "method_not_allowed" };
  }

  const origin = cleanString(request.headers.get("Origin"), 300);
  if (!ASSISTANT_PUBLIC_REQUEST_POLICY.allowedOrigins.includes(origin)) {
    return { ok: false, status: 403, error: "origin_not_allowed" };
  }

  const contentType = cleanString(request.headers.get("Content-Type"), 200).toLowerCase();
  if (!contentType.includes(ASSISTANT_PUBLIC_REQUEST_POLICY.contentType)) {
    return { ok: false, status: 415, error: "content_type_required" };
  }

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > ASSISTANT_PUBLIC_REQUEST_POLICY.maxBodyBytes
  ) {
    return { ok: false, status: 413, error: "request_too_large" };
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, error: "body_unreadable" };
  }

  if (new TextEncoder().encode(text).byteLength > ASSISTANT_PUBLIC_REQUEST_POLICY.maxBodyBytes) {
    return { ok: false, status: 413, error: "request_too_large" };
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "body_must_be_object" };
  }

  const unexpected = Object.keys(body).find((key) => !ALLOWED_BODY_KEYS.has(key));
  if (unexpected) {
    return {
      ok: false,
      status: 400,
      error: "client_field_not_allowed",
      field: unexpected
    };
  }

  if (!isValidAssistantSessionTokenShape(body.sessionToken)) {
    return { ok: false, status: 400, error: "invalid_session_token" };
  }

  const sessionToken = cleanString(
    body.sessionToken,
    ASSISTANT_PUBLIC_REQUEST_POLICY.maxSessionTokenChars + 1
  );
  if (sessionToken.length > ASSISTANT_PUBLIC_REQUEST_POLICY.maxSessionTokenChars) {
    return { ok: false, status: 400, error: "session_token_too_long" };
  }

  const turnstileToken = cleanString(
    body.turnstileToken,
    ASSISTANT_PUBLIC_REQUEST_POLICY.maxTurnstileTokenChars + 1
  );
  if (!turnstileToken && !sessionToken) {
    return { ok: false, status: 400, error: "turnstile_required" };
  }
  if (turnstileToken.length > ASSISTANT_PUBLIC_REQUEST_POLICY.maxTurnstileTokenChars) {
    return { ok: false, status: 400, error: "turnstile_token_too_long" };
  }

  const common = {
    sessionToken: sessionToken || null,
    language: normalizedLanguage(body.language),
    turnstileToken: turnstileToken || null
  };
  const operation = validateOperationFields(body, common);
  if (!operation.ok) return operation;

  return {
    ok: true,
    operation: operation.operation,
    value: operation.value,
    security: {
      expectedTurnstileAction: ASSISTANT_PUBLIC_REQUEST_POLICY.turnstileAction,
      rateLimit: assistantPublicRateLimitConfig(),
      turnstileRequiredForNewSession: !sessionToken,
      sessionTokenRequiresServerAuthentication: Boolean(sessionToken),
      consentIsExplicitProductAction: operation.operation === "consent"
    }
  };
}
