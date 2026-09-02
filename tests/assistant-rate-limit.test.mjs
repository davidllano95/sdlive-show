import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_RATE_LIMIT_POLICY,
  assistantRateLimitKey,
  enforceAssistantRateLimit
} from "../assistant-rate-limit.js";

function request(ip = "203.0.113.10") {
  return new Request("https://sdlive.show/api/assistant", {
    method: "POST",
    headers: ip ? { "CF-Connecting-IP": ip } : {}
  });
}

async function body(response) {
  return response ? response.json() : null;
}

test("policy uses only Cloudflare client IP and excludes session/customer data", () => {
  assert.deepEqual(ASSISTANT_RATE_LIMIT_POLICY, {
    binding: "ASSISTANT_RATE_LIMITER",
    retryAfterSeconds: 60,
    keySource: "CF-Connecting-IP",
    includesSessionToken: false,
    includesCustomerPii: false,
    failOpen: false
  });
});

test("rate-limit key is bounded IP only", () => {
  assert.equal(assistantRateLimitKey(request("203.0.113.10")), "203.0.113.10");
  assert.equal(assistantRateLimitKey(request("x".repeat(200))).length, 120);
  assert.equal(assistantRateLimitKey(request("")), "unknown-client");
});

test("successful limiter returns no response and invokes binding once", async () => {
  const calls = [];
  const response = await enforceAssistantRateLimit(request(), {
    ASSISTANT_RATE_LIMITER: {
      async limit(input) {
        calls.push(input);
        return { success: true };
      }
    }
  });

  assert.equal(response, null);
  assert.deepEqual(calls, [{ key: "203.0.113.10" }]);
});

test("limited request returns generic 429 with retry header", async () => {
  const response = await enforceAssistantRateLimit(request(), {
    ASSISTANT_RATE_LIMITER: {
      async limit() {
        return { success: false };
      }
    }
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await body(response), {
    ok: false,
    error: "too_many_requests"
  });
});

test("missing binding fails closed instead of allowing model traffic", async () => {
  const response = await enforceAssistantRateLimit(request(), {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await body(response), {
    ok: false,
    error: "assistant_temporarily_unavailable"
  });
});

test("binding exception fails closed without leaking provider details", async () => {
  const response = await enforceAssistantRateLimit(request(), {
    ASSISTANT_RATE_LIMITER: {
      async limit() {
        throw new Error("private Cloudflare diagnostic");
      }
    }
  });

  assert.equal(response.status, 503);
  const text = await response.text();
  assert.equal(text.includes("private Cloudflare diagnostic"), false);
  assert.match(text, /assistant_temporarily_unavailable/);
});

test("malformed limiter response is treated as limited, not success", async () => {
  const response = await enforceAssistantRateLimit(request(), {
    ASSISTANT_RATE_LIMITER: {
      async limit() {
        return {};
      }
    }
  });
  assert.equal(response.status, 429);
});
