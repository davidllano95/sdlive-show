import test from "node:test";
import assert from "node:assert/strict";

import {
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
    leadDraft: null,
    ...extra
  };
}

function makeDeps(modelOutputs, options = {}) {
  const queue = [...modelOutputs];
  const calls = {
    model: [],
    availability: 0,
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
    applyTurn: async (session, modelOutput) => {
      calls.applyTurn += 1;
      return {
        ...session,
        turns: (session.turns || 0) + 1,
        lastAction: modelOutput.nextAction
      };
    },
    readAvailability: async () => {
      calls.availability += 1;
      return options.availability || {
        availabilityKnown: true,
        status: "available"
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

test("orchestrator policy keeps tools, consent and writes server-controlled", () => {
  assert.deepEqual(assistantOrchestratorPolicy(), {
    maxAvailabilityToolCallsPerTurn: 1,
    modelExecutesToolsDirectly: false,
    modelControlsConsent: false,
    captureRequiresFreshServerConsent: true,
    handoffRequiresServerLeadId: true,
    notificationFailureRollsBackLead: false,
    financeWrites: false,
    rentalPricingWrites: false,
    leadSourceOfTruth: "leads"
  });
});

test("reply turn has no tool or irreversible effects", async () => {
  const deps = makeDeps([output("reply")]);
  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "hello",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "reply");
  assert.equal(result.session.turns, 1);
  assert.equal(deps.calls.availability, 0);
  assert.equal(deps.calls.capture, 0);
  assert.equal(deps.calls.handoff, 0);
  assert.equal(deps.calls.model.length, 1);
});

test("availability action performs one deterministic tool hop then revalidates model", async () => {
  const deps = makeDeps([
    output("check_availability"),
    output("reply", { reply: "Availability explained safely" })
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
  assert.deepEqual(deps.calls.model[1].toolResult, {
    type: "availability",
    value: { availabilityKnown: true, status: "available" }
  });
});

test("a repeated availability request in the same turn is blocked", async () => {
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
  assert.equal(deps.calls.capture, 0);
});

test("request_consent returns product-owned prompt without creating a lead", async () => {
  const deps = makeDeps([output("request_consent")]);
  const result = await runAssistantTurn({
    requestId: "req_test",
    message: "save it",
    session: baseSession
  }, deps);

  assert.equal(result.kind, "request_consent");
  assert.equal(result.reason, "model_requested_consent");
  assert.deepEqual(result.consentPrompt, { language: "en", action: "authorize" });
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
    [output("capture_lead", { leadDraft: draft })],
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
});
