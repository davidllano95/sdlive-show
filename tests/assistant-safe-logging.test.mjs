import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_LOGGING_POLICY,
  ASSISTANT_LOG_EVENTS,
  assistantSafeErrorCode,
  buildAssistantSafeLogEntry,
  logAssistantSafeEvent
} from "../assistant-safe-logging.js";

test("logging policy explicitly forbids conversation, contact and secret payloads", () => {
  assert.equal(ASSISTANT_LOGGING_POLICY.rawUserMessage, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.rawAssistantReply, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.transcript, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.email, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.phone, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.whatsapp, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.turnstileToken, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.sessionId, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.prompt, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.modelOutput, false);
  assert.equal(ASSISTANT_LOGGING_POLICY.stackTrace, false);
  assert.ok(ASSISTANT_LOG_EVENTS.includes("lead_created"));
  assert.ok(ASSISTANT_LOG_EVENTS.includes("model_failed"));
});

test("safe log keeps only bounded operational metadata", () => {
  const entry = buildAssistantSafeLogEntry("lead_created", {
    requestId: "req_123456789012",
    leadId: 42,
    language: "es",
    serviceCategory: "theatre",
    nextAction: "capture_lead",
    outcome: "ok",
    httpStatus: 201,
    latencyMs: 245,
    turnCount: 5,
    availabilityKnown: true,
    rentalReady: false
  }, {
    now: new Date("2026-09-01T23:30:00.000Z")
  });

  assert.deepEqual(entry, {
    version: "assistant-safe-logging-v1",
    event: "lead_created",
    timestamp: "2026-09-01T23:30:00.000Z",
    requestId: "req_123456789012",
    leadId: 42,
    language: "es",
    serviceCategory: "theatre",
    nextAction: "capture_lead",
    outcome: "ok",
    httpStatus: 201,
    latencyMs: 245,
    turnCount: 5,
    availabilityKnown: true,
    rentalReady: false
  });
});

test("raw PII, messages, tokens, prompts and provider bodies are dropped", () => {
  const entry = buildAssistantSafeLogEntry("model_failed", {
    requestId: "req_abcdefghijkl",
    errorCode: "provider_unavailable",
    message: "My email is client@example.com",
    name: "Private Client",
    email: "client@example.com",
    phone: "+57 300 000 0000",
    whatsapp: "+57 300 000 0000",
    turnstileToken: "secret-turnstile-token",
    sessionId: "asst_very_private_session_identifier",
    prompt: "system secret prompt",
    modelOutput: { reply: "private reply" },
    providerResponseBody: { error: "raw provider payload" },
    stack: "sensitive stack",
    contact: { email: "nested@example.com" }
  }, {
    now: new Date("2026-09-01T23:30:00.000Z")
  });

  const serialized = JSON.stringify(entry);
  for (const forbidden of [
    "client@example.com",
    "Private Client",
    "+57 300 000 0000",
    "secret-turnstile-token",
    "very_private_session_identifier",
    "system secret prompt",
    "private reply",
    "raw provider payload",
    "sensitive stack",
    "nested@example.com"
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(entry.redacted, true);
  assert.equal(entry.droppedFieldCount, 11);
});

test("raw Error messages are never used as error codes", () => {
  const code = assistantSafeErrorCode({
    code: "LEAD_STORAGE_INCOMPATIBLE",
    message: "client@example.com caused a failure"
  });
  assert.equal(code, "lead_storage_incompatible");

  const fallback = assistantSafeErrorCode({
    message: "client@example.com caused a failure"
  }, "provider_failed");
  assert.equal(fallback, "provider_failed");
});

test("unsafe error-code text is discarded instead of logging free-form content", () => {
  const entry = buildAssistantSafeLogEntry("model_failed", {
    errorCode: "Failure for client@example.com"
  });
  assert.equal(Object.hasOwn(entry, "errorCode"), false);
  assert.equal(JSON.stringify(entry).includes("client@example.com"), false);
});

test("invalid operational values are omitted rather than coerced into logs", () => {
  const entry = buildAssistantSafeLogEntry("request_rejected", {
    requestId: "not-valid",
    leadId: 0,
    language: "fr",
    serviceCategory: "marketing",
    nextAction: "write_finance",
    outcome: "maybe",
    httpStatus: 999,
    latencyMs: -1,
    turnCount: 99
  });

  for (const key of [
    "requestId",
    "leadId",
    "language",
    "serviceCategory",
    "nextAction",
    "outcome",
    "httpStatus",
    "latencyMs",
    "turnCount"
  ]) {
    assert.equal(Object.hasOwn(entry, key), false, key);
  }
});

test("unknown log events fail closed", () => {
  assert.throws(
    () => buildAssistantSafeLogEntry("dump_request_body", {}),
    /event is not allowed/
  );
});

test("logger receives only the sanitized serialized entry", () => {
  const calls = [];
  const logger = {
    info(...args) {
      calls.push(args);
    }
  };

  const entry = logAssistantSafeEvent(logger, "response_sent", {
    requestId: "req_123456789012",
    outcome: "ok",
    message: "do not log this"
  }, {
    now: new Date("2026-09-01T23:30:00.000Z")
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "[SD.Live Assistant]");
  assert.equal(calls[0][1], JSON.stringify(entry));
  assert.equal(calls[0][1].includes("do not log this"), false);
});
