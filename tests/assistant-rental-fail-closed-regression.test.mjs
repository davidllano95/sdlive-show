import test from "node:test";
import assert from "node:assert/strict";

import { runAssistantTurn } from "../assistant-orchestrator.js";

function rentalCheckOutput({ name = "Waves LV1 Classic", quantity = 3 } = {}) {
  return {
    language: "en",
    reply: "Checking the Rental catalog.",
    serviceCategory: "rental",
    nextAction: "check_rental",
    slotPatch: { equipment: [name] },
    rentalQuery: {
      items: [{ name, quantity }],
      services: []
    },
    leadDraft: null
  };
}

function dependencies({ rentalResult }) {
  const calls = { model: 0, rental: 0, applyTurn: 0 };
  return {
    calls,
    buildModelContext: async (session, extra) => ({ session, extra }),
    callModel: async () => {
      calls.model += 1;
      if (calls.model > 1) {
        throw new Error("Fail-closed Rental result must not require a second model turn");
      }
      return rentalCheckOutput();
    },
    validateModelOutput: async (raw) => ({ ok: true, output: raw }),
    resolveRentalQuery: async () => {
      calls.rental += 1;
      return rentalResult;
    },
    applyTurn: async (session, slotPatch) => {
      calls.applyTurn += 1;
      return { ...session, slotPatch };
    }
  };
}

test("out-of-bounds Rental quantity returns a deterministic safe reply without a second model hop", async () => {
  const deps = dependencies({
    rentalResult: {
      readyForBackendEvaluation: false,
      resolvedItems: [],
      resolvedServices: [],
      unresolved: [],
      issues: [{
        type: "quantity_exceeds_current_backend_limit",
        key: "lv1",
        requestedQuantity: 3,
        maxQuantity: 2
      }],
      guardrails: {
        mayQuotePrice: false,
        mayClaimInventoryAvailability: false
      }
    }
  });

  const result = await runAssistantTurn({
    requestId: "req_rental_production_regression",
    message: "Can I rent 3 Waves LV1 Classic consoles? How much and are all three available?",
    session: { sessionId: "asst_rental_regression", turns: 0 }
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(result.language, "en");
  assert.equal(result.serviceCategory, "rental");
  assert.equal(deps.calls.model, 1);
  assert.equal(deps.calls.rental, 1);
  assert.equal(deps.calls.applyTurn, 1);
  assert.match(result.reply, /up to 2 Waves LV1 Classic units/i);
  assert.match(result.reply, /can't confirm a request for 3/i);
  assert.match(result.reply, /can't quote pricing/i);
  assert.match(result.reply, /can't .*confirm inventory availability/i);
  assert.equal(/COP|\$|2,700,000|3,000,000/.test(result.reply), false);
  assert.deepEqual(result.session.slotPatch, { equipment: ["Waves LV1 Classic"] });
});

test("unresolved Rental item fails closed without substitution or another model hop", async () => {
  let modelCalls = 0;
  const deps = {
    buildModelContext: async (session, extra) => ({ session, extra }),
    callModel: async () => {
      modelCalls += 1;
      if (modelCalls > 1) throw new Error("Unexpected second model hop");
      return rentalCheckOutput({ name: "Mystery Console", quantity: 1 });
    },
    validateModelOutput: async (raw) => ({ ok: true, output: raw }),
    resolveRentalQuery: async () => ({
      readyForBackendEvaluation: false,
      resolvedItems: [],
      resolvedServices: [],
      unresolved: [{ type: "item", requested: "Mystery Console", quantity: 1 }],
      issues: [],
      guardrails: {
        mayQuotePrice: false,
        mayClaimInventoryAvailability: false
      }
    }),
    applyTurn: async (session, slotPatch) => ({ ...session, slotPatch })
  };

  const result = await runAssistantTurn({
    requestId: "req_rental_unknown_regression",
    message: "Can I rent a Mystery Console?",
    session: { sessionId: "asst_rental_unknown", turns: 0 }
  }, deps);

  assert.equal(modelCalls, 1);
  assert.match(result.reply, /couldn't match Mystery Console/i);
  assert.match(result.reply, /won't substitute or guess/i);
  assert.match(result.reply, /can't quote pricing/i);
  assert.match(result.reply, /confirm inventory availability/i);
});
