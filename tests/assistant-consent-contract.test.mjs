import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_CONSENT_METHOD,
  ASSISTANT_CONSENT_SOURCE,
  ASSISTANT_CONSENT_TTL_MS,
  ASSISTANT_PRIVACY_POLICY_URL,
  ASSISTANT_PRIVACY_POLICY_VERSION,
  assistantConsentPrompt,
  assistantConsentStorageRecord,
  buildAssistantConsentEvidence,
  isFreshAssistantConsentEvidence
} from "../assistant-consent-contract.js";

test("Assistant consent copy reuses the current website privacy policy contract", () => {
  const es = assistantConsentPrompt("es");
  const en = assistantConsentPrompt("en");

  assert.equal(es.policyVersion, "2026-08-19");
  assert.equal(en.policyVersion, ASSISTANT_PRIVACY_POLICY_VERSION);
  assert.equal(es.policyUrl, "/privacy");
  assert.equal(en.policyUrl, ASSISTANT_PRIVACY_POLICY_URL);
  assert.match(es.copy.body, /autorizo a Samuel David Llano \/ SD\.Live/);
  assert.match(en.copy.body, /I authorize Samuel David Llano \/ SD\.Live/);
  assert.equal(es.copy.authorize, "Autorizar y enviar");
  assert.equal(en.copy.authorize, "Authorize & send");
});

test("the product contract explicitly forbids model self-authorization", () => {
  const prompt = assistantConsentPrompt("en");
  assert.deepEqual(prompt.confirmation, {
    type: "explicit_product_action",
    authorizeAction: "authorize",
    cancelAction: "cancel",
    modelMaySelfAuthorize: false
  });
});

test("only the explicit authorize action creates consent evidence", () => {
  const now = new Date("2026-09-01T23:20:00.000Z");

  for (const action of [undefined, "", "cancel", "yes", "model_says_yes"]) {
    assert.deepEqual(buildAssistantConsentEvidence({
      action,
      policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION
    }, { now }), {
      ok: false,
      error: "explicit_authorization_required"
    });
  }

  const granted = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    language: "es"
  }, { now });

  assert.deepEqual(granted, {
    ok: true,
    evidence: {
      source: "assistant",
      granted: true,
      language: "es",
      privacyPolicyVersion: "2026-08-19",
      authorizationMethod: "assistant_explicit_confirmation",
      grantedAt: "2026-09-01T23:20:00.000Z"
    }
  });
});

test("stale policy versions fail closed", () => {
  const result = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: "2026-01-01"
  });
  assert.deepEqual(result, {
    ok: false,
    error: "privacy_policy_version_mismatch"
  });
});

test("consent evidence uses the same ten-minute freshness window as current site authorization", () => {
  const grantedAt = new Date("2026-09-01T23:20:00.000Z");
  const { evidence } = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION
  }, { now: grantedAt });

  assert.equal(ASSISTANT_CONSENT_TTL_MS, 10 * 60 * 1000);
  assert.equal(
    isFreshAssistantConsentEvidence(evidence, new Date("2026-09-01T23:29:59.999Z")),
    true
  );
  assert.equal(
    isFreshAssistantConsentEvidence(evidence, new Date("2026-09-01T23:30:00.001Z")),
    false
  );
});

test("tampered source, method, version or future timestamp is rejected", () => {
  const now = new Date("2026-09-01T23:20:00.000Z");
  const { evidence } = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION
  }, { now });

  for (const changed of [
    { ...evidence, source: "contact" },
    { ...evidence, authorizationMethod: "model_claim" },
    { ...evidence, privacyPolicyVersion: "old" },
    { ...evidence, grantedAt: "2026-09-01T23:21:00.000Z" }
  ]) {
    assert.equal(isFreshAssistantConsentEvidence(changed, now), false);
  }
});

test("fresh evidence maps cleanly to the existing consent storage fields after lead creation", () => {
  const now = new Date("2026-09-01T23:20:00.000Z");
  const { evidence } = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    language: "en"
  }, { now });

  assert.deepEqual(assistantConsentStorageRecord(evidence, 42, now), {
    leadId: 42,
    source: ASSISTANT_CONSENT_SOURCE,
    privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    authorizationMethod: ASSISTANT_CONSENT_METHOD,
    privacyConsentAt: "2026-09-01T23:20:00.000Z"
  });
});

test("storage mapping rejects expired evidence and invalid lead ids", () => {
  const grantedAt = new Date("2026-09-01T23:20:00.000Z");
  const { evidence } = buildAssistantConsentEvidence({
    action: "authorize",
    policyVersion: ASSISTANT_PRIVACY_POLICY_VERSION
  }, { now: grantedAt });

  assert.throws(
    () => assistantConsentStorageRecord(
      evidence,
      42,
      new Date("2026-09-01T23:31:00.000Z")
    ),
    /Fresh Assistant consent evidence/
  );

  assert.throws(
    () => assistantConsentStorageRecord(evidence, 0, grantedAt),
    /valid leadId/
  );
});
