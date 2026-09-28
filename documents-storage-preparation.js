import {
  DOCUMENTS_SCHEMA_VERSION,
  documentsSchemaDefinitions,
  documentsSchemaSql
} from "./documents-schema.js";

const PREFLIGHT_R2_KEY = "__sdlive_documents_storage_preflight__";
const TEST_SERIES = Object.freeze({
  "test:CC": Object.freeze({ issuerId: "test", docType: "cc", pattern: "TEST-CC {n}" }),
  "test:INV": Object.freeze({ issuerId: "test", docType: "invoice", pattern: "TEST-INV {n:04}" })
});

function normalizeSql(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/;$/, "")
    .toLowerCase();
}

function docsDb(env) {
  const db = env?.DOCS_DB;
  return db && typeof db.prepare === "function" ? db : null;
}

function docsBucket(env) {
  const bucket = env?.DOCS_BUCKET;
  return bucket && typeof bucket.head === "function" ? bucket : null;
}

async function probeDatabase(db) {
  try {
    const row = await db.prepare("SELECT 1 AS ok").first();
    return Number(row?.ok) === 1;
  } catch {
    return false;
  }
}

async function probeBucket(bucket) {
  try {
    await bucket.head(PREFLIGHT_R2_KEY);
    return true;
  } catch {
    return false;
  }
}

