import { canonicalJson } from "./documents-domain.js";
import { readDocument, readDocumentSequence } from "./documents-storage.js";
import { revisionCodeFromIndex, revisionDisplayNumber } from "./documents-revisions.js";

const MAX_CHAIN_DEPTH = 64;

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

async function requireTestSeries(env, seriesKey) {
  const sequence = await readDocumentSequence(env, seriesKey);
  if (!sequence) throw new Error("document_sequence_not_found");
  if (Number(sequence.is_test) !== 1) throw new Error("real_document_series_disabled");
  return sequence;
}

async function readOpenDraft(env, sourceId) {
  return dbFromEnv(env).prepare(`SELECT * FROM doc_documents
    WHERE supersedes_id = ? AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1`).bind(sourceId).first();
}

async function revisionRootInfo(env, source) {
  const chain = [];
  let cursor = source;
  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
    chain.push(cursor);
    if (cursor.number != null) break;
    if (!cursor.supersedes_id) throw new Error("revision_root_not_found");
    cursor = await readDocument(env, cursor.supersedes_id);
    if (!cursor) throw new Error("revision_root_not_found");
  }
  const root = chain.at(-1);
  const number = Number(root?.number);
  if (!root?.series_key || !root?.display_number || !Number.isSafeInteger(number) || number < 1) {
    throw new Error("revision_root_not_numbered");
  }
  await requireTestSeries(env, root.series_key);
  const nextIndex = chain.length;
  const nextRevisionCode = revisionCodeFromIndex(nextIndex);
  return {
    root,
    nextIndex,
    nextRevisionCode,
    nextDisplayNumber: revisionDisplayNumber(root.display_number, nextRevisionCode)
  };
}

export async function readTestCorrectionInfo(env, documentId) {
  const row = await readDocument(env, text(documentId, 160));
  if (!row) throw new Error("document_not_found");

  if (row.status === "draft") {
    if (!row.supersedes_id) return {
      ok: true,
      documentId: row.id,
      status: row.status,
      correctionDraft: false,
      supersedesDocumentId: null,
      canCorrect: false,
      testOnly: true
    };
    const source = await readDocument(env, row.supersedes_id);
    return {
      ok: true,
      documentId: row.id,
      status: row.status,
      correctionDraft: true,
      supersedesDocumentId: row.supersedes_id,
      supersedesDisplayNumber: source?.display_number || null,
      canCorrect: false,
      testOnly: true
    };
  }

  if (!["finalized", "void"].includes(row.status)) throw new Error("correction_source_not_issued");
  if (!row.series_key) throw new Error("document_sequence_not_found");
  await requireTestSeries(env, row.series_key);
  const root = await revisionRootInfo(env, row);
  const openDraft = row.superseded_by_id ? null : await readOpenDraft(env, row.id);
  return {
    ok: true,
    documentId: row.id,
    status: row.status,
    displayNumber: row.display_number || null,
    supersedesDocumentId: row.supersedes_id || null,
    supersededByDocumentId: row.superseded_by_id || null,
    canCorrect: !row.superseded_by_id,
    openCorrectionDraftId: openDraft?.id || null,
    nextRevisionCode: root.nextRevisionCode,
    nextDisplayNumber: root.nextDisplayNumber,
    testOnly: true
  };
}

export async function createTestCorrectionDraft(env, {
  sourceDocumentId,
  actorEmail = "",
  now = () => new Date().toISOString()
} = {}) {
  const actor = text(actorEmail).toLowerCase();
  if (!actor || !actor.includes("@")) throw new Error("actor_email_required");
  const source = await readDocument(env, text(sourceDocumentId, 160));
  if (!source) throw new Error("document_not_found");
  if (!["finalized", "void"].includes(source.status)) throw new Error("correction_source_not_issued");
  if (source.superseded_by_id) throw new Error("document_already_superseded");
  if (!source.series_key) throw new Error("document_sequence_not_found");
  await requireTestSeries(env, source.series_key);

  const existing = await readOpenDraft(env, source.id);
  if (existing) {
    return { ok: true, idempotent: true, documentId: existing.id, supersedesDocumentId: source.id, testOnly: true };
  }

  const store = dbFromEnv(env);
  if (typeof store.batch !== "function") throw new Error("documents_storage_batch_required");
  const documentId = `doc-${crypto.randomUUID()}`;
  const at = text(now(), 80);
  await store.batch([
    store.prepare(`INSERT INTO doc_documents (
      id, kind_id, doc_type, issuer_id, client_id, status, origin,
      client_name, client_tax_id, project_label, po_numbers, currency,
      total_minor, issue_date, issue_year, draft_json, draft_rev, supersedes_id,
      pdf_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', 'system', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'none', ?, ?)`)
      .bind(
        documentId,
        source.kind_id,
        source.doc_type,
        source.issuer_id,
        source.client_id || null,
        source.client_name || "",
        source.client_tax_id || "",
        source.project_label || "",
        source.po_numbers || "",
        source.currency,
        Number(source.total_minor || 0),
        source.issue_date || null,
        source.issue_year == null ? null : Number(source.issue_year),
        source.draft_json || "{}",
        source.id,
        at,
        at
      ),
    store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      VALUES (?, 'draft_created', ?, ?, ?)`)
      .bind(documentId, actor, at, canonicalJson({ kindId: source.kind_id, correctionOf: source.id })),
    store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      VALUES (?, 'correction_draft_created', ?, ?, ?)`)
      .bind(source.id, actor, at, canonicalJson({ correctionDraftId: documentId }))
  ]);

  return { ok: true, idempotent: false, documentId, supersedesDocumentId: source.id, testOnly: true };
}

export function documentsCorrectionPolicy() {
  return Object.freeze({
    testSeriesOnly: true,
    sourceImmutable: true,
    correctionClonesFrozenDraft: true,
    oneOpenCorrectionPerSource: true,
    correctionFromLatestOnly: true,
    nextBaseSequenceUnaffected: true
  });
}
