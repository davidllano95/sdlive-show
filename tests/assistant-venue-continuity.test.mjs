import test from "node:test";
import assert from "node:assert/strict";

import {
  inferAssistantDeterministicSlotPatch,
  runAssistantTurn
} from "../assistant-orchestrator.js";
import { assistantSystemInstructions } from "../assistant-system-policy.js";

function replyOutput(slotPatch = null) {
  return {
    language: "en",
    reply: "Thanks — venue TBD is noted.",
    serviceCategory: "theatre",
    nextAction: "reply",
    slotPatch,
    rentalQuery: null,
    leadDraft: null
  };
}

function depsFor(output) {
  const calls = {};
  return {
    calls,
    buildModelContext: async (session) => ({ session }),
    callModel: async () => output,
    validateModelOutput: async (raw) => ({ ok: true, output: raw }),
    applyTurn: async (session, patch) => {
      calls.patch = patch;
      return { ...session, patch };
    },
    isConsentFresh: async () => false
  };
}

test("explicit English TBD venue status is normalized into structured session memory", () => {
  for (const message of [
    "The venue is still TBD.",
    "Venue TBD for now.",
    "The venue is to be confirmed.",
    "Venue not yet confirmed."
  ]) {
    assert.deepEqual(inferAssistantDeterministicSlotPatch(message), {
      project: { venue: "TBD" }
    });
  }
});

test("explicit Spanish unconfirmed venue status is normalized into structured session memory", () => {
  for (const message of [
    "El venue sigue por confirmar.",
    "Lugar todavía por confirmar.",
    "Sede sin confirmar."
  ]) {
    assert.deepEqual(inferAssistantDeterministicSlotPatch(message), {
      project: { venue: "TBD" }
    });
  }
});

test("deterministic venue normalization does not try to parse ordinary venue names", () => {
  assert.deepEqual(inferAssistantDeterministicSlotPatch("The venue is Teatro Colón."), {});
  assert.deepEqual(inferAssistantDeterministicSlotPatch("We can discuss venue details later."), {});
});

test("orchestrator persists explicit TBD even when the model omits venue from slotPatch", async () => {
  const deps = depsFor(replyOutput({ project: { city: "Bogotá" } }));

  await runAssistantTurn({
    requestId: "req_venue_tbd",
    message: "I'm planning a theatre show in Bogotá. The venue is still TBD.",
    session: { sessionId: "asst_venue_tbd" }
  }, deps);

  assert.deepEqual(deps.calls.patch, {
    project: {
      venue: "TBD",
      city: "Bogotá"
    }
  });
});

test("validated model venue can supersede the narrow deterministic TBD marker in the same turn", async () => {
  const deps = depsFor(replyOutput({ project: { venue: "Teatro Colón" } }));

  await runAssistantTurn({
    requestId: "req_venue_changed",
    message: "Venue is TBD in the old brief, but it is now Teatro Colón.",
    session: { sessionId: "asst_venue_changed" }
  }, deps);

  assert.deepEqual(deps.calls.patch, {
    project: { venue: "Teatro Colón" }
  });
});

test("system policy treats structured slots and explicit TBD statuses as conversation memory", () => {
  const instructions = assistantSystemInstructions("en");
  assert.match(instructions, /context\.session\.slots as the authoritative structured memory/i);
  assert.match(instructions, /Do not ask again for a field that already has a meaningful non-null value/i);
  assert.match(instructions, /TBD, to be confirmed, not confirmed, por confirmar or sin confirmar is meaningful known information/i);
  assert.match(instructions, /do not re-ask for the concrete value/i);
});
