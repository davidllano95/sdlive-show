import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantStoragePreparationPolicy,
  planAssistantStoragePreparation,
  prepareAssistantStorage
} from "../assistant-storage-preparation.js";

function readyPreflight() {
  return {
    ok: true,
    readOnly: true,
    readyForAssistantLeadCapture: true,
    leads: {
      canInsertAssistantLead: true,
      reason: "compatible",
      missingLegacy: [],
      missingCanonical: []
    },
    privacyConsents: {
      canRecordAssistantConsent: true,
      reason: "compatible"
    },
    idempotency: {
      ready: true,
      reason: "compatible"
    }
  };
}

function baseNotReady() {
  const value = readyPreflight();
  value.readyForAssistantLeadCapture = false;
  return value;
}

function inertDb() {
  return {
    prepare() {
      throw new Error("storage must not be touched in this test");
    }
  };
}

test("ready storage produces no actions and is safe to apply", () => {
  const plan = planAssistantStoragePreparation(readyPreflight());
  assert.deepEqual(plan, {
    ready: true,
    canApply: true,
    actions: [],
    blockers: []
  });
});

test("planner only auto-prepares missing canonical Lead Core columns", () => {
  const preflight = baseNotReady();
  preflight.leads = {
    canInsertAssistantLead: false,
    reason: "required_columns_missing",
    missingLegacy: [],
    missingCanonical: ["source", "service_category"]
  };

  const plan = planAssistantStoragePreparation(preflight);
  assert.equal(plan.canApply, true);
  assert.deepEqual(plan.actions, ["lead_core_columns"]);
  assert.deepEqual(plan.blockers, []);
});

test("planner can prepare known privacy and idempotency gaps", () => {
  const preflight = baseNotReady();
  preflight.privacyConsents = {
    canRecordAssistantConsent: false,
    reason: "assistant_source_not_allowed"
  };
  preflight.idempotency = {
    ready: false,
    reason: "table_missing"
  };

  const plan = planAssistantStoragePreparation(preflight);
  assert.equal(plan.canApply, true);
  assert.deepEqual(plan.actions, ["privacy_consents", "assistant_idempotency"]);
  assert.deepEqual(plan.blockers, []);
});

test("legacy Lead constraints fail closed instead of rebuilding leads", () => {
  for (const reason of [
    "legacy_type_check_blocks_assistant",
    "legacy_status_check_blocks_new",
    "legacy_email_required",
    "table_missing"
  ]) {
    const preflight = baseNotReady();
    preflight.leads = {
      canInsertAssistantLead: false,
      reason,
      missingLegacy: [],
      missingCanonical: []
    };

    const plan = planAssistantStoragePreparation(preflight);
    assert.equal(plan.canApply, false, reason);
    assert.equal(plan.actions.includes("lead_core_columns"), false, reason);
    assert.deepEqual(plan.blockers, [{ area: "leads", reason }], reason);
  }
});

test("unknown existing storage shapes also fail closed", () => {
  const preflight = baseNotReady();
  preflight.privacyConsents = {
    canRecordAssistantConsent: false,
    reason: "required_columns_missing"
  };
  preflight.idempotency = {
    ready: false,
    reason: "status_constraint_incompatible"
  };

  const plan = planAssistantStoragePreparation(preflight);
  assert.equal(plan.canApply, false);
  assert.deepEqual(plan.actions, []);
  assert.deepEqual(plan.blockers, [
    { area: "privacy_consents", reason: "required_columns_missing" },
    { area: "assistant_effect_reservations", reason: "status_constraint_incompatible" }
  ]);
});

test("prepare is a no-op when preflight is already ready", async () => {
  const preflight = readyPreflight();
  const result = await prepareAssistantStorage(
    { CMS_DB: inertDb() },
    {
      inspect: async () => preflight,
      ensureLeadCore: async () => {
        throw new Error("Lead Core preparation must not run");
      }
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.applied, false);
  assert.equal(result.ready, true);
  assert.equal(result.manualMigrationRequired, false);
  assert.deepEqual(result.actions, []);
  assert.equal(result.before, preflight);
  assert.equal(result.after, preflight);
});

test("prepare refuses blockers before issuing any storage mutation", async () => {
  const preflight = baseNotReady();
  preflight.leads = {
    canInsertAssistantLead: false,
    reason: "legacy_type_check_blocks_assistant",
    missingLegacy: [],
    missingCanonical: []
  };

  let ensureCalls = 0;
  const result = await prepareAssistantStorage(
    { CMS_DB: inertDb() },
    {
      inspect: async () => preflight,
      ensureLeadCore: async () => { ensureCalls += 1; }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.applied, false);
  assert.equal(result.ready, false);
  assert.equal(result.manualMigrationRequired, true);
  assert.equal(ensureCalls, 0);
  assert.deepEqual(result.actions, []);
  assert.deepEqual(result.blockers, [
    { area: "leads", reason: "legacy_type_check_blocks_assistant" }
  ]);
});

test("storage preparation policy forbids public or automatic Lead-table rebuilds", () => {
  assert.deepEqual(assistantStoragePreparationPolicy(), {
    publicRuntimeMayCall: false,
    adminOnly: true,
    requiresExplicitConfirmation: true,
    autoRebuildLeads: false,
    canPrepareCanonicalLeadColumns: true,
    canPreparePrivacyConsents: true,
    canPrepareAssistantIdempotency: true,
    refusesUnknownExistingSchemas: true
  });
});
