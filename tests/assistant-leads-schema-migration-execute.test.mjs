import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantLeadsMigrationSql,
  migrateAssistantLeadsExact
} from "../assistant-leads-schema-migration.js";

function readiness(overrides = {}) {
  return {
    ok: true,
    readOnly: true,
    alreadyApplied: false,
    canApply: true,
    blockers: [],
    counts: { leads: 25, privacyConsents: 7, rentalRequests: 11 },
    foreignKeyViolations: 0,
    temporaryObjects: [],
    ...overrides
  };
}

function fakeBatchDb() {
  const batches = [];
  const prepared = [];
  return {
    batches,
    prepared,
    prepare(sql) {
      const statement = { sql: String(sql).trim() };
      prepared.push(statement.sql);
      return statement;
    },
    async batch(statements) {
      batches.push(statements.map((statement) => statement.sql));
      return statements.map(() => ({ success: true }));
    }
  };
}

test("exact Leads migration executes the prepared SQL once after a clean readiness gate", async () => {
  const db = fakeBatchDb();
  const env = { CMS_DB: db };
  let storageInspections = 0;

  const result = await migrateAssistantLeadsExact(env, {
    inspect: async () => readiness(),
    inspectStorage: async () => {
      storageInspections += 1;
      return { leads: { canInsertAssistantLead: true } };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.alreadyApplied, false);
  assert.equal(result.leadsReady, true);
  assert.equal(db.batches.length, 1);
  assert.deepEqual(db.batches[0], assistantLeadsMigrationSql());
  assert.equal(storageInspections, 1);
  assert.ok(db.batches[0].some((sql) => sql === "DROP TABLE leads"));
  assert.ok(db.batches[0].some((sql) => sql.includes("'project', 'assistant'")));
  assert.ok(db.batches[0].some((sql) => sql.includes("EXCEPT SELECT")));
  assert.ok(db.batches[0].every((sql) => !/PRAGMA\s+(?:foreign_keys|defer_foreign_keys)/i.test(sql)));
});

test("blocked readiness prevents every migration batch write", async () => {
  const db = fakeBatchDb();
  const result = await migrateAssistantLeadsExact({ CMS_DB: db }, {
    inspect: async () => readiness({ canApply: false, blockers: ["foreign_key_violations_present"] }),
    inspectStorage: async () => { throw new Error("must not run"); }
  });

  assert.equal(result.ok, false);
  assert.equal(result.applied, false);
  assert.deepEqual(result.blockers, ["foreign_key_violations_present"]);
  assert.equal(db.batches.length, 0);
  assert.equal(db.prepared.length, 0);
});

test("already-applied readiness never replays the destructive rebuild", async () => {
  const db = fakeBatchDb();
  const result = await migrateAssistantLeadsExact({ CMS_DB: db }, {
    inspect: async () => readiness({ alreadyApplied: true }),
    inspectStorage: async () => ({ leads: { canInsertAssistantLead: true } })
  });

  assert.equal(result.ok, true);
  assert.equal(result.applied, false);
  assert.equal(result.alreadyApplied, true);
  assert.equal(db.batches.length, 0);
  assert.equal(db.prepared.length, 0);
});

test("post-storage inspection cannot claim success when Assistant Leads remain blocked", async () => {
  const db = fakeBatchDb();
  const result = await migrateAssistantLeadsExact({ CMS_DB: db }, {
    inspect: async () => readiness(),
    inspectStorage: async () => ({ leads: { canInsertAssistantLead: false } })
  });

  assert.equal(result.ok, false);
  assert.equal(result.applied, true);
  assert.equal(result.leadsReady, false);
  assert.equal(db.batches.length, 1);
});
