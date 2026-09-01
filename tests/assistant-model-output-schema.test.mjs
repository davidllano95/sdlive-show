import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_NEXT_ACTIONS,
  assistantModelOutputJsonSchema,
  validateAssistantModelOutput
} from "../assistant-model-output.js";

function assertStrictObject(schema, path = "root") {
  if (!schema || typeof schema !== "object") return;

  if (schema.type === "object" || (Array.isArray(schema.type) && schema.type.includes("object"))) {
    assert.equal(schema.additionalProperties, false, `${path} must set additionalProperties=false`);
    assert.ok(Array.isArray(schema.required), `${path} must have required[]`);
    assert.deepEqual(
      [...schema.required].sort(),
      Object.keys(schema.properties || {}).sort(),
      `${path} must require every declared property for strict Structured Outputs`
    );
  }

  for (const [key, child] of Object.entries(schema.properties || {})) {
    assertStrictObject(child, `${path}.${key}`);
  }
  for (const [index, child] of (schema.anyOf || []).entries()) {
    assertStrictObject(child, `${path}.anyOf[${index}]`);
  }
  if (schema.items) assertStrictObject(schema.items, `${path}.items`);
}

test("Structured Outputs schema is strict and mirrors approved actions", () => {
  const schema = assistantModelOutputJsonSchema();
  assertStrictObject(schema);
  assert.deepEqual(schema.properties.nextAction.enum, [...ASSISTANT_NEXT_ACTIONS]);
  assert.deepEqual(schema.required, [
    "language",
    "reply",
    "serviceCategory",
    "nextAction",
    "slotPatch",
    "rentalQuery",
    "leadDraft"
  ]);
});

test("schema has no pricing, Finance, pipeline or internal Availability authority fields", () => {
  const serialized = JSON.stringify(assistantModelOutputJsonSchema()).toLowerCase();
  for (const forbidden of [
    "price",
    "discount",
    "finance",
    "forcemode",
    "availabilityconfirmed",
    "pipeline",
    "privacyconsent"
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("strict lead details expose only equipment and schedule", () => {
  const schema = assistantModelOutputJsonSchema();
  const details = schema.properties.leadDraft.properties.details;
  assert.deepEqual(Object.keys(details.properties).sort(), ["equipment", "schedule"]);
  assert.equal(details.additionalProperties, false);
});

test("null-filled Structured Output slot patch means no update, not slot deletion", () => {
  const result = validateAssistantModelOutput({
    language: "es",
    reply: "¿En qué ciudad será?",
    serviceCategory: "theatre",
    nextAction: "reply",
    slotPatch: {
      serviceCategory: null,
      language: null,
      market: null,
      name: null,
      contact: {
        email: null,
        phone: null,
        whatsapp: null,
        other: null,
        preferredChannel: null
      },
      project: {
        date: null,
        city: "Bogotá",
        venue: null
      },
      equipment: null,
      schedule: null,
      summary: null
    },
    rentalQuery: null,
    leadDraft: null
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.output.slotPatch, {
    contact: {},
    project: { city: "Bogotá" }
  });
  assert.equal(result.output.language, "es");
});

test("lead details cannot contain arbitrary model-generated metadata", () => {
  const result = validateAssistantModelOutput({
    language: "en",
    reply: "Ready.",
    serviceCategory: "live",
    nextAction: "capture_lead",
    slotPatch: null,
    rentalQuery: null,
    leadDraft: {
      serviceCategory: "live",
      language: "en",
      market: null,
      name: "Client",
      contact: {
        email: "client@example.com",
        phone: null,
        whatsapp: null,
        other: null,
        preferredChannel: "email"
      },
      project: {
        date: null,
        city: "Bogotá",
        venue: null
      },
      summary: "Live event",
      details: {
        equipment: [],
        schedule: null,
        internalNotes: "model invented this"
      }
    }
  }, {
    privacyConsentGranted: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_lead_draft");
});

test("schema can be passed directly to the prepared OpenAI provider without mutation", () => {
  const schema = assistantModelOutputJsonSchema();
  const clone = JSON.parse(JSON.stringify(schema));
  assert.deepEqual(schema, clone);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.rentalQuery.additionalProperties, false);
});
