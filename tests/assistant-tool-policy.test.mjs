import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_TOOL_NAMES,
  assistantPolicy,
  assertNoPrivilegedAssistantFields,
  sanitizeAvailabilityForAssistant,
  validateAssistantToolCall
} from "../assistant-tool-policy.js";

test("policy clearly identifies the bot and bans invented commercial claims", () => {
  const policy = assistantPolicy("es");
  assert.equal(policy.identity.name, "SD.Live Assistant");
  assert.equal(policy.identity.isHuman, false);
  assert.equal(policy.language, "es");
  assert.ok(policy.instructions.some((line) => /never claim to be samuel/i.test(line)));
  assert.ok(policy.instructions.some((line) => /never invent, estimate, negotiate/i.test(line)));
  assert.ok(policy.instructions.some((line) => /privacy consent/i.test(line)));
});

test("availability tool accepts no model-controlled arguments", () => {
  const result = validateAssistantToolCall(
    ASSISTANT_TOOL_NAMES.CURRENT_AVAILABILITY,
    { timezone: "Pacific/Auckland", forceMode: "force_on" }
  );
  assert.deepEqual(result, {
    ok: true,
    tool: "current_availability",
    input: {}
  });
});

test("lead capture requires explicit privacy consent", () => {
  const result = validateAssistantToolCall("capture_lead", {
    serviceCategory: "live",
    name: "Test Client",
    summary: "Needs FOH for an event",
    contact: { email: "client@example.com" }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "privacy_consent_required");
});

test("lead capture always starts new and rejects later pipeline statuses", () => {
  const result = validateAssistantToolCall("capture_lead", {
    privacyConsent: true,
    status: "confirmed",
    serviceCategory: "live",
    name: "Test Client",
    summary: "Needs FOH for an event",
    contact: { email: "client@example.com" }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "assistant_lead_must_start_new");
});

test("preferred channel alone is not accepted as contact information", () => {
  const result = validateAssistantToolCall("capture_lead", {
    privacyConsent: true,
    serviceCategory: "systems",
    name: "Test Client",
    summary: "Needs system design",
    contact: { preferredChannel: "whatsapp" }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "contact_required");
});

test("valid lead capture is normalized to Assistant source and new status", () => {
  const result = validateAssistantToolCall("capture_lead", {
    privacyConsent: true,
    serviceCategory: "theatre",
    language: "es",
    market: "colombia",
    name: " Teatro Uno ",
    summary: " Diseño de sonido para musical ",
    contact: {
      whatsapp: "+57 300 000 0000",
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Teatro Uno"
    },
    details: { schedule: "TBD" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.input.source, "assistant");
  assert.equal(result.input.status, "new");
  assert.equal(result.input.serviceCategory, "theatre");
  assert.equal(result.input.name, "Teatro Uno");
  assert.equal(result.input.contact.whatsapp, "+57 300 000 0000");
});

test("degraded availability is never presented to the model as known", () => {
  const result = sanitizeAvailabilityForAssistant({
    availabilityKnown: true,
    degraded: true,
    status: "available",
    humanAvailable: true,
    humanReachable: true,
    contactMode: "whatsapp",
    nextHumanWindow: { startsAt: "2026-09-02T13:00:00.000Z" }
  });

  assert.deepEqual(result, {
    availabilityKnown: false,
    status: "unknown",
    humanAvailable: false,
    humanReachable: false,
    contactMode: null,
    nextHumanWindow: null
  });
});

test("healthy availability exposes only model-safe fields", () => {
  const result = sanitizeAvailabilityForAssistant({
    availabilityKnown: true,
    status: "away",
    humanAvailable: false,
    humanReachable: false,
    contactMode: "leave_message",
    nextHumanWindow: {
      startsAt: "2026-09-02T13:00:00.000Z",
      labelEn: "Wed, 8:00 AM",
      labelEs: "mié, 8:00 a. m.",
      timeZone: "America/Bogota"
    },
    travel: { timezone: "Europe/Madrid" },
    actorEmail: "sam@sdlive.show"
  });

  assert.deepEqual(result, {
    availabilityKnown: true,
    status: "away",
    humanAvailable: false,
    humanReachable: false,
    contactMode: "leave_message",
    nextHumanWindow: {
      startsAt: "2026-09-02T13:00:00.000Z",
      labelEn: "Wed, 8:00 AM",
      labelEs: "mié, 8:00 a. m."
    }
  });
  assert.equal(JSON.stringify(result).includes("Europe/Madrid"), false);
  assert.equal(JSON.stringify(result).includes("sam@sdlive.show"), false);
});

test("privileged field detector catches internal state", () => {
  assert.deepEqual(
    assertNoPrivilegedAssistantFields({ actorEmail: "sam@sdlive.show" }),
    { ok: false, error: "privileged_field_detected", match: "actoremail" }
  );
  assert.deepEqual(assertNoPrivilegedAssistantFields({ status: "away" }), { ok: true });
});

test("unknown tools are rejected", () => {
  const result = validateAssistantToolCall("write_finance", {});
  assert.equal(result.ok, false);
  assert.equal(result.error, "tool_not_allowed");
});
