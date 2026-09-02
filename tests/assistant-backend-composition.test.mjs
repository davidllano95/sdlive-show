import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantBackendCompositionPolicy,
  createAssistantBackendDependencies,
  runComposedAssistantTurn
} from "../assistant-backend-composition.js";
import {
  ASSISTANT_PRIVACY_POLICY_VERSION,
  ASSISTANT_CONSENT_METHOD
} from "../assistant-consent-contract.js";
import { createAssistantSessionState } from "../assistant-session-state.js";

const NOW = new Date("2026-09-02T00:30:00.000Z");
const SESSION_ID = `asst_${"a".repeat(32)}`;
const REQUEST_ID = `req_${"b".repeat(32)}`;

function session(language = "en") {
  return createAssistantSessionState({ sessionId: SESSION_ID, language, now: NOW });
}

function output(nextAction, overrides = {}) {
  return {
    language: "en",
    reply: "Safe reply",
    serviceCategory: "live",
    nextAction,
    slotPatch: null,
    rentalQuery: null,
    leadDraft: null,
    ...overrides
  };
}

function queueProvider(outputs, calls = []) {
  const queue = [...outputs];
  return async (_env, input) => {
    calls.push(input);
    if (!queue.length) throw new Error("No provider output queued");
    return queue.shift();
  };
}

function consentEvidence() {
  return {
    source: "assistant",
    granted: true,
    language: "en",
    privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    authorizationMethod: ASSISTANT_CONSENT_METHOD,
    grantedAt: "2026-09-02T00:25:00.000Z"
  };
}

test("composition policy keeps model, tools, consent and persistence boundaries explicit", () => {
  assert.deepEqual(assistantBackendCompositionPolicy(), {
    version: "assistant-backend-composition-v1",
    provider: "openai_responses_structured_output",
    providerExecutesTools: false,
    transcriptPersistence: false,
    modelReceivesStructuredSessionOnly: true,
    availabilityAuthority: "availability_core",
    rentalAuthority: "deterministic_rental_boundary",
    consentAuthority: "product_server",
    leadSourceOfTruth: "leads",
    leadCapturePersistence: "atomic_d1_lead_consent_idempotency",
    notificationTransport: "resend",
    financeWrites: false
  });
});

test("normal reply accumulates only validated structured slots and provider never receives sessionId", async () => {
  const calls = [];
  const result = await runComposedAssistantTurn({}, {
    requestId: REQUEST_ID,
    message: "My name is Ana and the event is in Bogotá",
    session: session("en")
  }, {
    providerCall: queueProvider([
      output("reply", {
        slotPatch: {
          serviceCategory: "live",
          name: "Ana",
          project: { city: "Bogotá" }
        }
      })
    ], calls),
    now: () => NOW
  });

  assert.equal(result.kind, "reply");
  assert.equal(result.session.slots.name, "Ana");
  assert.equal(result.session.slots.project.city, "Bogotá");
  assert.equal(result.session.turnCount, 1);
  assert.equal(calls.length, 1);
  assert.equal("sessionId" in calls[0].context.session, false);
  assert.equal(JSON.stringify(calls[0].context).includes(SESSION_ID), false);
  assert.match(calls[0].instructions, /SD\.Live Assistant/);
  assert.equal(calls[0].schema.additionalProperties, false);
});

test("Availability is server-read once and returned to the second model pass", async () => {
  const calls = [];
  let availabilityCalls = 0;
  const result = await runComposedAssistantTurn({}, {
    requestId: REQUEST_ID,
    message: "Are you available now?",
    session: session()
  }, {
    providerCall: queueProvider([
      output("check_availability"),
      output("reply", { reply: "The current status is available." })
    ], calls),
    availabilityReader: async () => {
      availabilityCalls += 1;
      return {
        ok: true,
        availabilityKnown: true,
        currentStatus: "available",
        humanReachable: true,
        contactMode: "whatsapp",
        nextHumanWindow: null,
        reason: null
      };
    },
    now: () => NOW
  });

  assert.equal(result.kind, "reply");
  assert.equal(availabilityCalls, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].context.toolResults[0].type, "availability");
  assert.equal(calls[1].context.toolResults[0].value.currentStatus, "available");
});

test("Rental request is resolved only through the deterministic resolver", async () => {
  let rentalCalls = 0;
  const result = await runComposedAssistantTurn({}, {
    requestId: REQUEST_ID,
    message: "I need a WING",
    session: session()
  }, {
    providerCall: queueProvider([
      output("check_rental", {
        serviceCategory: "rental",
        rentalQuery: { items: [{ name: "WING", quantity: 1 }], services: [] }
      }),
      output("reply", {
        serviceCategory: "rental",
        reply: "WING is recognized in the listed rental catalog."
      })
    ]),
    rentalResolver: async (query) => {
      rentalCalls += 1;
      assert.deepEqual(query, {
        items: [{ name: "WING", quantity: 1 }],
        services: []
      });
      return {
        readyForBackendEvaluation: true,
        resolvedItems: [{ key: "wing", label: "Behringer WING", quantity: 1 }],
        unresolved: [],
        issues: []
      };
    },
    now: () => NOW
  });

  assert.equal(result.kind, "reply");
  assert.equal(rentalCalls, 1);
  assert.equal(result.toolResults[0].type, "rental");
});

