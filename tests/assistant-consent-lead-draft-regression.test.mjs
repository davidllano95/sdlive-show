import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLeadCoreInput } from "../lead-core.js";
import {
  applyAssistantTurnSlots,
  assistantSessionLeadDraft,
  createAssistantSessionState
} from "../assistant-session-state.js";

function productionShapedSession() {
  let state = createAssistantSessionState({
    sessionId: "asst_consent_regression",
    language: "en",
    now: new Date("2026-09-03T20:00:00.000Z")
  });

  state = applyAssistantTurnSlots(state, {
    serviceCategory: "theatre",
    project: {
      date: "October 17, 2026",
      city: "Bogotá",
      venue: "TBD"
    }
  });

  state = applyAssistantTurnSlots(state, {
    equipment: ["8 wireless mics", "QLab playback"],
    schedule: "Rehearsal October 16 from 2–8 PM; October 17 call 4 PM; performance 8 PM"
  });

  state = applyAssistantTurnSlots(state, {
    name: "Samuel",
    contact: {
      email: "samuel.qa@example.com",
      preferredChannel: "email"
    }
  });

  return state;
}

test("consent Lead draft does not depend on a model-authored summary", () => {
  const draft = assistantSessionLeadDraft(productionShapedSession());

  assert.equal(draft.summary?.length > 0, true);
  assert.match(draft.summary, /Service: theatre/);
  assert.match(draft.summary, /Project date: October 17, 2026/);
  assert.match(draft.summary, /City: Bogotá/);
  assert.match(draft.summary, /Venue: TBD/);
  assert.match(draft.summary, /8 wireless mics/);
  assert.match(draft.summary, /QLab playback/);
  assert.match(draft.summary, /Rehearsal October 16/);
  assert.doesNotMatch(draft.summary, /samuel\.qa@example\.com/i);
});

test("consent Lead draft normalizes an explicit human date for Lead Core", () => {
  const draft = assistantSessionLeadDraft(productionShapedSession());
  assert.equal(draft.project.date, "2026-10-17");

  assert.doesNotThrow(() => normalizeLeadCoreInput({
    ...draft,
    source: "assistant",
    status: "new"
  }));
});

test("Spanish explicit dates normalize without transcript persistence", () => {
  let state = createAssistantSessionState({ sessionId: "asst_fecha", language: "es" });
  state = applyAssistantTurnSlots(state, {
    serviceCategory: "theatre",
    name: "Cliente",
    contact: { email: "cliente@example.com" },
    project: { date: "17 de octubre de 2026", city: "Bogotá", venue: "Por confirmar" },
    schedule: "Ensayo 16 de octubre"
  });

  const draft = assistantSessionLeadDraft(state);
  assert.equal(draft.project.date, "2026-10-17");
  assert.equal(draft.summary?.length > 0, true);
  assert.equal(JSON.stringify(state).includes("messages"), false);
  assert.equal(JSON.stringify(state).includes("transcript"), false);
});

test("unsupported market/channel strings fail closed into Lead Core defaults instead of throwing", () => {
  let state = productionShapedSession();
  state = applyAssistantTurnSlots(state, {
    market: "Bogotá",
    contact: { preferredChannel: "please email me" }
  });

  const draft = assistantSessionLeadDraft(state);
  assert.equal(draft.market, null);
  assert.equal(draft.contact.preferredChannel, null);
  assert.doesNotThrow(() => normalizeLeadCoreInput({
    ...draft,
    source: "assistant",
    status: "new"
  }));
});
