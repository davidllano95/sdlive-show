import test from "node:test";
import assert from "node:assert/strict";

import { documentsSchemaDefinitions } from "../documents-schema.js";
import {
  documentsStoragePreparationPolicy,
  inspectDocumentsStoragePreflight,
  prepareDocumentsStorage
} from "../documents-storage-preparation.js";

function fakeBucket({ fail = false } = {}) {
  return {
    async head() {
      if (fail) throw new Error("bucket unavailable");
      return null;
    }
  };
}

function fakeDb({ objects = [], fkRows = [], testSequences = [] } = {}) {
  return {
    prepare(sql) {
      const statement = String(sql).trim();
      const api = {
        bind() { return api; },
        async first() {
          if (statement === "SELECT 1 AS ok") return { ok: 1 };
          throw new Error(`Unexpected first SQL: ${statement}`);
        },
        async all() {
          if (/FROM sqlite_master/i.test(statement)) return { results: objects };
          if (/PRAGMA foreign_key_check/i.test(statement)) return { results: fkRows };
          if (/FROM doc_sequences/i.test(statement)) return { results: testSequences };
          throw new Error(`Unexpected all SQL: ${statement}`);
        }
      };
      return api;
    }
  };
}

function canonicalObjects() {
  return documentsSchemaDefinitions().map((item) => ({
    type: item.type,
    name: item.name,
    sql: item.sql
  }));
}

function canonicalTestSequences() {
  return [
    {
      series_key: "test:CC",
      issuer_id: "test",
      doc_type: "cc",
      next_value: 1,
      display_pattern: "TEST-CC {n}",
      is_test: 1
    },
    {
      series_key: "test:INV",
      issuer_id: "test",
      doc_type: "invoice",
      next_value: 1,
      display_pattern: "TEST-INV {n:04}",
      is_test: 1
    }
  ];
}

test("missing dedicated bindings fail closed", async () => {
  const missingAll = await inspectDocumentsStoragePreflight({});
  assert.equal(missingAll.available, false);
  assert.equal(missingAll.ready, false);
  assert.equal(missingAll.canPrepare, false);
  assert.equal(missingAll.bindings.DOCS_DB, false);
  assert.equal(missingAll.bindings.DOCS_BUCKET, false);

  const missingBucket = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb()
  });
  assert.equal(missingBucket.available, false);
  assert.equal(missingBucket.bindings.DOCS_DB, true);
  assert.equal(missingBucket.bindings.DOCS_BUCKET, false);
});

test("an empty dedicated database is preparable but not ready", async () => {
  const report = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb(),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(report.ok, true);
  assert.equal(report.available, true);
  assert.equal(report.ready, false);
  assert.equal(report.canPrepare, true);
  assert.equal(report.schema.actualCount, 0);
  assert.equal(report.foreignKeyViolations, 0);
});

test("the exact canonical schema plus test sequences is ready", async () => {
  const report = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb({
      objects: canonicalObjects(),
      testSequences: canonicalTestSequences()
    }),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(report.available, true);
  assert.equal(report.ready, true);
  assert.equal(report.canPrepare, true);
  assert.deepEqual(report.blockers, []);
  assert.equal(report.schema.exact, true);
  assert.equal(report.testSequences.ready, true);
});

