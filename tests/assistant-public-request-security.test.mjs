import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_PUBLIC_REQUEST_POLICY,
  assistantPublicRateLimitConfig,
  assistantPublicRateLimitKey,
  isValidAssistantSessionId,
  validateAssistantPublicRequest
} from "../assistant-public-request-security.js";

function assistantRequest(body, {
  origin = "https://sdlive.show",
  method = "POST",
  contentType = "application/json",
  headers = {}
} = {}) {
  return new Request("https://sdlive.show/api/assistant", {
    method,
    headers: {
      Origin: origin,
      "Content-Type": contentType,
      ...headers
    },
    ...(method === "GET" || method === "HEAD" ? {} : { body: JSON.stringify(body) })
  });
}

test("policy keeps Assistant on a dedicated bounded public endpoint", () => {
  assert.equal(ASSISTANT_PUBLIC_REQUEST_POLICY.path, "/api/assistant");
  assert.equal(ASSISTANT_PUBLIC_REQUEST_POLICY.method, "POST");
  assert.deepEqual(ASSISTANT_PUBLIC_REQUEST_POLICY.allowedOrigins, ["https://sdlive.show"]);
  assert.equal(ASSISTANT_PUBLIC_REQUEST_POLICY.turnstileAction, "assistant");
  assert.equal(ASSISTANT_PUBLIC_REQUEST_POLICY.rateLimitBinding, "ASSISTANT_RATE_LIMITER");
  assert.ok(ASSISTANT_PUBLIC_REQUEST_POLICY.maxBodyBytes <= 8000);
  assert.ok(ASSISTANT_PUBLIC_REQUEST_POLICY.maxMessageChars <= 2500);
});

test("accepts only the minimal browser-controlled payload", async () => {
  const result = await validateAssistantPublicRequest(assistantRequest({
    sessionId: "asst_12345678901234567890",
    language: "es",
    message: "Necesito sonido para un evento",
    turnstileToken: "turnstile-token"
  }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    sessionId: "asst_12345678901234567890",
    language: "es",
    message: "Necesito sonido para un evento",
    turnstileToken: "turnstile-token"
  });
  assert.equal(result.security.expectedTurnstileAction, "assistant");
});

test("a new conversation may omit session id so the server can issue one", async () => {
  const result = await validateAssistantPublicRequest(assistantRequest({
    message: "Hello",
    language: "en",
    turnstileToken: "token"
  }));
  assert.equal(result.ok, true);
  assert.equal(result.value.sessionId, null);
});

test("client cannot choose model, prompt, tools or privileged business state", async () => {
  for (const field of [
    "model",
    "systemPrompt",
    "tools",
    "apiKey",
    "privacyConsentGranted",
    "source",
    "status",
    "leadId",
    "price",
    "availability",
    "finance"
  ]) {
    const result = await validateAssistantPublicRequest(assistantRequest({
      message: "Hello",
      turnstileToken: "token",
      [field]: "attacker-controlled"
    }));
    assert.equal(result.ok, false, field);
    assert.equal(result.error, "client_field_not_allowed", field);
    assert.equal(result.field, field, field);
  }
});

test("rejects cross-origin requests", async () => {
  const result = await validateAssistantPublicRequest(assistantRequest({
    message: "Hello",
    turnstileToken: "token"
  }, {
    origin: "https://evil.example"
  }));
  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "origin_not_allowed"
  });
});

test("rejects missing Turnstile token before any future model call", async () => {
  const result = await validateAssistantPublicRequest(assistantRequest({
    message: "Hello"
  }));
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "turnstile_required"
  });
});

test("rejects unsupported method and content type", async () => {
  const method = await validateAssistantPublicRequest(assistantRequest({}, { method: "GET" }));
  assert.equal(method.ok, false);
  assert.equal(method.status, 405);

  const content = await validateAssistantPublicRequest(assistantRequest({
    message: "Hello",
    turnstileToken: "token"
  }, {
    contentType: "text/plain"
  }));
  assert.equal(content.ok, false);
  assert.equal(content.status, 415);
});

test("rejects oversized messages and body payloads", async () => {
  const longMessage = "x".repeat(ASSISTANT_PUBLIC_REQUEST_POLICY.maxMessageChars + 1);
  const messageResult = await validateAssistantPublicRequest(assistantRequest({
    message: longMessage,
    turnstileToken: "token"
  }));
  assert.equal(messageResult.ok, false);
  assert.equal(messageResult.error, "message_too_long");

  const bodyResult = await validateAssistantPublicRequest(assistantRequest({
    message: "x".repeat(ASSISTANT_PUBLIC_REQUEST_POLICY.maxBodyBytes + 100),
    turnstileToken: "token"
  }));
  assert.equal(bodyResult.ok, false);
  assert.equal(bodyResult.status, 413);
});

test("session ids are server-shaped opaque identifiers", () => {
  assert.equal(isValidAssistantSessionId(null), true);
  assert.equal(isValidAssistantSessionId(""), true);
  assert.equal(isValidAssistantSessionId("asst_12345678901234567890"), true);
  assert.equal(isValidAssistantSessionId("client-picked-short"), false);
  assert.equal(isValidAssistantSessionId("asst_<script>alert(1)</script>"), false);
});

test("rate limiting is defined without invoking a binding", () => {
  assert.deepEqual(assistantPublicRateLimitConfig(), {
    binding: "ASSISTANT_RATE_LIMITER",
    retryAfter: 60
  });

  const request = new Request("https://sdlive.show/api/assistant", {
    headers: { "CF-Connecting-IP": "203.0.113.10" }
  });
  assert.equal(assistantPublicRateLimitKey(request), "203.0.113.10");
});
