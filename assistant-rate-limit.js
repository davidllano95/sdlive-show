export const ASSISTANT_RATE_LIMIT_POLICY = Object.freeze({
  binding: "ASSISTANT_RATE_LIMITER",
  retryAfterSeconds: 60,
  keySource: "CF-Connecting-IP",
  includesSessionToken: false,
  includesCustomerPii: false,
  failOpen: false
});

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function assistantRateLimitKey(request) {
  const ip = String(request?.headers?.get?.("CF-Connecting-IP") || "")
    .trim()
    .slice(0, 120);
  return ip || "unknown-client";
}

export async function enforceAssistantRateLimit(request, env) {
  const limiter = env?.[ASSISTANT_RATE_LIMIT_POLICY.binding];
  const retryAfter = String(ASSISTANT_RATE_LIMIT_POLICY.retryAfterSeconds);

  if (!limiter || typeof limiter.limit !== "function") {
    return json({
      ok: false,
      error: "assistant_temporarily_unavailable"
    }, 503, {
      "Retry-After": retryAfter
    });
  }

  let result;
  try {
    result = await limiter.limit({
      key: assistantRateLimitKey(request)
    });
  } catch {
    return json({
      ok: false,
      error: "assistant_temporarily_unavailable"
    }, 503, {
      "Retry-After": retryAfter
    });
  }

  if (result?.success === true) return null;

  return json({
    ok: false,
    error: "too_many_requests"
  }, 429, {
    "Retry-After": retryAfter
  });
}
