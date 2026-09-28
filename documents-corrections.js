import { canonicalJson } from "./documents-domain.js";
import { readDocument } from "./documents-storage.js";
import {
  requireRevisionSeries,
  revisionCodeFromIndex,
  revisionDisplayNumber
} from "./documents-revisions.js";

const MAX_CHAIN_DEPTH = 64;

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
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
  if (chain.length >= MAX_CHAIN_DEPTH && chain.at(-1)?.number == null) throw new Error("revision_chain_too_deep");
  const root = chain.at(-1);
  const number = Number(root?.number);
  if (!root?.series_key || !root?.display_number || !Number.isSafeInteger(number) || number < 1) {
    throw new Error("revision_root_not_numbered");
  }
  const environment = await requireRevisionSeries(env, root);
  const nextIndex = chain.length;
  const nextRevisionCode = revisionCodeFromIndex(nextIndex);
  return {
    root,
    testOnly: environment.testOnly,
    nextIndex,
    nextRevisionCode,
    nextDisplayNumber: revisionDisplayNumber(root.display_number, nextRevisionCode)
  };
}

export async function readCorrectionInfo(env, documentId) {
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
      testOnly: row.issuer_id === "test",
      production: row.issuer_id !== "test"
    };
    const source = await readDocument(env, row.supersedes_id);
    if (!source) throw new Error("revision_source_not_found");
    const environment = await requireRevisionSeries(env, source);
    return {
      ok: true,
      documentId: row.id,
      status: row.status,
      correctionDraft: true,
      supersedesDocumentId: row.supersedes_id,
      supersedesDisplayNumber: source.display_number || null,
      canCorrect: false,
      testOnly: environment.testOnly,
      production: !environment.testOnly
    };
  }

  if (!["finalized", "void"].includes(row.status)) throw new Error("correction_source_not_issued");
  const environment = await requireRevisionSeries(env, row);
  const root = await revisionRootInfo(env, row);
  if (environment.testOnly !== root.testOnly) throw new Error("sequence_environment_mismatch");
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
    testOnly: environment.testOnly,
    production: !environment.testOnly
  };
}

export async function readTestCorrectionInfo(env, documentId) {
  const result = await readCorrectionInfo(env, documentId);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

export async function createCorrectionDraft(env, {
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
  const environment = await requireRevisionSeries(env, source);

  const existing = await readOpenDraft(env, source.id);
  if (existing) {
    return {
      ok: true,
      idempotent: true,
      documentId: existing.id,
      supersedesDocumentId: source.id,
      testOnly: environment.testOnly,
      production: !environment.testOnly
    };
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

  return {
    ok: true,
    idempotent: false,
    documentId,
    supersedesDocumentId: source.id,
    testOnly: environment.testOnly,
    production: !environment.testOnly
  };
}

export async function createTestCorrectionDraft(env, options = {}) {
  const result = await createCorrectionDraft(env, options);
  if (!result.testOnly) throw new Error("real_document_series_disabled");
  return result;
}

export function documentsCorrectionPolicy() {
  return Object.freeze({
    testSeriesOnly: false,
    testSeriesEnabled: true,
    realSeriesEnabled: true,
    canonicalSeriesIdentityRequired: true,
    sourceImmutable: true,
    correctionClonesFrozenDraft: true,
    oneOpenCorrectionPerSource: true,
    correctionFromLatestOnly: true,
    nextBaseSequenceUnaffected: true
  });
}
