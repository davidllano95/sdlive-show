import { canonicalJson } from "./documents-domain.js";
import { readDocument, readDocumentSequence } from "./documents-storage.js";
import { renderCuentaDeCobro } from "./documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "./documents-templates/invoice-intl-en.v1.js";

const PDF_CONTENT_TYPE = "application/pdf";
const LOGO_PATH = "/assets/logos/sd-live-header-normal-symbol.png";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function db(env) {
  const value = env?.DOCS_DB;
  if (!value || typeof value.prepare !== "function") throw new Error("documents_storage_unavailable");
  return value;
}

function bucket(env) {
  const value = env?.DOCS_BUCKET;
  if (!value || typeof value.get !== "function" || typeof value.put !== "function") throw new Error("documents_bucket_unavailable");
  return value;
}

function browser(env) {
  const value = env?.BROWSER;
  if (!value || typeof value.quickAction !== "function") throw new Error("documents_browser_unavailable");
  return value;
}

function parseSnapshot(row) {
  if (!row?.snapshot_json || !row?.snapshot_sha256) throw new Error("document_snapshot_missing");
  try {
    return JSON.parse(row.snapshot_json);
  } catch {
    throw new Error("invalid_persisted_document_json");
  }
}

async function sha256HexBytes(bytes) {
  const value = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256HexText(value) {
  return sha256HexBytes(new TextEncoder().encode(String(value)));
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function primaryAddress(issuer) {
  const first = Array.isArray(issuer?.addresses) ? issuer.addresses[0] : null;
  return typeof first === "string" ? first : text(first?.text);
}

function servicePeriodLabel(period) {
  if (!period || typeof period !== "object") return "";
  const start = text(period.start);
  const end = text(period.end);
  return start && end ? `${start} – ${end}` : (start || end);
}

export function finalSnapshotToRendererView(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("document_snapshot_missing");
  const issuer = snapshot.issuer || {};
  return {
    kindId: snapshot.kind?.id || "",
    currency: snapshot.currency || "",
    number: snapshot.number || null,
    issueCity: snapshot.issue?.city || "",
    issueDate: snapshot.issue?.date || "",
    dueDate: snapshot.issue?.dueDate || "",
    terms: snapshot.issue?.terms || "",
    projectLabel: snapshot.project?.label || "",
    servicePeriodLabel: servicePeriodLabel(snapshot.project?.servicePeriod),
    purchaseOrder: snapshot.purchaseOrder || "",
    itemize: snapshot.pricing?.itemize !== false,
    generalAmountMinor: snapshot.pricing?.generalAmountMinor ?? null,
    lines: Array.isArray(snapshot.lines) ? snapshot.lines : [],
    totalMinor: Number(snapshot.totals?.totalMinor || 0),
    amountInWords: snapshot.totals?.amountInWords || "",
    usesCostsDeductions: Boolean(snapshot.legal?.usesCostsDeductions),
    legalBlockVersion: snapshot.legal?.blockVersion || "",
    showBankDetails: snapshot.payment?.showBankDetails !== false,
    bankDetails: snapshot.payment?.bankDetails || {},
    notes: snapshot.notes || "",
    issuer: { ...issuer, address: primaryAddress(issuer) },
    client: snapshot.client || {}
  };
}

export function renderFinalDocumentHtml(snapshot, signatureDataUri) {
  if (!signatureDataUri) throw new Error("signature_bytes_required");
  const view = finalSnapshotToRendererView(snapshot);
  const kindId = snapshot.kind?.id;
  const templateVersion = snapshot.kind?.templateVersion;
  if (kindId === "cc-co-es" && templateVersion === "cc-co-es@1") {
    return renderCuentaDeCobro(view, { mode: "final", signatureDataUri });
  }
  if (kindId === "invoice-intl-en" && templateVersion === "invoice-intl-en@1") {
    return renderInvoice(view, { mode: "final", signatureDataUri });
  }
  throw new Error("unsupported_final_template");
}

async function requireTestFinalizedDocument(env, documentId, { readDocumentFn = readDocument, readSequenceFn = readDocumentSequence } = {}) {
  const row = await readDocumentFn(env, text(documentId));
  if (!row) throw new Error("document_not_found");
  if (!["finalized", "void"].includes(row.status)) throw new Error("document_not_finalized");
  if (!row.series_key) throw new Error("document_sequence_not_found");
  const sequence = await readSequenceFn(env, row.series_key);
  if (!sequence) throw new Error("document_sequence_not_found");
  if (Number(sequence.is_test) !== 1) throw new Error("real_document_series_disabled");
  return row;
}

async function readSignaturePrivate(env, snapshot) {
  const signature = snapshot.signature;
  if (!signature?.id || !signature?.sha256) throw new Error("active_signature_required");
  const issuerId = text(snapshot.issuer?.id);
  const row = await db(env).prepare(`SELECT id, issuer_id, r2_key, content_type, sha256
    FROM doc_signature_assets WHERE id = ? LIMIT 1`).bind(signature.id).first();
  if (!row || row.issuer_id !== issuerId || row.sha256 !== signature.sha256) throw new Error("signature_snapshot_mismatch");
  if (!["image/png", "image/svg+xml"].includes(row.content_type)) throw new Error("unsupported_signature_content_type");
  const object = await bucket(env).get(row.r2_key);
  if (!object || typeof object.arrayBuffer !== "function") throw new Error("signature_object_missing");
  const bytes = await object.arrayBuffer();
  const hash = await sha256HexBytes(bytes);
  if (hash !== signature.sha256) throw new Error("signature_hash_mismatch");
  return `data:${row.content_type};base64,${arrayBufferToBase64(bytes)}`;
}

async function inlineLogoAsset(env, html) {
  if (!html.includes(LOGO_PATH)) return html;
  const assets = env?.ASSETS;
  if (!assets || typeof assets.fetch !== "function") throw new Error("documents_assets_unavailable");
  const response = await assets.fetch(new Request(`https://sdlive.show${LOGO_PATH}`));
  if (!response.ok) throw new Error("documents_logo_asset_missing");
  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = await response.arrayBuffer();
  const dataUri = `data:${contentType};base64,${arrayBufferToBase64(bytes)}`;
  return html.replaceAll(LOGO_PATH, dataUri);
}

async function renderPdfWithBrowser(env, html, pageSize) {
  const response = await browser(env).quickAction("pdf", {
    html,
    pdfOptions: {
      format: String(pageSize || "Letter").toLowerCase(),
      printBackground: true,
      preferCSSPageSize: true
    }
  });
  if (!response?.ok) throw new Error("browser_pdf_failed");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("invalid_pdf_response");
  return bytes;
}

function artifactKey(row, pdfSha256) {
  const issuer = text(row.issuer_id).replace(/[^A-Za-z0-9_-]/g, "-");
  const type = text(row.doc_type).replace(/[^A-Za-z0-9_-]/g, "-");
  return `final/${issuer}/${type}/${row.id}/${row.snapshot_sha256}/${pdfSha256}.pdf`;
}

async function markPdfReady(env, row, { key, sha256, actorEmail, at }) {
  const store = db(env);
  await store.batch([
    store.prepare(`UPDATE doc_documents
      SET pdf_status = 'ready', pdf_r2_key = ?, pdf_sha256 = ?, updated_at = ?
      WHERE id = ? AND snapshot_sha256 = ? AND status IN ('finalized', 'void')
        AND pdf_status IN ('pending', 'failed')`)
      .bind(key, sha256, at, row.id, row.snapshot_sha256),
    store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      SELECT ?, 'pdf_ready', ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM doc_documents
        WHERE id = ? AND snapshot_sha256 = ? AND pdf_status = 'ready' AND pdf_sha256 = ?
      )`)
      .bind(row.id, text(actorEmail).toLowerCase(), at, canonicalJson({ pdfSha256: sha256 }), row.id, row.snapshot_sha256, sha256)
  ]);
}

async function markPdfFailed(env, row, { actorEmail, at, reason }) {
  const store = db(env);
  const detail = canonicalJson({ reason: text(reason).slice(0, 120) });
  await store.batch([
    store.prepare(`UPDATE doc_documents
      SET pdf_status = 'failed', updated_at = ?
      WHERE id = ? AND snapshot_sha256 = ? AND status IN ('finalized', 'void')
        AND pdf_status IN ('pending', 'failed')`)
      .bind(at, row.id, row.snapshot_sha256),
    store.prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      SELECT ?, 'pdf_failed', ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM doc_documents
        WHERE id = ? AND snapshot_sha256 = ? AND pdf_status = 'failed'
      )`)
      .bind(row.id, text(actorEmail).toLowerCase(), at, detail, row.id, row.snapshot_sha256)
  ]).catch(() => {});
}

