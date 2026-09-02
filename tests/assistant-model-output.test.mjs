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
    "check_rental",
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
  assert.equal(result.output.version, "assistant-model-output-v2");
  assert.equal(result.output.nextAction, "reply");
  assert.equal(result.output.serviceCategory, "live");
  assert.equal(result.output.slotPatch, null);
  assert.equal(result.output.rentalQuery, null);
  assert.equal(result.output.leadDraft, null);
});

test("supports incremental structured slot patches without requiring a complete lead", () => {
  const result = validateAssistantModelOutput({
    language: "es",
    reply: "Perfecto. ¿En qué venue será?",
    serviceCategory: "theatre",
    nextAction: "reply",
    slotPatch: {
      serviceCategory: "theatre",
      name: "Ana",
      contact: { whatsapp: "+57 300 000 0000", preferredChannel: "whatsapp" },
      project: { date: "2026-10-15", city: "Bogotá" },
      equipment: ["QLab playback"],
      schedule: "Ensayo 14 de octubre"
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output.slotPatch, {
    serviceCategory: "theatre",
    name: "Ana",
    contact: {
      whatsapp: "+57 300 000 0000",
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-15",
      city: "Bogotá"
    },
    equipment: ["QLab playback"],
    schedule: "Ensayo 14 de octubre"
  });
  assert.equal(result.output.leadDraft, null);
});

test("partial slot patches may contain only one newly learned field", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "Thanks. What city is the event in?",
    nextAction: "reply",
    slotPatch: { name: "Alex" }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output.slotPatch, { name: "Alex" });
});

test("slot patches reject unknown structured keys and authority smuggling", () => {
  const unknown = validateAssistantModelOutput({
    language: "en",
    reply: "Thanks.",
    nextAction: "reply",
    slotPatch: { companySecret: "x" }
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error, "invalid_slot_patch");

  const pricing = validateAssistantModelOutput({
    language: "en",
    reply: "Thanks.",
    nextAction: "reply",
    slotPatch: { quotedPrice: 1000000 }
  });
  assert.equal(pricing.ok, false);
  assert.equal(pricing.error, "forbidden_model_field");
});

test("rejects unknown model actions", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "I can do that.",
    nextAction: "write_finance"
  });

  assert.deepEqual(result, { ok: false, error: "next_action_not_allowed" });
});

test("root output is allowlisted instead of accepting arbitrary model metadata", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "Hello.",
    nextAction: "reply",
    providerThoughts: "private chain"
  });
  assert.deepEqual(result, {
    ok: false,
    error: "model_output_field_not_allowed",
    path: "root.providerThoughts"
  });
});

test("check_rental accepts only a bounded alias-level query for deterministic resolution", () => {
  const result = validateAssistantModelOutput({
    language: "es",
    reply: "Voy a revisar esos equipos.",
    serviceCategory: "rental",
    nextAction: "check_rental",
    slotPatch: {
      serviceCategory: "rental",
      equipment: ["2 Midas DL32", "WING"]
    },
    rentalQuery: {
      items: [
        { name: "Midas DL32", quantity: 2 },
        "Behringer WING"
      ],
      services: ["ingeniería de sonido"]
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output.rentalQuery, {
    items: [
      { name: "Midas DL32", quantity: 2 },
      { name: "Behringer WING", quantity: 1 }
    ],
    services: [{ name: "ingeniería de sonido" }]
  });
});

test("Rental query cannot provide canonical backend keys, prices or arbitrary fields", () => {
  const canonicalKey = validateAssistantModelOutput({
    language: "en",
    reply: "Checking.",
    nextAction: "check_rental",
    rentalQuery: {
      items: [{ name: "WING", key: "wing" }]
    }
  });
  assert.equal(canonicalKey.ok, false);
  assert.equal(canonicalKey.error, "invalid_rental_query");

  const price = validateAssistantModelOutput({
    language: "en",
    reply: "Checking.",
    nextAction: "check_rental",
    rentalQuery: {
      items: [{ name: "WING", quantity: 1, price: 300000 }]
    }
  });
  assert.equal(price.ok, false);
  assert.equal(price.error, "forbidden_model_field");
});

test("check_rental requires a query and Rental queries are not accepted on other actions", () => {
  const missing = validateAssistantModelOutput({
    language: "en",
    reply: "Checking.",
    nextAction: "check_rental"
  });
  assert.deepEqual(missing, { ok: false, error: "rental_check_requires_query" });

  const wrongAction = validateAssistantModelOutput({
    language: "en",
    reply: "Okay.",
    nextAction: "reply",
    rentalQuery: { items: ["WING"] }
  });
  assert.deepEqual(wrongAction, { ok: false, error: "rental_query_not_allowed_for_action" });
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
  assert.equal(result.error, "model_output_field_not_allowed");
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

test("lead draft rejects unknown nested contact/project fields", () => {
  const contact = validateAssistantModelOutput({
    language: "en",
    reply: "Ready.",
    nextAction: "capture_lead",
    leadDraft: {
      serviceCategory: "live",
      name: "Client",
      contact: { email: "client@example.com", accountId: "123" },
      summary: "Event"
    }
  }, { privacyConsentGranted: true });
  assert.equal(contact.ok, false);
  assert.equal(contact.error, "invalid_lead_draft");

  const project = validateAssistantModelOutput({
    language: "en",
    reply: "Ready.",
    nextAction: "capture_lead",
    leadDraft: {
      serviceCategory: "live",
      name: "Client",
      contact: { email: "client@example.com" },
      project: { city: "Bogotá", budget: "1000" },
      summary: "Event"
    }
  }, { privacyConsentGranted: true });
  assert.equal(project.ok, false);
  assert.equal(project.error, "invalid_lead_draft");
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

test("full lead drafts cannot ride along with a normal reply", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "One more question.",
    nextAction: "reply",
    leadDraft: {
      serviceCategory: "live",
      name: "Client",
      contact: { email: "client@example.com" },
      summary: "Event"
    }
  });
  assert.deepEqual(result, { ok: false, error: "lead_draft_not_allowed_for_action" });
});