test("partial, changed, unknown or FK-broken schemas refuse automatic repair", async () => {
  const partial = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb({ objects: canonicalObjects().slice(0, 2) }),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(partial.ready, false);
  assert.equal(partial.canPrepare, false);
  assert.ok(partial.blockers.some((item) => item.reason === "unexpected_documents_schema"));

  const changedObjects = canonicalObjects();
  changedObjects[0] = { ...changedObjects[0], sql: `${changedObjects[0].sql} /* changed */` };
  const changed = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb({ objects: changedObjects }),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(changed.canPrepare, false);
  assert.ok(changed.schema.mismatched.includes("doc_issuer_profiles"));

  const unknown = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb({
      objects: [...canonicalObjects(), { type: "table", name: "doc_unknown", sql: "CREATE TABLE doc_unknown (id TEXT)" }]
    }),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(unknown.canPrepare, false);
  assert.ok(unknown.schema.unexpected.includes("doc_unknown"));

  const fkBroken = await inspectDocumentsStoragePreflight({
    DOCS_DB: fakeDb({
      objects: canonicalObjects(),
      testSequences: canonicalTestSequences(),
      fkRows: [{ table: "doc_documents", rowid: 1, parent: "doc_issuer_profiles", fkid: 0 }]
    }),
    DOCS_BUCKET: fakeBucket()
  });
  assert.equal(fkBroken.ready, false);
  assert.equal(fkBroken.canPrepare, false);
  assert.ok(fkBroken.blockers.some((item) => item.reason === "foreign_key_violations_present"));
});

test("preparation runs one batch only from a clean empty gate and revalidates", async () => {
  const batches = [];
  const env = {
    DOCS_DB: {
      prepare(sql) { return { sql: String(sql) }; },
      async batch(statements) {
        batches.push(statements);
        return statements.map(() => ({ success: true }));
      }
    }
  };

  let calls = 0;
  const result = await prepareDocumentsStorage(env, {
    inspect: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          readOnly: true,
          available: true,
          ready: false,
          canPrepare: true,
          schemaVersion: "documents-v1",
          bindings: { DOCS_DB: true, DOCS_BUCKET: true },
          schema: { actualCount: 0 },
          blockers: []
        };
      }
      return {
        ok: true,
        readOnly: true,
        available: true,
        ready: true,
        canPrepare: true,
        schemaVersion: "documents-v1",
        bindings: { DOCS_DB: true, DOCS_BUCKET: true },
        schema: { exact: true },
        testSequences: { ready: true },
        blockers: []
      };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.ready, true);
  assert.equal(batches.length, 1);
  assert.ok(batches[0].length > 10);
  const sql = batches[0].map((statement) => statement.sql).join("\n");
  assert.match(sql, /CREATE TABLE doc_documents/);
  assert.match(sql, /'test:CC'/);
  assert.doesNotMatch(sql, /'samuel:CC'/);
});

test("preparation performs zero writes when blocked, unavailable or already ready", async () => {
  let batchCalls = 0;
  const env = {
    DOCS_DB: {
      prepare(sql) { return { sql }; },
      async batch() { batchCalls += 1; }
    }
  };

  const blocked = await prepareDocumentsStorage(env, {
    inspect: async () => ({
      available: true,
      ready: false,
      canPrepare: false,
      blockers: [{ area: "DOCS_DB", reason: "unexpected_documents_schema" }]
    })
  });
  assert.equal(blocked.ok, false);
  assert.equal(batchCalls, 0);

  const unavailable = await prepareDocumentsStorage(env, {
    inspect: async () => ({ available: false, ready: false, canPrepare: false, blockers: [] })
  });
  assert.equal(unavailable.error, "documents_storage_unavailable");
  assert.equal(batchCalls, 0);

  const ready = await prepareDocumentsStorage(env, {
    inspect: async () => ({ available: true, ready: true, canPrepare: true, blockers: [] })
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.alreadyReady, true);
  assert.equal(batchCalls, 0);
});

test("storage policy explicitly preserves source-of-truth boundaries", () => {
  const policy = documentsStoragePreparationPolicy();
  assert.equal(policy.adminOnly, true);
  assert.equal(policy.readOnlyPreflight, true);
  assert.equal(policy.requiresExplicitConfirmation, true);
  assert.equal(policy.ddlOnNormalTraffic, false);
  assert.equal(policy.createsCloudflareResources, false);
  assert.equal(policy.usesDedicatedD1, true);
  assert.equal(policy.usesDedicatedPrivateR2, true);
  assert.equal(policy.usesCmsDb, false);
  assert.equal(policy.usesPublicMediaBucket, false);
  assert.equal(policy.writesGoogleSheets, false);
  assert.equal(policy.seedsRealSequences, false);
});
