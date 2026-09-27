import { canonicalJson } from "./documents-domain.js";

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function dbFromEnv(env) {
  const db = env?.DOCS_DB;
  if (!db || typeof db.prepare !== "function") throw new Error("documents_storage_unavailable");
  return db;
}

function actor(value) {
  return text(value, 240).toLowerCase();
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

export async function deleteDocumentDraftRow(env, {
  documentId,
  actorEmail = "",
  at = new Date().toISOString()
} = {}) {
  const store = dbFromEnv(env);
  const id = text(documentId, 120);
  const current = await store.prepare("SELECT id, status, draft_rev, kind_id FROM doc_documents WHERE id = ? LIMIT 1").bind(id).first();
  if (!current) throw new Error("document_not_found");
  if (String(current.status) !== "draft") throw new Error("document_not_draft");
  if (typeof store.batch !== "function") throw new Error("documents_storage_batch_required");

  const when = text(at, 80);
  let results;
  try {
    results = await store.batch([
      store.prepare("DELETE FROM doc_documents WHERE id = ? AND status = 'draft'").bind(id),
      store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
        VALUES (?, CASE WHEN changes() = 1 THEN 'draft_deleted' ELSE NULL END, ?, ?, ?)`)
        .bind(id, actor(actorEmail), when, canonicalJson({
          draftRev: Number(current.draft_rev || 0),
          kindId: String(current.kind_id || "")
        }))
    ]);
  } catch (error) {
    const after = await store.prepare("SELECT status FROM doc_documents WHERE id = ? LIMIT 1").bind(id).first().catch(() => null);
    if (after && String(after.status) !== "draft") throw new Error("document_not_draft");
    throw error;
  }

  if (changes(results?.[0]) !== 1) throw new Error("document_not_draft");
  return { id, deleted: true };
}

export function documentsDeleteStoragePolicy() {
  return Object.freeze({
    draftsOnly: true,
    issuedDeleteBlockedBySchemaTrigger: true,
    deleteEventRetained: true,
    consumesNumber: false
  });
}
