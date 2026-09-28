import {
  buildDraftPreview,
  createDraftDocument,
  listDraftRegistry,
  readDraftDocument,
  saveDraftDocument
} from "./documents-drafts.js";
import {
  buildFinalizePreview,
  finalizeThroughSeries
} from "./documents-finalize-gate.js";
import { downloadFinalPdf, generateFinalPdf } from "./documents-pdf-artifacts.js";
import { deleteDocumentDraftRow } from "./documents-storage-delete.js";
import {
  createCorrectionDraft,
  readCorrectionInfo
} from "./documents-corrections.js";

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

function requireFinalizeBody(body) {
  const keys = Object.keys(body).sort();
  if (keys.length !== 2 || keys[0] !== "draftRev" || keys[1] !== "finalizeKey") {
    throw Object.assign(new Error("invalid_finalize_body"), { status: 400 });
  }
  return body;
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
    invalid_general_amount_minor: 400,
    invalid_finalize_body: 400,
    invalid_finalize_key: 400,
    invalid_draft_revision: 400,
    invalid_revision_index: 409,
    invalid_revision_base: 409,
    invalid_revision_display: 409,
    invalid_revision_sequence_state: 409,
    issuer_not_found: 409,
    client_not_found: 409,
    unsupported_currency: 400,
    unsupported_document_type: 400,
    unknown_document_kind: 400,
    unsupported_final_template: 409,
    stale_draft_revision: 409,
    document_not_found: 404,
    document_not_draft: 409,
    document_not_finalized: 409,
    document_snapshot_missing: 409,
    snapshot_hash_mismatch: 409,
    correction_source_not_issued: 409,
    document_already_superseded: 409,
    revision_draft_required: 409,
    revision_source_required: 409,
    revision_source_not_found: 409,
    revision_root_not_found: 409,
    revision_root_not_numbered: 409,
    revision_chain_too_deep: 409,
    revision_series_mismatch: 409,
    revision_sequence_conflict: 409,
    supersede_commit_not_observed: 409,
    document_total_overflow: 400,
    document_sequence_not_found: 409,
    invalid_sequence_state: 409,
    sequence_issuer_mismatch: 409,
    sequence_document_type_mismatch: 409,
    sequence_environment_mismatch: 409,
    sequence_display_pattern_mismatch: 409,
    production_series_issuer_not_supported: 409,
    test_series_issuer_mismatch: 409,
    real_document_series_disabled: 409,
    finalize_key_already_used: 409,
    document_finalize_conflict: 409,
    finalize_commit_not_observed: 409,
    pdf_not_pending: 409,
    pdf_not_ready: 409,
    pdf_object_missing: 409,
    pdf_hash_mismatch: 409,
    signature_snapshot_mismatch: 409,
    signature_object_missing: 409,
    signature_hash_mismatch: 409,
    unsupported_signature_content_type: 409,
    signature_bytes_required: 409,
    issue_date_required: 422,
    issue_city_required: 422,
    issuer_required: 422,
    issuer_mismatch: 422,
    issuer_id_number_required: 422,
    client_required: 422,
    client_tax_id_required: 422,
    uses_costs_deductions_required: 422,
    active_signature_required: 422,
    at_least_one_line_required: 422,
    line_description_required: 422,
    line_quantity_must_be_non_negative_integer: 422,
    line_amount_required: 422,
    line_amount_mismatch: 422,
    invalid_original_currency: 422,
    invalid_original_amount_minor: 422,
    negative_original_amount_not_supported: 422,
    invalid_exchange_rate: 422,
    draft_currency_mismatch: 422,
    document_kind_type_mismatch: 422,
    documents_storage_unavailable: 503,
    documents_storage_batch_required: 503,
    documents_bucket_unavailable: 503,
    documents_browser_unavailable: 503,
    documents_assets_unavailable: 503,
    documents_logo_asset_missing: 502,
    browser_pdf_failed: 502,
    invalid_pdf_response: 502
  };
  return { status: Number(error?.status) || statusByCode[code] || 500, error: statusByCode[code] ? code : "documents_request_failed" };
}

