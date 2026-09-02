import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantStoragePreparationPolicy,
  assistantStoragePreparationSql,
  inspectAssistantStoragePreparationReadiness,
  planAssistantStoragePreparation,
  prepareAssistantStorage
} from "../assistant-storage-preparation.js";

const PRIVACY_SQL = `CREATE TABLE privacy_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('contact', 'rental')),
  privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  privacy_policy_version TEXT NOT NULL,
  authorization_method TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
)`;

const PRIVACY_INDEX_SQL = `CREATE UNIQUE INDEX idx_privacy_consents_lead_source
  ON privacy_consents (lead_id, source)`;

function productionPreflight(overrides = {}) {
  return {
    ok: true,
    readOnly: true,
    readyForAssistantLeadCapture: false,
    leads: {
      ok: true,
      canInsertAssistantLead: true,
      reason: "compatible",
      legacyEmailRequired: false,
      supportsNonEmailContact: true
    },
    privacyConsents: {
      ok: true,
      canRecordAssistantConsent: false,
      reason: "assistant_source_not_allowed",
      missingColumns: [],
      assistantSourceAllowed: false,
      sourceConstrained: true,
      hasCanonicalUniqueIndex: true
    },
    idempotency: {
      ok: true,
      ready: false,
      reason: "table_missing"
    },
    ...overrides
  };
}

function fakeReadinessDb({ tempRows = [], fkRows = [], privacyCount = 7, extraPrivacyObjects = [] } = {}) {
  return {
    prepare(sql) {
      const statement = String(sql).trim();
      const api = {
        bind() { return api; },
        async first() {
          if (/^SELECT COUNT\(\*\) AS count FROM privacy_consents$/i.test(statement)) {
            return { count: privacyCount };
          }
          throw new Error(`Unexpected first SQL: ${statement}`);
        },
        async all() {
          if (/^PRAGMA foreign_key_check$/i.test(statement)) {
            return { results: fkRows };
          }
          if (/^SELECT name FROM sqlite_master WHERE name IN/i.test(statement)) {
            return { results: tempRows };
          }
          if (/SELECT type, name, sql\s+FROM sqlite_master\s+WHERE tbl_name = 'privacy_consents'/i.test(statement)) {
            return {
              results: [
                { type: "index", name: "idx_privacy_consents_lead_source", sql: PRIVACY_INDEX_SQL },
                { type: "table", name: "privacy_consents", sql: PRIVACY_SQL },
                ...extraPrivacyObjects
              ]
            };
          }
          throw new Error(`Unexpected all SQL: ${statement}`);
        }
      };
      return api;
    }
  };
}

test("production post-Leads state plans exactly Privacy + idempotency", () => {
  const plan = planAssistantStoragePreparation(productionPreflight());
  assert.equal(plan.ready, false);
  assert.equal(plan.canApply, true);
  assert.deepEqual(plan.actions, ["privacy_consents", "assistant_idempotency"]);
  assert.deepEqual(plan.blockers, []);
});

test("any Leads regression or unexpected storage state fails closed", () => {
  const leadsBlocked = planAssistantStoragePreparation(productionPreflight({
    leads: { canInsertAssistantLead: false, reason: "legacy_email_required" }
  }));
  assert.equal(leadsBlocked.canApply, false);
  assert.ok(leadsBlocked.blockers.some((item) => item.area === "leads"));

  const privacyChanged = planAssistantStoragePreparation(productionPreflight({
    privacyConsents: { canRecordAssistantConsent: false, reason: "required_columns_missing" }
  }));
  assert.equal(privacyChanged.canApply, false);

  const idempotencyChanged = planAssistantStoragePreparation(productionPreflight({
    idempotency: { ready: false, reason: "required_columns_missing" }
  }));
  assert.equal(idempotencyChanged.canApply, false);
});

test("readiness accepts the exact production Privacy schema and rejects new related objects", async () => {
  const readyEnv = { CMS_DB: fakeReadinessDb() };
  const report = await inspectAssistantStoragePreparationReadiness(readyEnv, {
    inspect: async () => productionPreflight()
  });
  assert.equal(report.canApply, true);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.counts, { privacyConsents: 7 });
  assert.equal(report.foreignKeyViolations, 0);
  assert.deepEqual(report.temporaryObjects, []);

  const triggerEnv = {
    CMS_DB: fakeReadinessDb({
      extraPrivacyObjects: [{
        type: "trigger",
        name: "trg_privacy_unknown",
        sql: "CREATE TRIGGER trg_privacy_unknown AFTER INSERT ON privacy_consents BEGIN SELECT 1; END"
      }]
    })
  };
  const blocked = await inspectAssistantStoragePreparationReadiness(triggerEnv, {
    inspect: async () => productionPreflight()
  });
  assert.equal(blocked.canApply, false);
  assert.ok(blocked.blockers.some((item) => item.reason === "unexpected_related_schema"));
});

