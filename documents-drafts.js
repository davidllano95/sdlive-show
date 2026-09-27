import { amountMinorToSpanishWords } from "./documents-domain.js";
import { requireDocumentKind } from "./documents-kinds.js";
import { listClientProfiles, listIssuerProfiles } from "./documents-profiles.js";
import { renderCuentaDeCobro } from "./documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "./documents-templates/invoice-intl-en.v1.js";

const MAX_DRAFT_JSON_BYTES = 64 * 1024;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/;

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function db(env) {
  const store = env?.DOCS_DB;
  if (!store || typeof store.prepare !== "function") throw new Error("documents_storage_unavailable");
  return store;
}

function plain(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function id(value, code) {
  const normalized = text(value, 120);
  if (!ID_RE.test(normalized)) throw new Error(code);
  return normalized;
}

function parseJson(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  try { return JSON.parse(value); } catch { throw new Error("invalid_persisted_document_json"); }
}

function safeDraftJson(value) {
  const draft = plain(value, "draft_payload_required");
  const json = JSON.stringify(draft);
  if (new TextEncoder().encode(json).byteLength > MAX_DRAFT_JSON_BYTES) throw new Error("draft_too_large");
  return { draft, json };
}

function safeCurrency(value) {
  const currency = text(value, 10).toUpperCase();
  if (!["COP", "USD"].includes(currency)) throw new Error("unsupported_currency");
  return currency;
}

function issueYear(value) {
  const date = text(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? Number(date.slice(0, 4)) : null;
}

function draftTotal(lines) {
  if (!Array.isArray(lines)) return 0;
  let total = 0;
  for (const line of lines) {
    const amount = Number(line?.amountMinor);
    if (!Number.isSafeInteger(amount) || amount < 0) continue;
    total += amount;
    if (!Number.isSafeInteger(total)) throw new Error("document_total_overflow");
  }
  return total;
}

function poSummary(draft) {
  const values = new Set();
  const documentPo = text(draft.purchaseOrder, 120);
  if (documentPo) values.add(documentPo);
  if (Array.isArray(draft.lines)) {
    for (const line of draft.lines) {
      const po = text(line?.poNumber, 120);
      if (po) values.add(po);
    }
  }
  return Array.from(values).join(", ");
}

function rowToDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    kindId: row.kind_id,
    docType: row.doc_type,
    issuerId: row.issuer_id,
    clientId: row.client_id,
    status: row.status,
    seriesKey: row.series_key,
    number: row.number == null ? null : Number(row.number),
    displayNumber: row.display_number,
    clientName: row.client_name,
    clientTaxId: row.client_tax_id,
    projectLabel: row.project_label,
    poNumbers: row.po_numbers,
    currency: row.currency,
    totalMinor: Number(row.total_minor || 0),
    issueDate: row.issue_date,
    issueYear: row.issue_year == null ? null : Number(row.issue_year),
    draft: parseJson(row.draft_json, {}),
    draftRev: Number(row.draft_rev || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finalizedAt: row.finalized_at
  };
}

async function profileContext(env, issuerId, clientId) {
  const [issuers, clients] = await Promise.all([listIssuerProfiles(env), listClientProfiles(env)]);
  const issuer = issuers.find((item) => item.id === issuerId) || null;
  const client = clientId ? clients.find((item) => item.id === clientId) || null : null;
  if (!issuer) throw new Error("issuer_not_found");
  if (clientId && !client) throw new Error("client_not_found");
  return { issuer, client };
}

function registryFields(draft, client) {
  return {
    clientName: text(draft.clientLegalName || client?.legalName, 240),
    clientTaxId: text(draft.clientTaxId || client?.taxId, 120),
    projectLabel: text(draft.projectLabel, 240),
    poNumbers: poSummary(draft),
    totalMinor: draftTotal(draft.lines),
    issueDate: text(draft.issueDate, 20) || null,
    issueYear: issueYear(draft.issueDate)
  };
}

export async function listDraftRegistry(env, { limit = 100 } = {}) {
  const count = Math.min(Math.max(Number(limit) || 100, 1), 250);
  const result = await db(env).prepare(`SELECT * FROM doc_documents
    ORDER BY COALESCE(issue_date, created_at) DESC, created_at DESC
    LIMIT ?`).bind(count).all();
  return (result.results || []).map(rowToDocument);
}

export async function readDraftDocument(env, documentId) {
  const row = await db(env).prepare("SELECT * FROM doc_documents WHERE id = ? LIMIT 1").bind(id(documentId, "invalid_document_id")).first();
  return rowToDocument(row);
}

export async function createDraftDocument(env, input, { actorEmail = "", now = () => new Date().toISOString() } = {}) {
  const payload = plain(input, "document_payload_required");
  const kind = requireDocumentKind(payload.kindId);
  const issuerId = id(payload.issuerId, "invalid_issuer_id");
  const clientId = payload.clientId ? id(payload.clientId, "invalid_client_id") : null;
  const currency = safeCurrency(payload.currency || (kind.id === "cc-co-es" ? "COP" : "USD"));
  const { draft, json } = safeDraftJson({ ...(payload.draft || {}), kindId: kind.id, currency });
  const { client } = await profileContext(env, issuerId, clientId);
  const fields = registryFields(draft, client);
  const documentId = `doc-${crypto.randomUUID()}`;
  const at = text(now(), 80);
  await db(env).batch([
    db(env).prepare(`INSERT INTO doc_documents (
      id, kind_id, doc_type, issuer_id, client_id, status, origin,
      client_name, client_tax_id, project_label, po_numbers, currency,
      total_minor, issue_date, issue_year, draft_json, draft_rev,
      pdf_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', 'system', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'none', ?, ?)`)
      .bind(documentId, kind.id, kind.docType, issuerId, clientId, fields.clientName, fields.clientTaxId,
        fields.projectLabel, fields.poNumbers, currency, fields.totalMinor, fields.issueDate, fields.issueYear, json, at, at),
    db(env).prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
      VALUES (?, 'draft_created', ?, ?, ?)`)
      .bind(documentId, text(actorEmail, 240).toLowerCase(), at, JSON.stringify({ kindId: kind.id }))
  ]);
  return readDraftDocument(env, documentId);
}

export async function updateDraftDocument(env, documentId, input, { actorEmail = "", now = () => new Date().toISOString() } = {}) {
  const payload = plain(input, "document_payload_required");
  const current = await readDraftDocument(env, documentId);
  if (!current) throw new Error("document_not_found");
  if (current.status !== "draft") throw new Error("document_not_draft");
  const expectedRev = Number(payload.draftRev);
  if (!Number.isSafeInteger(expectedRev) || expectedRev < 1) throw new Error("invalid_draft_revision");
  if (expectedRev !== current.draftRev) throw new Error("stale_draft_revision");
  const clientId = payload.clientId === undefined ? current.clientId : (payload.clientId ? id(payload.clientId, "invalid_client_id") : null);
  const currency = safeCurrency(payload.currency || current.currency);
  const { draft, json } = safeDraftJson({ ...(payload.draft || {}), kindId: current.kindId, currency });
  const { client } = await profileContext(env, current.issuerId, clientId);
  const fields = registryFields(draft, client);
  const at = text(now(), 80);
  const result = await db(env).prepare(`UPDATE doc_documents SET
      client_id = ?, client_name = ?, client_tax_id = ?, project_label = ?, po_numbers = ?,
      currency = ?, total_minor = ?, issue_date = ?, issue_year = ?, draft_json = ?,
      draft_rev = draft_rev + 1, updated_at = ?
    WHERE id = ? AND status = 'draft' AND draft_rev = ?`)
    .bind(clientId, fields.clientName, fields.clientTaxId, fields.projectLabel, fields.poNumbers,
      currency, fields.totalMinor, fields.issueDate, fields.issueYear, json, at, current.id, expectedRev).run();
  if (Number(result?.meta?.changes ?? result?.changes ?? 0) !== 1) throw new Error("stale_draft_revision");
  await db(env).prepare(`INSERT INTO doc_document_events (document_id, event, actor_email, at, detail_json)
    VALUES (?, 'draft_saved', ?, ?, ?)`)
    .bind(current.id, text(actorEmail, 240).toLowerCase(), at, JSON.stringify({ fromRev: expectedRev, toRev: expectedRev + 1 })).run();
  return readDraftDocument(env, current.id);
}

function addressText(issuer) {
  const first = Array.isArray(issuer?.addresses) ? issuer.addresses[0] : null;
  return typeof first === "string" ? first : text(first?.text, 500);
}

function servicePeriodLabel(value) {
  if (!value || typeof value !== "object") return "";
  const start = text(value.start, 20);
  const end = text(value.end, 20);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function previewLines(lines) {
  return Array.isArray(lines) ? lines.map((line, index) => ({
    id: text(line?.id, 120) || `line-${index + 1}`,
    kind: text(line?.kind, 40) || "other",
    description: text(line?.description, 500) || "Untitled line",
    quantity: Number.isSafeInteger(Number(line?.quantity)) && Number(line.quantity) > 0 ? Number(line.quantity) : 1,
    unit: text(line?.unit, 40) || "unit",
    unitMinor: Number.isSafeInteger(Number(line?.unitMinor)) ? Number(line.unitMinor) : null,
    amountMinor: Number.isSafeInteger(Number(line?.amountMinor)) ? Math.max(0, Number(line.amountMinor)) : 0,
    serviceDate: text(line?.serviceDate, 20),
    poNumber: text(line?.poNumber, 120),
    reference: text(line?.reference, 240),
    originalCurrency: text(line?.originalCurrency, 10),
    originalAmountMinor: Number.isSafeInteger(Number(line?.originalAmountMinor)) ? Math.max(0, Number(line.originalAmountMinor)) : null
  })) : [];
}

export async function buildDraftPreview(env, documentId) {
  const document = await readDraftDocument(env, documentId);
  if (!document) throw new Error("document_not_found");
  if (document.status !== "draft") throw new Error("document_not_draft");
  const { issuer, client } = await profileContext(env, document.issuerId, document.clientId);
  const draft = document.draft || {};
  const lines = previewLines(draft.lines);
  const totalMinor = draftTotal(lines);
  const view = {
    kindId: document.kindId,
    currency: document.currency,
    issueCity: text(draft.issueCity, 120),
    issueDate: text(draft.issueDate, 20),
    dueDate: text(draft.dueDate, 20),
    terms: text(draft.terms, 120),
    projectLabel: text(draft.projectLabel, 240),
    purchaseOrder: text(draft.purchaseOrder, 120),
    servicePeriodLabel: servicePeriodLabel(draft.servicePeriod),
    lines,
    totalMinor,
    amountInWords: text(draft.amountWordsOverride, 500) || (document.kindId === "cc-co-es" ? amountMinorToSpanishWords(totalMinor, { currency: document.currency }) : ""),
    usesCostsDeductions: Boolean(draft.usesCostsDeductions),
    legalBlockVersion: text(draft.legalBlockVersion, 80) || "co-ret@2026-1",
    showBankDetails: draft.showBankDetails == null ? Boolean(client?.showBankDetails) : Boolean(draft.showBankDetails),
    bankDetails: draft.bankDetails && typeof draft.bankDetails === "object" ? draft.bankDetails : issuer.bank,
    notes: text(draft.notes, 2000),
    issuer: { ...issuer, address: addressText(issuer) },
    client: client ? { ...client } : {
      legalName: text(draft.clientLegalName, 240), taxIdType: text(draft.clientTaxIdType, 40), taxId: text(draft.clientTaxId, 120), billingAddress: text(draft.clientBillingAddress, 500)
    }
  };
  const html = document.kindId === "cc-co-es"
    ? renderCuentaDeCobro(view, { mode: "draft" })
    : renderInvoice(view, { mode: "draft" });
  return { ok: true, document, html, draftRev: document.draftRev, templateVersion: requireDocumentKind(document.kindId).templateVersion };
}

export function documentsDraftPolicy() {
  return Object.freeze({
    maxDraftJsonBytes: MAX_DRAFT_JSON_BYTES,
    draftsConsumeNumbers: false,
    previewReadsSignatureBytes: false,
    previewContainsUsableSignature: false,
    updateUsesDraftRevisionCas: true
  });
}