async function readDocumentsSchemaObjects(db) {
  const result = await db.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE name LIKE 'doc_%'
      AND sql IS NOT NULL
    ORDER BY type, name
  `).all();
  return Array.isArray(result?.results) ? result.results : [];
}

async function foreignKeyViolations(db) {
  const result = await db.prepare("PRAGMA foreign_key_check").all();
  return Array.isArray(result?.results) ? result.results : [];
}

async function readTestSequences(db) {
  const result = await db.prepare(`
    SELECT series_key, issuer_id, doc_type, next_value, display_pattern, is_test
    FROM doc_sequences
    WHERE series_key IN ('test:CC', 'test:INV')
    ORDER BY series_key
  `).all();
  return Array.isArray(result?.results) ? result.results : [];
}

function compareSchemaObjects(actualObjects) {
  const expected = documentsSchemaDefinitions();
  const expectedByName = new Map(expected.map((item) => [item.name, item]));
  const actualByName = new Map((actualObjects || []).map((item) => [String(item?.name || ""), item]));

  const missing = [];
  const mismatched = [];
  const unexpected = [];

  for (const item of expected) {
    const actual = actualByName.get(item.name);
    if (!actual) {
      missing.push(item.name);
      continue;
    }
    if (String(actual.type || "") !== item.type || normalizeSql(actual.sql) !== normalizeSql(item.sql)) {
      mismatched.push(item.name);
    }
  }

  for (const item of actualObjects || []) {
    const name = String(item?.name || "");
    if (name && !expectedByName.has(name)) unexpected.push(name);
  }

  return {
    expectedCount: expected.length,
    actualCount: Array.isArray(actualObjects) ? actualObjects.length : 0,
    missing,
    mismatched,
    unexpected,
    exact: missing.length === 0 && mismatched.length === 0 && unexpected.length === 0
  };
}

function validateTestSequences(rows) {
  const byKey = new Map((rows || []).map((row) => [String(row?.series_key || ""), row]));
  const missing = [];
  const mismatched = [];

  for (const [key, expected] of Object.entries(TEST_SERIES)) {
    const row = byKey.get(key);
    if (!row) {
      missing.push(key);
      continue;
    }
    const nextValue = Number(row.next_value);
    if (
      String(row.issuer_id || "") !== expected.issuerId ||
      String(row.doc_type || "") !== expected.docType ||
      !Number.isSafeInteger(nextValue) ||
      nextValue < 1 ||
      String(row.display_pattern || "") !== expected.pattern ||
      Number(row.is_test) !== 1
    ) {
      mismatched.push(key);
    }
  }

  const unexpected = (rows || [])
    .map((row) => String(row?.series_key || ""))
    .filter((key) => key && !Object.hasOwn(TEST_SERIES, key));

  return {
    missing,
    mismatched,
    unexpected,
    ready: missing.length === 0 && mismatched.length === 0 && unexpected.length === 0
  };
}

function unavailableReport({ dbAvailable, bucketAvailable }) {
  const blockers = [];
  if (!dbAvailable) blockers.push({ area: "DOCS_DB", reason: "binding_unavailable" });
  if (!bucketAvailable) blockers.push({ area: "DOCS_BUCKET", reason: "binding_unavailable" });
  return {
    ok: false,
    readOnly: true,
    available: false,
    ready: false,
    canPrepare: false,
    schemaVersion: DOCUMENTS_SCHEMA_VERSION,
    bindings: { DOCS_DB: dbAvailable, DOCS_BUCKET: bucketAvailable },
    blockers
  };
}

export async function inspectDocumentsStoragePreflight(env) {
  const db = docsDb(env);
  const bucket = docsBucket(env);
  const [dbAvailable, bucketAvailable] = await Promise.all([
    db ? probeDatabase(db) : false,
    bucket ? probeBucket(bucket) : false
  ]);

  if (!dbAvailable || !bucketAvailable) {
    return unavailableReport({ dbAvailable, bucketAvailable });
  }

  const [objects, fkRows] = await Promise.all([
    readDocumentsSchemaObjects(db),
    foreignKeyViolations(db)
  ]);
  const schema = compareSchemaObjects(objects);
  const blockers = [];

  if (fkRows.length > 0) {
    blockers.push({ area: "DOCS_DB", reason: "foreign_key_violations_present" });
  }

  if (objects.length === 0) {
    return {
      ok: true,
      readOnly: true,
      available: true,
      ready: false,
      canPrepare: blockers.length === 0,
      schemaVersion: DOCUMENTS_SCHEMA_VERSION,
      bindings: { DOCS_DB: true, DOCS_BUCKET: true },
      schema,
      testSequences: null,
      foreignKeyViolations: fkRows.length,
      blockers
    };
  }

  if (!schema.exact) {
    blockers.push({ area: "DOCS_DB", reason: "unexpected_documents_schema" });
    return {
      ok: true,
      readOnly: true,
      available: true,
      ready: false,
      canPrepare: false,
      schemaVersion: DOCUMENTS_SCHEMA_VERSION,
      bindings: { DOCS_DB: true, DOCS_BUCKET: true },
      schema,
      testSequences: null,
      foreignKeyViolations: fkRows.length,
      blockers
    };
  }

  const testSequences = validateTestSequences(await readTestSequences(db));
  if (!testSequences.ready) {
    blockers.push({ area: "doc_sequences", reason: "test_sequences_not_canonical" });
  }

  const ready = blockers.length === 0 && schema.exact && testSequences.ready;
  return {
    ok: true,
    readOnly: true,
    available: true,
    ready,
    canPrepare: ready,
    schemaVersion: DOCUMENTS_SCHEMA_VERSION,
    bindings: { DOCS_DB: true, DOCS_BUCKET: true },
    schema,
    testSequences,
    foreignKeyViolations: fkRows.length,
    blockers
  };
}

function compact(report) {
  if (!report || typeof report !== "object") return null;
  return {
    ok: report.ok === true,
    readOnly: report.readOnly === true,
    available: report.available === true,
    ready: report.ready === true,
    canPrepare: report.canPrepare === true,
    schemaVersion: report.schemaVersion || null,
    bindings: report.bindings || null,
    schema: report.schema || null,
    testSequences: report.testSequences || null,
    foreignKeyViolations: Number(report.foreignKeyViolations || 0),
    blockers: Array.isArray(report.blockers) ? report.blockers : []
  };
}

export async function prepareDocumentsStorage(
  env,
  { inspect = inspectDocumentsStoragePreflight } = {}
) {
  const db = docsDb(env);
  if (!db || typeof db.batch !== "function") {
    return {
      ok: false,
      applied: false,
      ready: false,
      error: "documents_storage_unavailable"
    };
  }

  const before = await inspect(env);
  if (before?.available !== true) {
    return {
      ok: false,
      applied: false,
      ready: false,
      error: "documents_storage_unavailable",
      before: compact(before)
    };
  }
  if (before.ready === true) {
    return {
      ok: true,
      applied: false,
      alreadyReady: true,
      ready: true,
      before: compact(before),
      after: compact(before)
    };
  }
  if (before.canPrepare !== true) {
    return {
      ok: false,
      applied: false,
      alreadyReady: false,
      ready: false,
      blockers: Array.isArray(before.blockers) ? before.blockers : [],
      before: compact(before)
    };
  }

  const statements = documentsSchemaSql().map((sql) => db.prepare(sql));
  await db.batch(statements);

  const after = await inspect(env);
  const ready = after?.ready === true && after?.available === true;
  return {
    ok: ready,
    applied: true,
    alreadyReady: false,
    ready,
    before: compact(before),
    after: compact(after),
    blockers: ready ? [] : (Array.isArray(after?.blockers) ? after.blockers : [])
  };
}

export function documentsStoragePreparationPolicy() {
  return Object.freeze({
    adminOnly: true,
    readOnlyPreflight: true,
    requiresExplicitConfirmation: true,
    ddlOnNormalTraffic: false,
    createsCloudflareResources: false,
    usesDedicatedD1: true,
    usesDedicatedPrivateR2: true,
    usesCmsDb: false,
    usesPublicMediaBucket: false,
    writesGoogleSheets: false,
    seedsRealSequences: false
  });
}