test("capture fails closed if irreversible persistence adapter is explicitly disabled", async () => {
  const leadDraft = {
    serviceCategory: "live",
    language: "en",
    market: "colombia",
    name: "Ana",
    contact: {
      email: "ana@example.com",
      phone: null,
      whatsapp: null,
      other: null,
      preferredChannel: "email"
    },
    project: { date: null, city: "Bogotá", venue: null },
    summary: "Live event",
    details: { equipment: [], schedule: null }
  };

  await assert.rejects(
    () => runComposedAssistantTurn({}, {
      requestId: REQUEST_ID,
      message: "Send it",
      session: session(),
      consentEvidence: consentEvidence()
    }, {
      providerCall: queueProvider([output("capture_lead", { leadDraft })]),
      captureLeadEffect: null,
      now: () => NOW
    }),
    (error) => error?.code === "LEAD_CAPTURE_PERSISTENCE_NOT_CONFIGURED"
  );
});

test("fresh server consent allows injected capture and notification exactly once", async () => {
  let captures = 0;
  let notifications = 0;
  const leadDraft = {
    serviceCategory: "systems",
    language: "en",
    market: "international",
    name: "Alex",
    contact: {
      email: "alex@example.com",
      phone: null,
      whatsapp: null,
      other: null,
      preferredChannel: "email"
    },
    project: { date: "2026-10-10", city: "Miami", venue: null },
    summary: "System design request",
    details: { equipment: ["Dante network"], schedule: null }
  };

  const result = await runComposedAssistantTurn({}, {
    requestId: REQUEST_ID,
    message: "Authorize and send",
    session: session(),
    consentEvidence: consentEvidence()
  }, {
    providerCall: queueProvider([
      output("capture_lead", {
        serviceCategory: "systems",
        leadDraft
      })
    ]),
    captureLeadEffect: async (_env, input) => {
      captures += 1;
      assert.equal(input.requestId, REQUEST_ID);
      assert.equal(input.consentEvidence.source, "assistant");
      return { leadId: 77 };
    },
    notificationSend: async (_env, input) => {
      notifications += 1;
      assert.equal(input.leadId, 77);
      return { ok: true };
    },
    now: () => NOW
  });

  assert.equal(result.kind, "lead_captured");
  assert.equal(result.leadId, 77);
  assert.equal(result.notificationSent, true);
  assert.equal(captures, 1);
  assert.equal(notifications, 1);
});

test("notification transport failure remains degraded after successful persistence", async () => {
  const leadDraft = {
    serviceCategory: "other",
    language: "en",
    market: "international",
    name: "Alex",
    contact: {
      email: "alex@example.com",
      phone: null,
      whatsapp: null,
      other: null,
      preferredChannel: "email"
    },
    project: { date: null, city: null, venue: null },
    summary: "General request",
    details: { equipment: [], schedule: null }
  };

  const result = await runComposedAssistantTurn({}, {
    requestId: REQUEST_ID,
    message: "Send",
    session: session(),
    consentEvidence: consentEvidence()
  }, {
    providerCall: queueProvider([output("capture_lead", { serviceCategory: "other", leadDraft })]),
    captureLeadEffect: async () => ({ leadId: 91 }),
    notificationSend: async () => {
      const error = new Error("private provider detail");
      error.code = "notification_failed";
      throw error;
    },
    now: () => NOW
  });

  assert.equal(result.kind, "lead_captured");
  assert.equal(result.leadId, 91);
  assert.equal(result.notificationSent, false);
  assert.equal(result.notificationErrorCode, "notification_failed");
});

test("invalid model action is rejected before capture even through composed dependencies", async () => {
  let captures = 0;
  await assert.rejects(
    () => runComposedAssistantTurn({}, {
      requestId: REQUEST_ID,
      message: "Put this in finance",
      session: session()
    }, {
      providerCall: queueProvider([output("write_finance")]),
      captureLeadEffect: async () => {
        captures += 1;
        return { leadId: 1 };
      },
      now: () => NOW
    }),
    (error) => error?.code === "PROVIDER_INVALID_OUTPUT"
  );
  assert.equal(captures, 0);
});

test("dependency factory exposes only bounded orchestrator functions", () => {
  const deps = createAssistantBackendDependencies({}, {
    providerCall: async () => output("reply"),
    now: () => NOW
  });
  assert.equal(typeof deps.callModel, "function");
  assert.equal(typeof deps.captureLead, "function");
  assert.equal(typeof deps.writeFinance, "undefined");
  assert.equal(typeof deps.executeTool, "undefined");
});
