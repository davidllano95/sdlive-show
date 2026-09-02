import test from "node:test";
import assert from "node:assert/strict";

import {
  TURNSTILE_SITEVERIFY_URL,
  assistantTurnstilePolicy,
  verifyTurnstileToken
} from "../turnstile-verification.js";

function request(ip = "203.0.113.10") {
  return new Request("https://sdlive.show/api/assistant", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": ip
    }
  });
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("Assistant Turnstile policy is fail-closed and server-secret only", () => {
  assert.deepEqual(assistantTurnstilePolicy(), {
    expectedHostname: "sdlive.show",
    expectedAction: "assistant",
    secretBinding: "TURNSTILE_SECRET_KEY",
    browserMaySupplySecret: false,
    failOpen: false
  });
});

test("valid Siteverify response succeeds and sends secret/token/IP server-side", async () => {
  const calls = [];
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "server-secret" },
    "browser-token",
    "assistant",
    {
      fetchImpl: async (...args) => {
        calls.push(args);
        return response({
          success: true,
          hostname: "sdlive.show",
          action: "assistant"
        });
      }
    }
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], TURNSTILE_SITEVERIFY_URL);
  const init = calls[0][1];
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(init.body), {
    secret: "server-secret",
    response: "browser-token",
    remoteip: "203.0.113.10"
  });
});

test("missing token fails without a network request", async () => {
  let called = false;
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "server-secret" },
    "",
    "assistant",
    {
      fetchImpl: async () => {
        called = true;
        return response({ success: true });
      }
    }
  );

  assert.equal(called, false);
  assert.deepEqual(result, {
    ok: false,
    reason: "missing_token",
    errors: ["missing-input-response"]
  });
});

test("missing secret is a configuration error rather than fail-open", async () => {
  await assert.rejects(
    () => verifyTurnstileToken(request(), {}, "token", "assistant"),
    (error) => error?.code === "TURNSTILE_NOT_CONFIGURED"
  );
});

test("network failure fails closed without leaking exception text", async () => {
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "server-secret" },
    "token",
    "assistant",
    {
      fetchImpl: async () => {
        throw new Error("private network details");
      }
    }
  );

  assert.deepEqual(result, {
    ok: false,
    reason: "siteverify_unavailable",
    errors: ["internal-error"]
  });
  assert.equal(JSON.stringify(result).includes("private network details"), false);
});

test("hostname mismatch is rejected", async () => {
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "secret" },
    "token",
    "assistant",
    {
      fetchImpl: async () => response({
        success: true,
        hostname: "evil.example",
        action: "assistant"
      })
    }
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "hostname_mismatch");
});

test("action mismatch is rejected", async () => {
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "secret" },
    "token",
    "assistant",
    {
      fetchImpl: async () => response({
        success: true,
        hostname: "sdlive.show",
        action: "contact"
      })
    }
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "action_mismatch");
});

test("failed Siteverify response returns bounded error codes only", async () => {
  const result = await verifyTurnstileToken(
    request(),
    { TURNSTILE_SECRET_KEY: "secret" },
    "token",
    "assistant",
    {
      fetchImpl: async () => response({
        success: false,
        "error-codes": ["invalid-input-response", "x".repeat(500)]
      })
    }
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "turnstile_failed");
  assert.equal(result.errors[0], "invalid-input-response");
  assert.equal(result.errors[1].length, 128);
});