async function verifySnapshotIntegrity(row, snapshot) {
  const hash = await sha256HexText(canonicalJson(snapshot));
  if (hash !== row.snapshot_sha256) throw new Error("snapshot_hash_mismatch");
}

export async function generateFinalPdf(env, {
  documentId,
  actorEmail,
  now = () => new Date().toISOString()
} = {}, overrides = {}) {
  const row = await requireTestFinalizedDocument(env, documentId, overrides);
  if (row.pdf_status === "ready" && row.pdf_sha256 && row.pdf_r2_key) {
    return {
      ok: true,
      documentId: row.id,
      pdfStatus: "ready",
      pdfSha256: row.pdf_sha256,
      downloadPath: `/api/admin/documents/${row.id}/pdf`,
      idempotent: true,
      testOnly: true
    };
  }
  if (!["pending", "failed"].includes(row.pdf_status)) throw new Error("pdf_not_pending");

  const at = text(now());
  try {
    const snapshot = parseSnapshot(row);
    await verifySnapshotIntegrity(row, snapshot);
    const signatureDataUri = overrides.readSignatureFn
      ? await overrides.readSignatureFn(env, snapshot)
      : await readSignaturePrivate(env, snapshot);
    let html = renderFinalDocumentHtml(snapshot, signatureDataUri);
    html = overrides.inlineAssetsFn
      ? await overrides.inlineAssetsFn(env, html)
      : await inlineLogoAsset(env, html);
    const pdfBytes = overrides.renderPdfFn
      ? await overrides.renderPdfFn(env, html, snapshot.kind?.pageSize)
      : await renderPdfWithBrowser(env, html, snapshot.kind?.pageSize);
    const pdfSha256 = await sha256HexBytes(pdfBytes);
    const key = artifactKey(row, pdfSha256);
    if (overrides.putPdfFn) {
      await overrides.putPdfFn(env, key, pdfBytes, { documentId: row.id, snapshotSha256: row.snapshot_sha256, pdfSha256 });
    } else {
      await bucket(env).put(key, pdfBytes, {
        httpMetadata: { contentType: PDF_CONTENT_TYPE, cacheControl: "private, no-store" },
        customMetadata: { documentId: row.id, snapshotSha256: row.snapshot_sha256, pdfSha256 }
      });
    }
    if (overrides.markReadyFn) await overrides.markReadyFn(env, row, { key, sha256: pdfSha256, actorEmail, at });
    else await markPdfReady(env, row, { key, sha256: pdfSha256, actorEmail, at });
    return {
      ok: true,
      documentId: row.id,
      pdfStatus: "ready",
      pdfSha256,
      downloadPath: `/api/admin/documents/${row.id}/pdf`,
      idempotent: false,
      testOnly: true
    };
  } catch (error) {
    if (overrides.markFailedFn) await overrides.markFailedFn(env, row, { actorEmail, at, reason: error?.message || "pdf_generation_failed" });
    else await markPdfFailed(env, row, { actorEmail, at, reason: error?.message || "pdf_generation_failed" });
    throw error;
  }
}

