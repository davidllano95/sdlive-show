import {
  buildDraftPreview,
  createDraftDocument,
  listDraftRegistry,
  readDraftDocument,
  saveDraftDocument
} from "./documents-drafts.js";

const API_PREFIX = "/api/admin/documents";
const MAX_BODY_BYTES = 72 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function pathOf(request) {
  try {
    const path = new URL(request.url).pathname;
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  } catch { return ""; }
}

async function actor(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  return verifyAdmin(request, env).catch(() => null);
}

async function readJson(request) {
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) throw Object.assign(new Error("application_json_required"), { status: 415 });
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw Object.assign(new Error("request_too_large"), { status: 413 });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw Object.assign(new Error("request_too_large"), { status: 413 });
  try {
    const parsed = JSON.parse(body || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("body_must_be_object");
    return parsed;
  } catch (error) {
    if (error?.message === "body_must_be_object") throw Object.assign(error, { status: 400 });
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

function publicError(error) {
  const code = String(error?.message || error || "documents_request_failed");
  const statusByCode = {
    application_json_required: 415,
    request_too_large: 413,
    invalid_json: 400,
    body_must_be_object: 400,
    document_payload_required: 400,
    draft_payload_required: 400,
    draft_too_large: 413,
    invalid_document_id: 400,
    invalid_issuer_id: 400,
    invalid_client_id: 400,
    issuer_not_found: 409,
    client_not_found: 409,
    unsupported_currency: 400,
    unknown_document_kind: 400,
    invalid_draft_revision: 400,
    stale_draft_revision: 409,
    document_not_found: 404,
    document_not_draft: 409,
    document_total_overflow: 400,
    documents_storage_unavailable: 503
  };
  return { status: Number(error?.status) || statusByCode[code] || 500, error: statusByCode[code] ? code : "documents_request_failed" };
}

export async function handleDocumentsEditorApi(request, env, { verifyAdmin } = {}) {
  const path = pathOf(request);
  if (!path.startsWith(`${API_PREFIX}/`)) return null;
  const isEditorRoute = path === `${API_PREFIX}/registry` || path === `${API_PREFIX}/drafts` || /^\/api\/admin\/documents\/doc-[A-Za-z0-9-]+(?:\/preview)?$/.test(path);
  if (!isEditorRoute) return null;

  const user = await actor(request, env, verifyAdmin);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    if (path === `${API_PREFIX}/registry` && request.method === "GET") {
      return json({ ok: true, documents: await listDraftRegistry(env), actor: user.email });
    }
    if (path === `${API_PREFIX}/drafts` && request.method === "POST") {
      const document = await createDraftDocument(env, await readJson(request), { actorEmail: user.email });
      return json({ ok: true, document }, 201);
    }

    const previewMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/preview$/);
    if (previewMatch && request.method === "GET") {
      const preview = await buildDraftPreview(env, previewMatch[1]);
      return json(preview);
    }

    const documentMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)$/);
    if (documentMatch && request.method === "GET") {
      const document = await readDraftDocument(env, documentMatch[1]);
      if (!document) throw new Error("document_not_found");
      return json({ ok: true, document });
    }
    if (documentMatch && request.method === "PUT") {
      const document = await saveDraftDocument(env, documentMatch[1], await readJson(request), { actorEmail: user.email });
      return json({ ok: true, document });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[SD.Live] Documents editor API failed", error);
    const exposed = publicError(error);
    return json({ ok: false, error: exposed.error }, exposed.status);
  }
}

export function documentsEditorApiPolicy() {
  return Object.freeze({
    adminOnly: true,
    draftsConsumeNumbers: false,
    previewReturnsSignatureBytes: false,
    maxBodyBytes: MAX_BODY_BYTES,
    optimisticConcurrency: "draftRev"
  });
}