export async function handleDocumentsEditorApi(request, env, { verifyAdmin, finalizeGate = {}, artifactGate = {} } = {}) {
  const path = pathOf(request);
  if (!path.startsWith(`${API_PREFIX}/`)) return null;
  const isEditorRoute = path === `${API_PREFIX}/registry`
    || path === `${API_PREFIX}/drafts`
    || /^\/api\/admin\/documents\/doc-[A-Za-z0-9-]+(?:\/(?:preview|finalize-preview|finalize|pdf|correction-info|corrections))?$/.test(path);
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

    const correctionInfoMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/correction-info$/);
    if (correctionInfoMatch && request.method === "GET") {
      return json(await readCorrectionInfo(env, correctionInfoMatch[1]));
    }

    const correctionMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/corrections$/);
    if (correctionMatch && request.method === "POST") {
      return json(await createCorrectionDraft(env, {
        sourceDocumentId: correctionMatch[1],
        actorEmail: user.email
      }), 201);
    }

    const finalizePreviewMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/finalize-preview$/);
    if (finalizePreviewMatch && request.method === "GET") {
      const draftRev = new URL(request.url).searchParams.get("draftRev");
      return json(await buildFinalizePreview(env, {
        documentId: finalizePreviewMatch[1],
        draftRev
      }, finalizeGate));
    }

    const finalizeMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/finalize$/);
    if (finalizeMatch && request.method === "POST") {
      const body = requireFinalizeBody(await readJson(request));
      const result = await finalizeThroughSeries(env, {
        documentId: finalizeMatch[1],
        draftRev: body.draftRev,
        finalizeKey: body.finalizeKey,
        actorEmail: user.email
      }, finalizeGate);
      let pdf;
      try {
        pdf = await generateFinalPdf(env, { documentId: finalizeMatch[1], actorEmail: user.email }, artifactGate);
      } catch (error) {
        const exposed = publicError(error);
        pdf = {
          ok: false,
          pdfStatus: "failed",
          error: exposed.error,
          retryPath: `${API_PREFIX}/${finalizeMatch[1]}/pdf`,
          testOnly: result.testOnly === true
        };
      }
      return json({ ...result, pdfEnabled: true, pdf });
    }

    const pdfMatch = path.match(/^\/api\/admin\/documents\/(doc-[A-Za-z0-9-]+)\/pdf$/);
    if (pdfMatch && request.method === "POST") {
      return json(await generateFinalPdf(env, { documentId: pdfMatch[1], actorEmail: user.email }, artifactGate));
    }
    if (pdfMatch && request.method === "GET") {
      return downloadFinalPdf(env, { documentId: pdfMatch[1] }, artifactGate);
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
    if (documentMatch && request.method === "DELETE") {
      const result = await deleteDocumentDraftRow(env, {
        documentId: documentMatch[1],
        actorEmail: user.email
      });
      return json({ ok: true, ...result });
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
    optimisticConcurrency: "draftRev",
    finalizeRequiresExactDraftRev: true,
    finalizeRequiresUuidKey: true,
    finalizeTestSeriesOnly: false,
    testSeriesFinalizeEnabled: true,
    realSeriesFinalizeEnabled: true,
    correctionRevisionsEnabled: true,
    correctionTestSeriesOnly: false,
    correctionTestSeriesEnabled: true,
    correctionRealSeriesEnabled: true,
    correctionConsumesBaseSequence: false,
    finalizeRendersPdf: true,
    pdfRetryEndpoint: true,
    pdfDownloadAuthenticated: true,
    pdfTestSeriesOnly: false,
    pdfRealSeriesEnabled: true,
    draftDeleteOnly: true,
    issuedDeleteBlockedBySchemaTrigger: true
  });
}
