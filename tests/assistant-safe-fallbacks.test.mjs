import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_FALLBACK_CODES,
  assistantFallback,
  assistantFallbackFromError
} from "../assistant-safe-fallbacks.js";

test("fallback catalog covers expected failure and uncertainty states", () => {
  assert.deepEqual(ASSISTANT_FALLBACK_CODES, [
    "request_invalid",
    "turnstile_failed",
    "rate_limited",
    "provider_unavailable",
    "provider_invalid_output",
    "availability_unknown",
    "rental_unresolved",
    "consent_required",
    "consent_expired",
    "lead_storage_incompatible",
    "lead_create_failed",
    "notification_failed",
    "internal_error"
  ]);
});

test("provider outage does not claim any action was submitted", () => {
  const result = assistantFallback("provider_unavailable", "en");
  assert.equal(result.httpStatus, 503);
  assert.equal(result.retryable, true);
  assert.equal(result.actionWasTaken, false);
  assert.equal(result.leadCaptured, false);
  assert.match(result.reply, /haven't submitted or confirmed anything/i);
});

test("invalid provider output fails before tools and says no action was taken", () => {
  const result = assistantFallback("provider_invalid_output", "es");
  assert.equal(result.httpStatus, 503);
  assert.equal(result.actionWasTaken, false);
  assert.match(result.reply, /no he realizado ninguna acción/i);
});

test("unknown Availability never becomes a promise", () => {
  const en = assistantFallback("availability_unknown", "en");
  const es = assistantFallback("availability_unknown", "es");

  assert.equal(en.httpStatus, 200);
  assert.equal(en.mayClaimAvailability, false);
  assert.match(en.reply, /can't confirm current human availability/i);
  assert.match(en.reply, /won't promise availability/i);
  assert.match(es.reply, /no puedo confirmar la disponibilidad/i);
  assert.equal(en.actionWasTaken, false);
});

test("unresolved Rental request requires clarification rather than substitution", () => {
  const result = assistantFallback("rental_unresolved", "en");
  assert.equal(result.mayClaimRentalAvailability, false);
  assert.equal(result.mayQuotePrice, false);
  assert.match(result.reply, /won't substitute another product automatically/i);
});

test("consent required and expired both route to product consent flow", () => {
  const required = assistantFallback("consent_required", "en");
  const expired = assistantFallback("consent_expired", "es");

  assert.equal(required.nextAction, "request_consent");
  assert.equal(required.httpStatus, 200);
  assert.equal(expired.nextAction, "request_consent");
  assert.equal(expired.httpStatus, 409);
  assert.equal(expired.retryable, true);
});

test("storage incompatibility explicitly refuses to claim submission", () => {
  const result = assistantFallback("lead_storage_incompatible", "en");
  assert.equal(result.httpStatus, 503);
  assert.equal(result.leadCaptured, false);
  assert.match(result.reply, /won't tell you it was submitted/i);
});

test("lead create failure does not claim the request was saved", () => {
  const result = assistantFallback("lead_create_failed", "es");
  assert.equal(result.leadCaptured, false);
  assert.equal(result.actionWasTaken, false);
  assert.match(result.reply, /no está confirmada como enviada/i);
});

test("notification failure may acknowledge saved lead only with positive persistence proof", () => {
  const known = assistantFallback("notification_failed", "en", {
    leadPersisted: true
  });
  assert.equal(known.code, "notification_failed");
  assert.equal(known.httpStatus, 202);
  assert.equal(known.leadCaptured, true);
  assert.equal(known.actionWasTaken, true);
  assert.match(known.reply, /saved successfully/i);
  assert.doesNotMatch(known.reply, /notification|email|resend/i);

  const unknown = assistantFallback("notification_failed", "en");
  assert.equal(unknown.code, "internal_error");
  assert.equal(unknown.leadCaptured, false);
  assert.equal(unknown.actionWasTaken, false);
  assert.doesNotMatch(unknown.reply, /saved successfully/i);
  assert.doesNotMatch(unknown.reply, /couldn't save/i);
});

test("every fallback forbids price and dynamic availability authority", () => {
  for (const code of ASSISTANT_FALLBACK_CODES) {
    const context = code === "notification_failed" ? { leadPersisted: true } : {};
    const result = assistantFallback(code, "en", context);
    assert.equal(result.mayClaimAvailability, false, code);
    assert.equal(result.mayClaimRentalAvailability, false, code);
    assert.equal(result.mayQuotePrice, false, code);
  }
});

test("unknown codes become generic internal error rather than echoing attacker text", () => {
  const result = assistantFallback("client@example.com database exploded", "en");
  assert.equal(result.code, "internal_error");
  assert.equal(JSON.stringify(result).includes("client@example.com"), false);
});

test("Error mapping uses codes only and never raw Error messages", () => {
  const result = assistantFallbackFromError({
    code: "LEAD_STORAGE_INCOMPATIBLE",
    message: "client@example.com cannot be inserted"
  }, "es");

  assert.equal(result.code, "lead_storage_incompatible");
  assert.equal(JSON.stringify(result).includes("client@example.com"), false);
});

test("notification error mapping requires lead-persisted context", () => {
  const known = assistantFallbackFromError({
    code: "ASSISTANT_NOTIFICATION_NOT_CONFIGURED"
  }, "en", {
    leadPersisted: true
  });
  assert.equal(known.code, "notification_failed");
  assert.equal(known.leadCaptured, true);

  const unknown = assistantFallbackFromError({
    code: "ASSISTANT_NOTIFICATION_NOT_CONFIGURED"
  }, "en");
  assert.equal(unknown.code, "internal_error");
  assert.equal(unknown.leadCaptured, false);
});
