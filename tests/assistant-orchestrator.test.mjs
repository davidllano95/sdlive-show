import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_ORCHESTRATOR_ACTIONS,
  assistantOrchestratorPolicy,
  runAssistantTurn
} from "../assistant-orchestrator.js";

const baseSession = { sessionId: "asst_test", turns: 0 };

function output(nextAction, extra = {}) {
  return {
    language: "en",
    reply: `reply:${nextAction}`,
    serviceCategory: "live",
    nextAction,
    slotPatch: null,
    rentalQuery: null,
    leadDraft: null,
    ...extra
  };
}

function makeDeps(modelOutputs, options = {}) {
  const queue = [...modelOutputs];
  const calls = {
    model: [],
    availability: 0,
    rental: 0,
    applyTurn: 0,
    capture: 0,
    handoff: 0,
    consentPrompt: 0
  };

  return {
    calls,
    buildModelContext: async (session, extra) => ({ session, extra }),
    callModel: async (input) => {
      calls.model.push(input);
      if (!queue.length) throw new Error("No fake model output queued");
      return queue.shift();
    },
    validateModelOutput: async (raw) => options.invalidValidation
      ? { ok: false, error: "invalid" }
      : { ok: true, output: raw },
    applyTurn: async (session, slotPatch) => {
      calls.applyTurn += 1;
      calls.appliedPatch = slotPatch;
      return {
        ...session,
        turns: (session.turns || 0) + 1,
        appliedPatch: slotPatch
      };
    },
    readAvailability: async () => {
      calls.availability += 1;
      return options.availability || {
        availabilityKnown: true,
        status: "available"
      };
    },
    resolveRentalQuery: async (query) => {
      calls.rental += 1;
      calls.rentalQuery = query;
      return options.rentalResult || {
        readyForBackendEvaluation: true,
        resolvedItems: [{ key: "wing", quantity: 1 }],
        unresolved: [],
        guardrails: {
          mayQuotePrice: false,
          mayClaimInventoryAvailability: false
        }
      };
    },
    getConsentPrompt: async (language) => {
      calls.consentPrompt += 1;
      return { language, action: "authorize" };
    },
    isConsentFresh: async () => options.consentFresh === true,
    captureLead: async (input) => {
      calls.capture += 1;
      calls.captureInput = input;
      return { leadId: options.leadId || 42 };
    },
    handoffLead: async (input) => {
      calls.handoff += 1;
      calls.handoffInput = input;
      if (options.handoffError) {
        const error = new Error("private notification details");
        error.code = options.handoffError;
        throw error;
      }
      return { ok: true };
    }
  };
}

test("orchestrator action list mirrors the approved deterministic boundaries", () => {
  assert.deepEqual(ASSISTANT_ORCHESTRATOR_ACTIONS, [
    "reply",
    "check_availability",
    "check_rental",
    "request_consent",
    "capture_lead",
    "handoff"
  ]);
});

test("orchestrator policy keeps tools, slots, consent and writes server-controlled", () => {
  assert.deepEqual(assistantOrchestratorPolicy(), {
    maxToolHopsPerTurn: 2,
    maxAvailabilityToolCallsPerTurn: 1,
    maxRentalToolCallsPerTurn: 1,
    modelExecutesToolsDirectly: false,
    modelControlsConsent: false,
    incrementalSlotsAppliedOncePerTurn: true,
    captureRequiresFreshServerConsent: true,
    handoffRequiresServerLeadId: true,
    notificationFailureRollsBackLead: false,
    financeWrites: false,
    rentalPricingWrites: false,
    leadSourceOfTruth: "leads"
  });
});

test("reply turn applies one incremental slot patch and has no tool/effect", async () => {
  const deps = makeDeps([
    output("reply", { slotPatch: { name: "Alex", project: { city: "Bogotá" } } })
  ]);
  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "hello",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(result.session.turns, 1);
  assert.deepEqual(deps.calls.appliedPatch, {
    name: "Alex",
    project: { city: "Bogotá" }
  });
  assert.equal(deps.calls.applyTurn, 1);
  assert.equal(deps.calls.availability, 0);
  assert.equal(deps.calls.rental, 0);
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.handoff, 0);
  assert.equal(deps.calls.model.length, 1);
});