function filenamePart(value, maxLength = 80) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

function safeFilename(row) {
  const number = filenamePart(row.display_number || row.id || "document", 100) || "document";
  const client = filenamePart(row.client_name, 100);
  if (!client) throw new Error("document_client_name_required_for_filename");
  return `${number} - ${client}.pdf`;
}

export async function downloadFinalPdf(env, { documentId } = {}, overrides = {}) {
  const row = await requireTestFinalizedDocument(env, documentId, overrides);
  if (row.pdf_status !== "ready" || !row.pdf_r2_key || !row.pdf_sha256) throw new Error("pdf_not_ready");
  const object = overrides.getPdfFn
    ? await overrides.getPdfFn(env, row.pdf_r2_key)
    : await bucket(env).get(row.pdf_r2_key);
  if (!object || typeof object.arrayBuffer !== "function") throw new Error("pdf_object_missing");
  const bytes = await object.arrayBuffer();
  if (await sha256HexBytes(bytes) !== row.pdf_sha256) throw new Error("pdf_hash_mismatch");
  return new Response(bytes, {
    headers: {
      "Content-Type": PDF_CONTENT_TYPE,
      "Content-Disposition": `inline; filename="${safeFilename(row)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function documentsPdfArtifactPolicy() {
  return Object.freeze({
    browserBinding: "BROWSER",
    browserMode: "quickAction:pdf",
    testSeriesOnly: true,
    realSeriesEnabled: false,
    sourceOfTruth: "immutable_snapshot",
    signatureSource: "private_DOCS_BUCKET",
    pdfBucket: "private_DOCS_BUCKET",
    exposesPrivateR2Key: false,
    authenticatedDownloadRequired: true,
    retryFromFrozenSnapshot: true,
    numberReleasedOnPdfFailure: false
  });
}
