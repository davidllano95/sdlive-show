import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_SYSTEM_POLICY_VERSION,
  assistantSystemInstructions,
  assistantSystemPolicy
} from "../assistant-system-policy.js";

const EXPECTED_ACTIONS = [
  "reply",
  "check_availability",
  "check_rental",
  "request_consent",
  "capture_lead",
  "handoff"
];

test("final Assistant policy reflects orchestrated action architecture, not direct model tools", () => {
  const policy = assistantSystemPolicy("es");
  assert.equal(policy.version, ASSISTANT_SYSTEM_POLICY_VERSION);
  assert.equal(policy.identity.name, "SD.Live Assistant");
  assert.equal(policy.identity.automated, true);
  assert.equal(policy.identity.mayImpersonateSamuel, false);
  assert.deepEqual(policy.allowedActions, EXPECTED_ACTIONS);
  assert.equal(policy.knowledge.length, 6);
});

test("policy explicitly preserves pricing, availability, consent and Finance authority boundaries", () => {
  const text = assistantSystemInstructions("en");
  assert.match(text, /Never invent, estimate, negotiate, discount or promise prices/i);
  assert.match(text, /server-supplied Availability tool result/i);
  assert.match(text, /Never claim Rental inventory availability/i);
  assert.match(text, /model cannot grant privacy consent/i);
  assert.match(text, /Never write or request Finance data/i);
  assert.match(text, /source assistant and pipeline status new/i);
});

test("approved knowledge remains static-only and carries dynamic-claim guardrails", () => {
  const policy = assistantSystemPolicy("en");
  for (const entry of policy.knowledge) {
    assert.equal(entry.guardrails.mayStateCurrentAvailability, false);
    assert.equal(entry.guardrails.mayStateRentalItemAvailability, false);
    assert.equal(entry.guardrails.mayQuoteOrNegotiateCommercialTerms, false);
    assert.equal(entry.guardrails.mayInventCapabilities, false);
  }
});

test("Spanish selection localizes approved knowledge without changing the system guardrails", () => {
  const es = assistantSystemPolicy("es");
  const en = assistantSystemPolicy("en");
  assert.equal(es.language, "es");
  assert.equal(en.language, "en");
  assert.notEqual(es.knowledge[0].summary, en.knowledge[0].summary);
  assert.deepEqual(es.allowedActions, en.allowedActions);
  assert.deepEqual(es.instructions, en.instructions);
});