test("availability hop preserves slots extracted before and after the tool", async () => {
  const deps = makeDeps([
    output("check_availability", {
      slotPatch: { name: "Alex", project: { city: "Bogotá" } }
    }),
    output("reply", {
      reply: "Availability explained safely",
      slotPatch: { contact: { email: "alex@example.com" }, project: { venue: "Teatro" } }
    })
  ]);

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "Are you free?",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(result.reply, "Availability explained safely");
  assert.equal(deps.calls.availability, 1);
  assert.equal(deps.calls.model.length, 2);
  assert.equal(deps.calls.applyTurn, 1);
  assert.deepEqual(deps.calls.appliedPatch, {
    name: "Alex",
    project: { city: "Bogotá", venue: "Teatro" },
    contact: { email: "alex@example.com" }
  });
  assert.deepEqual(deps.calls.model[1].toolResults, [
    {
      type: "availability",
      value: { availabilityKnown: true, status: "available" }
    }
  ]);
});

test("Rental action resolves only the validated Rental query and returns result to model", async () => {
  const rentalQuery = {
    items: [{ name: "Behringer WING", quantity: 1 }],
    services: []
  };
  const deps = makeDeps([
    output("check_rental", {
      serviceCategory: "rental",
      rentalQuery,
      slotPatch: { equipment: ["Behringer WING"] }
    }),
    output("reply", {
      serviceCategory: "rental",
      reply: "The WING is listed; current availability still needs backend confirmation."
    })
  ]);

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "Do you have a WING?",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(deps.calls.rental, 1);
  assert.deepEqual(deps.calls.rentalQuery, rentalQuery);
  assert.deepEqual(deps.calls.appliedPatch, { equipment: ["Behringer WING"] });
  assert.equal(result.toolResults[0].type, "rental");
  assert.equal(result.toolResults[0].value.guardrails.mayQuotePrice, false);
});

test("unresolved Rental result is passed through instead of silently substituting", async () => {
  const unresolved = {
    readyForBackendEvaluation: false,
    resolvedItems: [],
    unresolved: [{ type: "item", requested: "Mystery Console" }],
    guardrails: { mayQuotePrice: false, mayClaimInventoryAvailability: false }
  };
  const deps = makeDeps([
    output("check_rental", {
      serviceCategory: "rental",
      rentalQuery: { items: [{ name: "Mystery Console", quantity: 1 }], services: [] }
    }),
    output("reply", {
      serviceCategory: "rental",
      reply: "I couldn't match that model."
    })
  ], { rentalResult: unresolved });

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "Need a Mystery Console",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.deepEqual(result.toolResults[0].value, unresolved);
  assert.equal(deps.calls.rental, 1);
});

test("Availability and Rental may each run once in the same turn", async () => {
  const deps = makeDeps([
    output("check_availability"),
    output("check_rental", {
      rentalQuery: { items: [{ name: "WING", quantity: 1 }], services: [] }
    }),
    output("reply", { reply: "Both deterministic checks are complete." })
  ]);

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "Are you free and do you list a WING?",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(deps.calls.availability, 1);
  assert.equal(deps.calls.rental, 1);
  assert.equal(deps.calls.model.length, 3);
  assert.equal(result.toolResults.length, 2);
  assert.deepEqual(result.toolResults.map((item) => item.type), ["availability", "rental"]);
  assert.equal(deps.calls.applyTurn, 1);
});

test("a repeated Availability request in the same turn is blocked", async () => {
  const deps = makeDeps([
    output("check_availability"),
    output("check_availability")
  ]);

  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "check again",
      session: baseSession
    }, deps),
    (error) => error?.code === "TOOL_LOOP_BLOCKED"
  );
  assert.equal(deps.calls.availability, 1);
  assert.equal(deps.calls.applyTurn, 0);
});

test("a repeated Rental request in the same turn is blocked", async () => {
  const query = { items: [{ name: "WING", quantity: 1 }], services: [] };
  const deps = makeDeps([
    output("check_rental", { rentalQuery: query }),
    output("check_rental", { rentalQuery: query })
  ]);

  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "check again",
      session: baseSession
    }, deps),
    (error) => error?.code === "TOOL_LOOP_BLOCKED"
  );
  assert.equal(deps.calls.rental, 1);
  assert.equal(deps.calls.applyTurn, 0);
});