test("foreign-key violations or stale migration objects block before writes", async () => {
  const env = {
    CMS_DB: fakeReadinessDb({
      fkRows: [{ table: "privacy_consents", rowid: 1, parent: "leads", fkid: 0 }],
      tempRows: [{ name: "assistant_storage_backup_privacy_consents" }]
    })
  };
  const report = await inspectAssistantStoragePreparationReadiness(env, {
    inspect: async () => productionPreflight()
  });
  assert.equal(report.canApply, false);
  assert.ok(report.blockers.some((item) => item.reason === "foreign_key_violations_present"));
  assert.ok(report.blockers.some((item) => item.reason === "migration_temp_objects_present"));
});

test("migration SQL preserves Privacy rows and never modifies Leads", () => {
  const statements = assistantStoragePreparationSql();
  const joined = statements.join("\n");

  assert.match(joined, /source TEXT NOT NULL CHECK \(source IN \('contact', 'rental', 'assistant'\)\)/);
  assert.match(joined, /CREATE TABLE assistant_effect_reservations/);
  assert.match(joined, /effect TEXT NOT NULL CHECK \(effect IN \('lead_create'\)\)/);
  assert.match(joined, /status TEXT NOT NULL CHECK \(status IN \('reserved', 'completed', 'failed'\)\)/);
  assert.match(joined, /ON DELETE SET NULL/);
  assert.match(joined, /CREATE INDEX idx_assistant_effect_reservations_status_updated/);
  assert.match(joined, /EXCEPT/);
  assert.match(joined, /assistant_storage_backup_sequences/);
  assert.doesNotMatch(joined, /DROP TABLE leads/i);
  assert.doesNotMatch(joined, /ALTER TABLE leads/i);
  assert.doesNotMatch(joined, /UPDATE leads/i);
  assert.doesNotMatch(joined, /PRAGMA\s+(?:foreign_keys|defer_foreign_keys)/i);
});

test("executor runs exactly one batch on a clean gate and verifies final preflight", async () => {
  const batches = [];
  const env = {
    CMS_DB: {
      prepare(sql) { return { sql: String(sql) }; },
      async batch(statements) { batches.push(statements); return statements.map(() => ({ success: true })); }
    }
  };
  let readinessCalls = 0;
  const result = await prepareAssistantStorage(env, {
    inspectReadiness: async () => {
      readinessCalls += 1;
      if (readinessCalls === 1) {
        return {
          ok: true,
          readOnly: true,
          ready: false,
          canApply: true,
          actions: ["privacy_consents", "assistant_idempotency"],
          blockers: [],
          counts: { privacyConsents: 7 },
          foreignKeyViolations: 0,
          temporaryObjects: []
        };
      }
      return {
        ok: true,
        readOnly: true,
        ready: true,
        canApply: true,
        actions: [],
        blockers: [],
        counts: { privacyConsents: 7 },
        foreignKeyViolations: 0,
        temporaryObjects: []
      };
    },
    inspectStorage: async () => ({ readyForAssistantLeadCapture: true })
  });

  assert.equal(batches.length, 1);
  assert.ok(batches[0].length > 10);
  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.ready, true);
  assert.deepEqual(result.actions, ["privacy_consents", "assistant_idempotency"]);
  assert.deepEqual(result.before.counts, { privacyConsents: 7 });
  assert.deepEqual(result.after.counts, { privacyConsents: 7 });
});

test("executor never batches when blocked or already ready", async () => {
  let batchCalls = 0;
  const env = {
    CMS_DB: {
      prepare(sql) { return { sql }; },
      async batch() { batchCalls += 1; }
    }
  };

  const blocked = await prepareAssistantStorage(env, {
    inspectReadiness: async () => ({
      ready: false,
      canApply: false,
      actions: [],
      blockers: [{ area: "leads", reason: "changed" }],
      foreignKeyViolations: 0,
      temporaryObjects: []
    })
  });
  assert.equal(blocked.ok, false);
  assert.equal(batchCalls, 0);

  const already = await prepareAssistantStorage(env, {
    inspectReadiness: async () => ({
      ready: true,
      canApply: true,
      actions: [],
      blockers: [],
      foreignKeyViolations: 0,
      temporaryObjects: [],
      preflight: { readyForAssistantLeadCapture: true }
    })
  });
  assert.equal(already.ok, true);
  assert.equal(already.alreadyReady, true);
  assert.equal(batchCalls, 0);
});

test("policy explicitly forbids modifying Leads or public runtime access", () => {
  const policy = assistantStoragePreparationPolicy();
  assert.equal(policy.publicRuntimeMayCall, false);
  assert.equal(policy.adminOnly, true);
  assert.equal(policy.requiresExplicitConfirmation, true);
  assert.equal(policy.canModifyLeads, false);
});
