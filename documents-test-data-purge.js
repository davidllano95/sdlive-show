import { documentsSchemaDefinitions } from "./documents-schema.js";
import { inspectDocumentsStoragePreflight } from "./documents-storage-preparation.js";

export const DOCUMENTS_TEST_PURGE_CONFIRMATION = "PURGE_DOCUMENTS_TEST_DATA";

const ROOT_TEST_SERIES = Object.freeze({
  "test:CC": Object.freeze({ issuerId: "test", docType: "cc", displayPattern: "TEST-CC {n}" }),
  "test:INV": Object.freeze({ issuerId: "test", docType: "invoice", displayPattern: "TEST-INV {n:04}" })
});
const TEST_DOCUMENT_PREDICATE = "(issuer_id = 'test' OR series_key IN ('test:CC', 'test:INV'))";
const REVISION_SEQUENCE_PREDICATE = "(series_key LIKE 'revision:test:CC:%' OR series_key LIKE 'revision:test:INV:%')";

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  if (typeof db.batch !== "function") throw new Error("documents_storage_batch_required");
  return db;
}

function bucketFromEnv(env) {
  const bucket = env?.DOCS_BUCKET;
  if (!bucket || typeof bucket.delete !== "function") throw new Error("documents_bucket_unavailable");
  return bucket;
}

async function all(store, sql) {
  const result = await store.prepare(sql).all();
  return result?.results || [];
}