test("third tool hop is blocked even if it would switch type again", async () => {
  const deps = makeDeps([
    output("check_availability"),
    output("check_rental", {
      rentalQuery: { items: [{ name: "WING", quantity: 1 }], services: [] }
    }),
    output("check_availability")
  ]);

  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "loop",
      session: baseSession
    }, deps),
    (error) => error?.code === "TOOL_LOOP_BLOCKED"
  );
  assert.equal(deps.calls.availability, 1);
  assert.equal(deps.calls.rental, 1);
});

test("request_consent applies accumulated slots then returns product-owned prompt", async () => {
  const deps = makeDeps([
    output("request_consent", { slotPatch: { summary: "Live event inquiry" } })
  ]);
  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "save it",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "request_consent");
  assert.equal(result.reason, "model_requested_consent");
  assert.deepEqual(result.consentPrompt, { language: "en", action: "authorize" });
  assert.deepEqual(deps.calls.appliedPatch, { summary: "Live event inquiry" });
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.consentPrompt, 1);
});

test("capture_lead is independently blocked without fresh server consent", async () => {
  const draft = {
    name: "Client",
    contact: { email: "client@example.com" },
    summary: "Show"
  };
  const deps = makeDeps([output("capture_lead", { leadDraft: draft })]);

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "submit",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "request_consent");
  assert.equal(result.reason, "fresh_consent_required");
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.handoff, 0);
});

test("fresh consent allows one lead capture and then notification", async () => {
  const draft = {
    name: "Client",
    contact: { email: "client@example.com" },
    summary: "Show"
  };
  const deps = makeDeps(
    [output("capture_lead", { leadDraft: draft, slotPatch: { name: "Client" } })],
    { consentFresh: true, leadId: 77 }
  );

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "submit",
    session: baseSession,
    consentEvidence: { granted: true }
  }, deps);

  assert.equal(result.kind, "lead_captured");
  assert.equal(result.leadId, 77);
  assert.equal(result.notificationSent, true);
  assert.equal(deps.calls.capture, 1);
  assert.equal(deps.calls.handoff, 1);
  assert.equal(deps.calls.captureInput.requestId, "req_test");
  assert.deepEqual(deps.calls.captureInput.leadDraft, draft);
  assert.deepEqual(deps.calls.appliedPatch, { name: "Client" });
});

test("notification failure does not turn a persisted lead into capture failure", async () => {
  const deps = makeDeps(
    [output("capture_lead", {
      leadDraft: { name: "Client", contact: { email: "a@b.co" }, summary: "Show" }
    })],
    { consentFresh: true, leadId: 88, handoffError: "notification_failed" }
  );

  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "submit",
    session: baseSession,
    consentEvidence: { granted: true }
  }, deps);

  assert.equal(result.kind, "lead_captured");
  assert.equal(result.leadId, 88);
  assert.equal(result.notificationSent, false);
  assert.equal(result.notificationErrorCode, "notification_failed");
});

test("handoff action cannot invent or infer a lead id", async () => {
  const deps = makeDeps([output("handoff")]);
  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "handoff",
      session: baseSession
    }, deps),
    (error) => error?.code === "HANDOFF_REQUIRES_SERVER_LEAD_ID"
  );
  assert.equal(deps.calls.handoff, 0);
});

test("handoff uses only an explicitly server-provided existing lead id", async () => {
  const deps = makeDeps([output("handoff")]);
  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "handoff",
    session: baseSession,
    existingLeadId: 99
  }, deps);

  assert.equal(result.kind, "handoff");
  assert.equal(result.leadId, 99);
  assert.equal(deps.calls.handoff, 1);
  assert.equal(deps.calls.handoffInput.leadId, 99);
});

test("invalid model output stops before session mutation or side effects", async () => {
  const deps = makeDeps([output("capture_lead")], { invalidValidation: true });
  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "bad",
      session: baseSession
    }, deps),
    (error) => error?.code === "PROVIDER_INVALID_OUTPUT"
  );
  assert.equal(deps.calls.applyTurn, 0);
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.handoff, 0);
});

test("unknown nextAction fails closed even if an injected validator is buggy", async () => {
  const deps = makeDeps([output("write_finance")]);
  await assert.rejects(
    () => runAssistantTurn({
      requestId: "req_test",
      message: "do it",
      session: baseSession
    }, deps),
    (error) => error?.code === "ACTION_NOT_ALLOWED"
  );
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.rental, 0);
});
