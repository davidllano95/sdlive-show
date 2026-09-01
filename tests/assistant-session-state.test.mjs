import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_SESSION_STORAGE_POLICY,
  applyAssistantConsentState,
  applyAssistantTurnSlots,
  assistantSessionLeadDraft,
  assistantSessionModelContext,
  createAssistantSessionState
} from "../assistant-session-state.js";

test("session contract explicitly stores no transcript or raw messages", () => {
  assert.deepEqual(ASSISTANT_SESSION_STORAGE_POLICY, {
    persistence: "none",
    retentionDecision: "not_configured",
    transcriptStored: false,
    rawUserMessagesStored: false,
    rawAssistantMessagesStored: false
  });

  const state = createAssistantSessionState({
    sessionId: "session-qa",
    language: "es",
    now: new Date("2026-09-01T23:00:00.000Z")
  });

  const serialized = JSON.stringify(state).toLowerCase();
  assert.equal(serialized.includes('"messages"'), false);
  assert.equal(serialized.includes('"transcript"'), false);
  assert.equal(serialized.includes('"lastusermessage"'), false);
  assert.equal(serialized.includes('"lastassistantmessage"'), false);
  assert.equal(state.turnCount, 0);
  assert.equal(state.slots.language, "es");
});

test("turn updates keep only approved structured slots", () => {
  const initial = createAssistantSessionState({ sessionId: "session-qa" });
  const next = applyAssistantTurnSlots(initial, {
    serviceCategory: "theatre",
    name: "Cliente QA",
    contact: { whatsapp: "+57 300 000 0000", preferredChannel: "whatsapp" },
    project: { city: "Bogotá", venue: "Teatro QA" },
    equipment: ["Console", "RF"],
    schedule: "Soundcheck 17:00",
    summary: "Musical"
  }, {
    now: new Date("2026-09-01T23:01:00.000Z")
  });

  assert.equal(next.turnCount, 1);
  assert.equal(next.slots.serviceCategory, "theatre");
  assert.equal(next.slots.contact.whatsapp, "+57 300 000 0000");
  assert.equal(next.slots.project.city, "Bogotá");
  assert.deepEqual(next.slots.equipment, ["Console", "RF"]);
  assert.equal(initial.turnCount, 0);
  assert.equal(initial.slots.name, null);
});

test("model-like slot patch cannot write consent, transcript or messages", () => {
  const state = createAssistantSessionState({ sessionId: "session-qa" });
  for (const patch of [
    { consent: { granted: true } },
    { transcript: "raw conversation" },
    { messages: [{ role: "user", content: "hello" }] },
    { lastUserMessage: "hello" }
  ]) {
    assert.throws(
      () => applyAssistantTurnSlots(state, patch),
      /field is not allowed/
    );
  }
});

test("consent can only be applied through the separate server-side function", () => {
  const state = createAssistantSessionState({ sessionId: "session-qa" });
  const granted = applyAssistantConsentState(state, {
    granted: true,
    policyVersion: "2026-08-19",
    grantedAt: new Date("2026-09-01T23:02:00.000Z")
  }, {
    now: new Date("2026-09-01T23:02:00.000Z")
  });

  assert.deepEqual(granted.consent, {
    granted: true,
    policyVersion: "2026-08-19",
    grantedAt: "2026-09-01T23:02:00.000Z"
  });
  assert.equal(state.consent.granted, false);

  const revoked = applyAssistantConsentState(granted, {
    granted: false
  }, {
    now: new Date("2026-09-01T23:03:00.000Z")
  });
  assert.deepEqual(revoked.consent, {
    granted: false,
    policyVersion: null,
    grantedAt: null
  });
});

test("granted consent requires an explicit policy version", () => {
  const state = createAssistantSessionState({ sessionId: "session-qa" });
  assert.throws(
    () => applyAssistantConsentState(state, { granted: true }),
    /policy version is required/i
  );
});

test("model context omits session id, timestamps, policy version and storage metadata", () => {
  let state = createAssistantSessionState({
    sessionId: "sensitive-session-id",
    language: "en",
    now: new Date("2026-09-01T23:00:00.000Z")
  });
  state = applyAssistantTurnSlots(state, {
    serviceCategory: "systems",
    name: "Client",
    summary: "System design"
  });
  state = applyAssistantConsentState(state, {
    granted: true,
    policyVersion: "2026-08-19"
  });

  const context = assistantSessionModelContext(state);
  assert.equal(context.consentGranted, true);
  assert.equal(context.slots.serviceCategory, "systems");
  assert.equal(Object.hasOwn(context, "sessionId"), false);
  assert.equal(Object.hasOwn(context, "createdAt"), false);
  assert.equal(Object.hasOwn(context, "storagePolicy"), false);
  assert.equal(JSON.stringify(context).includes("2026-08-19"), false);
});

test("lead draft is derived from structured slots only", () => {
  let state = createAssistantSessionState({ sessionId: "session-qa", language: "es" });
  state = applyAssistantTurnSlots(state, {
    serviceCategory: "live",
    market: "colombia",
    name: "Cliente QA",
    contact: { email: "client@example.com" },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Venue QA"
    },
    equipment: ["WING"],
    schedule: "20:00",
    summary: "FOH"
  });

  assert.deepEqual(assistantSessionLeadDraft(state), {
    serviceCategory: "live",
    language: "es",
    market: "colombia",
    name: "Cliente QA",
    contact: {
      email: "client@example.com",
      phone: null,
      whatsapp: null,
      other: null,
      preferredChannel: null
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Venue QA"
    },
    summary: "FOH",
    details: {
      equipment: ["WING"],
      schedule: "20:00"
    }
  });
});

test("turn count is bounded", () => {
  let state = createAssistantSessionState({ sessionId: "session-qa" });
  for (let index = 0; index < 60; index += 1) {
    state = applyAssistantTurnSlots(state, {});
  }
  assert.equal(state.turnCount, 60);
  assert.throws(
    () => applyAssistantTurnSlots(state, {}),
    /turn limit reached/
  );
});
