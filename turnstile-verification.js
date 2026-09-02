export const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_EXPECTED_HOSTNAME = "sdlive.show";

function cleanString(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function configurationError(message) {
  const error = new Error(message);
  error.code = "TURNSTILE_NOT_CONFIGURED";
  return error;
}

export async function verifyTurnstileToken(
  request,
  env,
  token,
  expectedAction,
  {
    fetchImpl = globalThis.fetch,
    expectedHostname = TURNSTILE_EXPECTED_HOSTNAME
  } = {}
) {
  if (!env?.TURNSTILE_SECRET_KEY) {
    throw configurationError("TURNSTILE_SECRET_KEY is missing");
  }

  if (typeof fetchImpl !== "function") {
    throw configurationError("Turnstile fetch implementation is missing");
  }

  const responseToken = cleanString(token, 2048);
  if (!responseToken) {
    return {
      ok: false,
      reason: "missing_token",
      errors: ["missing-input-response"]
    };
  }

  const remoteIp = cleanString(
    request?.headers?.get?.("CF-Connecting-IP") || "",
    64
  );

  let response;
  try {
    response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: responseToken,
        ...(remoteIp ? { remoteip: remoteIp } : {})
      })
    });
  } catch {
    return {
      ok: false,
      reason: "siteverify_unavailable",
      errors: ["internal-error"]
    };
  }

  const result = await response
    .json()
    .catch(() => ({
      success: false,
      "error-codes": ["invalid-response"]
    }));

  if (!response.ok || result?.success !== true) {
    return {
      ok: false,
      reason: "turnstile_failed",
      errors: Array.isArray(result?.["error-codes"])
        ? result["error-codes"].map((value) => cleanString(value, 128)).filter(Boolean)
        : []
    };
  }

  if (cleanString(result.hostname, 253) !== expectedHostname) {
    return {
      ok: false,
      reason: "hostname_mismatch",
      errors: []
    };
  }

  const action = cleanString(result.action, 128);
  if (expectedAction && action !== cleanString(expectedAction, 128)) {
    return {
      ok: false,
      reason: "action_mismatch",
      errors: []
    };
  }

  return {
    ok: true
  };
}

export function assistantTurnstilePolicy() {
  return Object.freeze({
    expectedHostname: TURNSTILE_EXPECTED_HOSTNAME,
    expectedAction: "assistant",
    secretBinding: "TURNSTILE_SECRET_KEY",
    browserMaySupplySecret: false,
    failOpen: false
  });
}
