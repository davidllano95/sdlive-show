import test from "node:test";
import assert from "node:assert/strict";

import { buildAssistantHandoff } from "../assistant-handoff.js";

function assistantLead(overrides = {}) {
  return {
    source: "assistant",
    status: "new",
    serviceCategory: "live",
    language: "es",
    market: "colombia",
    name: "Cliente QA",
    contact: {
      email: "client@example.com",
      whatsapp: "+57 300 000 0000",
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Venue QA"
    },
    summary: "Necesita FOH para un evento.",
    details: {
      equipment: ["Console", "Stage rack"],
      schedule: "Load-in 14:00 / Show 20:00"
    },
    ...overrides
  };
}

test("builds deterministic bilingual handoff from canonical lead", () => {
  const result = buildAssistantHandoff(assistantLead());

  assert.equal(result.version, "assistant-handoff-v1");
  assert.equal(result.source, "assistant");
  assert.equal(result.status, "new");
  assert.equal(result.subject, "[SD.Live Lead] Live — Cliente QA");
  assert.deepEqual(result.equipment, ["Console", "Stage rack"]);
  assert.equal(result.schedule, "Load-in 14:00 / Show 20:00");
  assert.deepEqual(result.missing, []);
  assert.match(result.textEn, /New SD\.Live Assistant lead/);
  assert.match(result.textEs, /Nuevo lead de SD\.Live Assistant/);
  assert.match(result.textEn, /client@example\.com/);
  assert.match(result.textEs, /Necesita FOH para un evento\./);
});

test("reports missing operational fields instead of inventing them", () => {
  const result = buildAssistantHandoff(assistantLead({
    project: {},
    details: {},
    summary: "Consulta general"
  }));

  assert.deepEqual(result.missing, [
    "date",
    "city",
    "venue",
    "equipment",
    "schedule"
  ]);
  assert.match(result.textEn, /Date: Not provided/);
  assert.match(result.textEn, /Equipment: Not provided/);
  assert.doesNotMatch(result.textEn, /TBD/i);
});

test("uses alternate structured detail keys without model prose", () => {
  const result = buildAssistantHandoff(assistantLead({
    details: {
      requestedEquipment: "WING + DL32",
      eventSchedule: "17:00 soundcheck"
    }
  }));

  assert.equal(result.equipment, "WING + DL32");
  assert.equal(result.schedule, "17:00 soundcheck");
});

test("rejects non-Assistant leads", () => {
  assert.throws(
    () => buildAssistantHandoff(assistantLead({ source: "contact" })),
    /source=assistant/
  );
});

test("rejects Assistant handoff for non-new pipeline status", () => {
  assert.throws(
    () => buildAssistantHandoff(assistantLead({ status: "contacted" })),
    /requires a new lead/
  );
});

test("handoff contains no pricing or availability fields", () => {
  const serialized = JSON.stringify(buildAssistantHandoff(assistantLead({
    details: {
      equipment: ["Console"],
      schedule: "20:00",
      quotedPrice: "COP 1,000,000",
      availability: "confirmed"
    }
  })));

  assert.equal(serialized.includes("quotedPrice"), false);
  assert.equal(serialized.includes("1,000,000"), false);
  assert.equal(serialized.includes('"availability"'), false);
  assert.equal(serialized.includes("confirmed"), false);
});
