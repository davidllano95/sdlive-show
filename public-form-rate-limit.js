import appWorker from "./worker-router.js";

const PUBLIC_FORM_LIMITS = {
  "/api/contact": {
    binding: "CONTACT_FORM_RATE_LIMITER",
    retryAfter: 60
  },
  "/api/rental": {
    binding: "RENTAL_FORM_RATE_LIMITER",
    retryAfter: 60
  }
};

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;
}

export function publicFormRateLimitConfig(request) {
  if (request.method !== "POST") return null;
  return PUBLIC_FORM_LIMITS[normalizedPath(request)] || null;
}

export function publicFormRateLimitKey(request) {
  const ip = String(request.headers.get("CF-Connecting-IP") || "").trim();
  return ip || "unknown-client";
}

function jsonResponse(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function enforcePublicFormRateLimit(request, env) {
  const config = publicFormRateLimitConfig(request);
  if (!config) return null;

  const limiter = env?.[config.binding];
  if (!limiter || typeof limiter.limit !== "function") {
    console.error(`[SD.Live] Missing rate-limit binding: ${config.binding}`);
    return jsonResponse(
      {
        ok: false,
        error: "Form submissions are temporarily unavailable"
      },
      503,
      { "Retry-After": String(config.retryAfter) }
    );
  }

  const { success } = await limiter.limit({
    key: publicFormRateLimitKey(request)
  });

  if (success) return null;

  return jsonResponse(
    {
      ok: false,
      error: "Too many requests. Please wait a minute and try again."
    },
    429,
    { "Retry-After": String(config.retryAfter) }
  );
}

export default {
  async fetch(request, env) {
    const limited = await enforcePublicFormRateLimit(request, env);
    if (limited) return limited;
    return appWorker.fetch(request, env);
  }
};