async function scalarCount(store, sql) {
  const row = await store.prepare(sql).first();
  return Number(row?.count || 0);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function expectedSeriesForType(docType) {
  return docType === "cc" ? "test:CC" : (docType === "invoice" ? "test:INV" : null);
}

function triggerSql(name) {
  const definition = documentsSchemaDefinitions().find((item) => item.type === "trigger" && item.name === name);
  if (!definition?.sql) throw new Error(`documents_schema_trigger_missing:${name}`);
  return definition.sql;
}

function canonicalState(state) {
  return JSON.stringify({
    documents: state.documents.map((row) => ({
      id: row.id,
      status: row.status,
      issuerId: row.issuer_id,
      seriesKey: row.series_key,
      number: row.number,
      displayNumber: row.display_number,
      supersedesId: row.supersedes_id,
      supersededById: row.superseded_by_id,
      pdfR2Key: row.pdf_r2_key,
      htmlR2Key: row.html_r2_key
    })),
    eventCount: state.eventCount,
    sourceCount: state.sourceCount,
    revisionSequences: state.revisionSequences.map((row) => ({ seriesKey: row.series_key, nextValue: Number(row.next_value) })),
    rootSequences: state.rootSequences.map((row) => ({
      seriesKey: row.series_key,
      issuerId: row.issuer_id,
      docType: row.doc_type,
      nextValue: Number(row.next_value),
      displayPattern: row.display_pattern,
      isTest: Number(row.is_test)
    })),
    realReferences: state.realReferences.map((row) => ({ id: row.id, supersedesId: row.supersedes_id, supersededById: row.superseded_by_id }))
  });
}

async function collectState(env) {
  const store = dbFromEnv(env);
  const storage = await inspectDocumentsStoragePreflight(env);
  const [documents, revisionSequences, rootSequences, realReferences, eventCount, sourceCount] = await Promise.all([
    all(store, `SELECT id, doc_type, issuer_id, status, series_key, number, display_number,
      supersedes_id, superseded_by_id, pdf_r2_key, html_r2_key
      FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE} ORDER BY id`),
    all(store, `SELECT series_key, issuer_id, doc_type, next_value, display_pattern, is_test
      FROM doc_sequences WHERE ${REVISION_SEQUENCE_PREDICATE} ORDER BY series_key`),
    all(store, `SELECT series_key, issuer_id, doc_type, next_value, display_pattern, is_test
      FROM doc_sequences WHERE series_key IN ('test:CC', 'test:INV') ORDER BY series_key`),
    all(store, `SELECT id, supersedes_id, superseded_by_id FROM doc_documents
      WHERE NOT ${TEST_DOCUMENT_PREDICATE}
        AND (
          supersedes_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})
          OR superseded_by_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})
        )
      ORDER BY id`),
    scalarCount(store, `SELECT COUNT(*) AS count FROM doc_document_events
      WHERE document_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})`),
    scalarCount(store, `SELECT COUNT(*) AS count FROM doc_document_sources
      WHERE document_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})`)
  ]);

  const artifactKeys = Array.from(new Set(documents.flatMap((row) => [row.pdf_r2_key, row.html_r2_key]).filter(Boolean))).sort();
  const blockers = [];

  if (!storage?.ready) blockers.push({ area: "storage", reason: "documents_storage_not_ready" });

  for (const row of documents) {
    const expectedSeries = expectedSeriesForType(row.doc_type);
    if (row.issuer_id !== "test") {
      blockers.push({ area: "document", id: row.id, reason: "test_series_non_test_issuer" });
      continue;
    }
    if (!expectedSeries) {
      blockers.push({ area: "document", id: row.id, reason: "unsupported_test_document_type" });
      continue;
    }
    if (row.series_key && row.series_key !== expectedSeries) {
      blockers.push({ area: "document", id: row.id, reason: "unexpected_test_series_key" });
    }
    if (row.status !== "draft" && row.series_key !== expectedSeries) {
      blockers.push({ area: "document", id: row.id, reason: "issued_test_document_without_test_series" });
    }
  }

  if (realReferences.length) blockers.push({ area: "document_links", reason: "real_document_references_test_document", count: realReferences.length });

  const rootsByKey = new Map(rootSequences.map((row) => [row.series_key, row]));
  for (const [seriesKey, expected] of Object.entries(ROOT_TEST_SERIES)) {
    const row = rootsByKey.get(seriesKey);
    if (!row) {
      blockers.push({ area: "sequence", seriesKey, reason: "test_root_sequence_missing" });
      continue;
    }
    if (
      row.issuer_id !== expected.issuerId
      || row.doc_type !== expected.docType
      || row.display_pattern !== expected.displayPattern
      || Number(row.is_test) !== 1
    ) {
      blockers.push({ area: "sequence", seriesKey, reason: "test_root_sequence_not_canonical" });
    }
  }

  for (const row of revisionSequences) {
    if (row.issuer_id !== "test" || Number(row.is_test) !== 1) {
      blockers.push({ area: "sequence", seriesKey: row.series_key, reason: "test_revision_sequence_not_canonical" });
    }
  }

  const state = {
    storage,
    documents,
    revisionSequences,
    rootSequences,
    realReferences,
    eventCount,
    sourceCount,
    artifactKeys,
    blockers
  };
  state.fingerprint = await sha256Hex(canonicalState(state));
  return state;
}

function publicSummary(state) {
  const statuses = { draft: 0, finalized: 0, void: 0 };
  const types = { cc: 0, invoice: 0, other: 0 };
  for (const row of state.documents) {
    if (Object.hasOwn(statuses, row.status)) statuses[row.status] += 1;
    if (row.doc_type === "cc" || row.doc_type === "invoice") types[row.doc_type] += 1;
    else types.other += 1;
  }
  return {
    ok: true,
    ready: state.blockers.length === 0,
    fingerprint: state.fingerprint,
    counts: {
      documents: state.documents.length,
      drafts: statuses.draft,
      finalized: statuses.finalized,
      void: statuses.void,
      cc: types.cc,
      invoice: types.invoice,
      other: types.other,
      events: state.eventCount,
      sources: state.sourceCount,
      privateArtifacts: state.artifactKeys.length,
      revisionSequences: state.revisionSequences.length
    },
    testSequences: state.rootSequences.map((row) => ({
      seriesKey: row.series_key,
      nextValue: Number(row.next_value),
      displayPattern: row.display_pattern
    })),
    blockers: state.blockers,
    note: state.blockers.length
      ? "TEST cleanup is blocked until every selected record is proven TEST-only."
      : "Dry-run only. No data has been changed. Purge requires exact confirmation and this state fingerprint."
  };
}

export async function inspectDocumentsTestDataPurge(env) {
  return publicSummary(await collectState(env));
}

export async function purgeDocumentsTestData(env, {
  confirmation,
  fingerprint,
  now = () => new Date().toISOString()
} = {}) {
  if (confirmation !== DOCUMENTS_TEST_PURGE_CONFIRMATION) throw new Error("explicit_test_purge_confirmation_required");
  const state = await collectState(env);
  if (state.blockers.length) throw new Error("test_purge_not_ready");
  if (!fingerprint || fingerprint !== state.fingerprint) throw new Error("test_purge_preflight_changed");

  const bucket = bucketFromEnv(env);
  try {
    for (const key of state.artifactKeys) await bucket.delete(key);
  } catch {
    throw new Error("test_purge_r2_delete_failed");
  }

  const store = dbFromEnv(env);
  const at = String(now());
  const statements = [
    store.prepare("DROP TRIGGER IF EXISTS doc_events_no_delete"),
    store.prepare("DROP TRIGGER IF EXISTS doc_no_delete_issued"),
    store.prepare(`DELETE FROM doc_document_events
      WHERE document_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})`),
    store.prepare(`DELETE FROM doc_document_sources
      WHERE document_id IN (SELECT id FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE})`),
    store.prepare(`DELETE FROM doc_documents WHERE ${TEST_DOCUMENT_PREDICATE}`),
    store.prepare(`DELETE FROM doc_sequences WHERE ${REVISION_SEQUENCE_PREDICATE}`),
    store.prepare(`UPDATE doc_sequences SET next_value = 1, updated_at = ?, bootstrap_note = ?
      WHERE series_key = 'test:CC' AND issuer_id = 'test' AND doc_type = 'cc'
        AND display_pattern = 'TEST-CC {n}' AND is_test = 1`)
      .bind(at, "reset after owner-authorized TEST data purge"),
    store.prepare(`UPDATE doc_sequences SET next_value = 1, updated_at = ?, bootstrap_note = ?
      WHERE series_key = 'test:INV' AND issuer_id = 'test' AND doc_type = 'invoice'
        AND display_pattern = 'TEST-INV {n:04}' AND is_test = 1`)
      .bind(at, "reset after owner-authorized TEST data purge"),
    store.prepare(triggerSql("doc_no_delete_issued")),
    store.prepare(triggerSql("doc_events_no_delete"))
  ];
  await store.batch(statements);

  const post = await collectState(env);
  const rootsReady = post.rootSequences.length === 2 && post.rootSequences.every((row) => Number(row.next_value) === 1);
  if (
    post.documents.length !== 0
    || post.eventCount !== 0
    || post.sourceCount !== 0
    || post.revisionSequences.length !== 0
    || !rootsReady
    || post.blockers.length !== 0
  ) {
    throw new Error("test_purge_postflight_failed");
  }

  return {
    ok: true,
    purged: true,
    counts: publicSummary(state).counts,
    testSequencesResetTo: 1,
    postflight: publicSummary(post)
  };
}

export function documentsTestDataPurgePolicy() {
  return Object.freeze({
    adminOnly: true,
    dryRunRequired: true,
    exactConfirmation: DOCUMENTS_TEST_PURGE_CONFIRMATION,
    fingerprintRequired: true,
    deletesRealDocuments: false,
    deletesRealSequences: false,
    deletesIssuerProfiles: false,
    deletesSignatureAssets: false,
    resetsTestSequencesToOne: true
  });
}
