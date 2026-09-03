import test from "node:test";
import assert from "node:assert/strict";

import { runAssistantTurn } from "../assistant-orchestrator.js";
import { resolveAssistantRentalQuery } from "../assistant-rental-query.js";

function modelOutput(nextAction, extra = {}) {
  return {
    language: "en",
    reply: `reply:${nextAction}`,
    serviceCategory: "rental",
    nextAction,
    slotPatch: null,
    rentalQuery: null,
    leadDraft: null,
    ...extra
  };
}

test("valid Rental selection fails safe if the model repeats check_rental", async () => {
  const query = {
    items: [{ name: "Behringer WING", quantity: 1 }],
    services: []
  };
  const queue = [
    modelOutput("check_rental", {
      rentalQuery: query,
      slotPatch: { equipment: ["Behringer WING"] }
    }),
    modelOutput("check_rental", { rentalQuery: query })
  ];
  const calls = { model: 0, rental: 0, applyTurn: 0 };

  const result = await runAssistantTurn({
    requestId: "req_valid_rental_loop",
    message: "Do you rent a Behringer WING? What would it cost for one day, and is it available on October 17, 2026?",
    session: { sessionId: "asst_valid_rental_loop", turns: 0 }
  }, {
    buildModelContext: async (session, extra) => ({ session, extra }),
    callModel: async () => {
      calls.model += 1;
      return queue.shift();
    },
    validateModelOutput: async (raw) => ({ ok: true, output: raw }),
    isConsentFresh: async () => false,
    resolveRentalQuery: async (value) => {
      calls.rental += 1;
      return resolveAssistantRentalQuery(value);
    },
    applyTurn: async (session, slotPatch) => {
      calls.applyTurn += 1;
      return {
        ...session,
        turns: session.turns + 1,
        slots: slotPatch
      };
    }
  });

  assert.equal(result.kind, "reply");
  assert.equal(result.serviceCategory, "rental");
  assert.equal(calls.model, 2);
  assert.equal(calls.rental, 1);
  assert.equal(calls.applyTurn, 1);
  assert.equal(result.toolResults.length, 1);
  assert.equal(result.toolResults[0].type, "rental");
  assert.equal(result.toolResults[0].value.readyForBackendEvaluation, true);
  assert.match(result.reply, /Behringer WING is listed in the current Rental catalog/i);
  assert.match(result.reply, /can't quote pricing/i);
  assert.match(result.reply, /can't.*confirm inventory availability/i);
  assert.equal(result.reply.includes("COP"), false);
  assert.equal(result.reply.includes("$"), false);
});
