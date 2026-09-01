import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_NEXT_ACTIONS,
  validateAssistantModelOutput
} from "../assistant-model-output.js";

test("approved next actions are explicit and bounded", () => {
  assert.deepEqual(ASSISTANT_NEXT_ACTIONS, [
    "reply",
    "check_availability",
    "request_consent",
    "capture_lead",
    "handoff"
  ]);
});

test("accepts a normal reply without a tool action", () => {
  const result = validateAssistantModelOutput({
    language: "es",
    reply: "Claro. ¿Para qué fecha es el evento?",
    serviceCategory: "live",
    nextAction: "reply"
  });

  assert.equal(result.ok, true);
  assert.equal(result.output.nextAction, "reply");
  assert.equal(result.output.serviceCategory, "live");
  assert.equal(result.output.leadDraft, null);
});

test("rejects unknown model actions", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "I can do that.",
    nextAction: "write_finance"
  });

  assert.deepEqual(result, { ok: false, error: "next_action_not_allowed" });
});

test("capture lead requires consent from server context, not model output", () => {
  const payload = {
    language: "en",
    reply: "Thanks. I can hand this off now.",
    serviceCategory: "systems",
    nextAction: "capture_lead",
    leadDraft: {
      serviceCategory: "systems",
      name: "Client QA",
      contact: { email: "client@example.com" },
      summary: "Needs system design"
    }
  };

  const blocked = validateAssistantModelOutput(payload, {
    privacyConsentGranted: false
  });
  assert.deepEqual(blocked, {
    ok: false,
    error: "capture_requires_server_consent"
  });

  const allowed = validateAssistantModelOutput(payload, {
    privacyConsentGranted: true
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.output.leadDraft.name, "Client QA");
});

test("model cannot self-assert privacy consent", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "Captured.",
    nextAction: "capture_lead",
    privacyConsent: true,
    leadDraft: {
      serviceCategory: "live",
      name: "Client",
      contact: { email: "client@example.com" },
      summary: "Event"
    }
  }, {
    privacyConsentGranted: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "forbidden_model_field");
  assert.equal(result.path, "root.privacyConsent");
});

test("model cannot set pipeline status or source", () => {
  for (const extra of [
    { status: "confirmed" },
    { source: "contact" }
  ]) {
    const result = validateAssistantModelOutput({
      language: "en",
      reply: "Captured.",
      nextAction: "capture_lead",
      leadDraft: {
        serviceCategory: "theatre",
        name: "Client",
        contact: { whatsapp: "+57 300 000 0000" },
        summary: "Musical",
        ...extra
      }
    }, {
      privacyConsentGranted: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "forbidden_model_field");
  }
});

test("model cannot smuggle pricing or availability authority in structured fields", () => {
  for (const details of [
    { quotedPrice: 1000000 },
    { discountPercent: 10 },
    { availabilityConfirmed: true },
    { timezone: "America/Bogota" }
  ]) {
    const result = validateAssistantModelOutput({
      language: "en",
      reply: "I will hand this off.",
      nextAction: "capture_lead",
      leadDraft: {
        serviceCategory: "rental",
        name: "Client",
        contact: { email: "client@example.com" },
        summary: "Rental inquiry",
        details
      }
    }, {
      privacyConsentGranted: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "forbidden_model_field");
  }
});

test("price words are allowed in conversational reply text when not structured authority", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "I can’t confirm a price here; I can collect the details for a human quote.",
    serviceCategory: "rental",
    nextAction: "reply"
  });

  assert.equal(result.ok, true);
});

test("lead draft requires real contact, name, summary and canonical service", () => {
  const result = validateAssistantModelOutput({
    language: "es",
    reply: "Listo.",
    nextAction: "capture_lead",
    leadDraft: {
      serviceCategory: "marketing",
      name: "Client",
      contact: { preferredChannel: "whatsapp" },
      summary: "Consulta"
    }
  }, {
    privacyConsentGranted: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_lead_draft");
});
