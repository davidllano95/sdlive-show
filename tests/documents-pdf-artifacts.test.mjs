import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { canonicalJson } from "../documents-domain.js";
import {
  documentsPdfArtifactPolicy,
  downloadFinalPdf,
  finalSnapshotToRendererView,
  generateFinalPdf,
  renderFinalDocumentHtml
} from "../documents-pdf-artifacts.js";

async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const buffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function snapshot(overrides = {}) {
  return {
    schema: "sdlive.document.snapshot/1",
    kind: { id: "invoice-intl-en", docType: "invoice", market: "INTL", language: "en", templateVersion: "invoice-intl-en@1", pageSize: "Letter" },
    number: { seriesKey: "test:INV", value: 4, display: "TEST-INV 0004" },
    issue: { city: "Bogotá, Colombia", date: "2026-09-27", dueDate: "2026-10-12", terms: "Net 15", finalizedAt: "2026-09-27T22:00:00Z" },
    issuer: { id: "test", legalName: "Test Issuer", email: "issuer@example.com", addresses: [{ text: "Issuer address" }], brandLabel: "" },
    signature: { id: "sig-test", issuerId: "test", contentType: "image/png", sha256: "signature-hash", private: true },
    client: { legalName: "Test Client", billingAddress: "Client address" },
    project: { label: "PDF Gate", servicePeriod: { start: "2026-09-20", end: "2026-09-22" } },
    purchaseOrder: "PO-1",
    currency: "USD",
    pricing: { itemize: true, generalAmountMinor: null },
    lines: [{ id: "line-1", kind: "professional_service", description: "Sound design", quantity: 1, unit: "service", unitMinor: 10000, amountMinor: 10000 }],
    totals: { totalMinor: 10000, amountInWords: null, amountInWordsOverridden: false },
    legal: { blockVersion: null, usesCostsDeductions: null, customText: null },
    payment: { showBankDetails: true, bankDetails: { bankName: "Test Bank", accountNumber: "1234" }, censorBankDetails: false },
    supersedes: null,
    notes: "Final note",
    sources: [],
    ...overrides
  };
}

async function finalizedRow(overrides = {}) {
  const snap = snapshot();
  const json = canonicalJson(snap);
  return {
    id: "doc-test-pdf",
    kind_id: "invoice-intl-en",
    doc_type: "invoice",
    issuer_id: "test",
    status: "finalized",
    series_key: "test:INV",
    number: 4,
    display_number: "TEST-INV 0004",
    snapshot_json: json,
    snapshot_sha256: await sha256Hex(json),
    pdf_status: "pending",
    pdf_r2_key: null,
    pdf_sha256: null,
    ...overrides
  };
}

const testSequence = { series_key: "test:INV", issuer_id: "test", doc_type: "invoice", is_test: 1 };

function generationOverrides(row, calls) {
  return {
    readDocumentFn: async () => row,
    readSequenceFn: async () => testSequence,
    readSignatureFn: async () => "data:image/png;base64,ZmFrZQ==",
    inlineAssetsFn: async (_env, html) => html,
    renderPdfFn: async (_env, html, pageSize) => {
      calls.html = html;
      calls.pageSize = pageSize;
      return new TextEncoder().encode("%PDF-FAKE-SIGNED").buffer;
    },
    putPdfFn: async (_env, key, bytes, metadata) => {
      calls.key = key;
      calls.bytes = bytes;
      calls.metadata = metadata;
    },
    markReadyFn: async (_env, _row, state) => { calls.ready = state; },
    markFailedFn: async (_env, _row, state) => { calls.failed = state; }
  };
}

test("final snapshot adapter feeds the canonical renderer without draft state", () => {
  const snap = snapshot();
  const view = finalSnapshotToRendererView(snap);
  assert.equal(view.issueCity, "Bogotá, Colombia");
  assert.equal(view.issueDate, "2026-09-27");
  assert.equal(view.projectLabel, "PDF Gate");
  assert.equal(view.servicePeriodLabel, "2026-09-20 – 2026-09-22");
  assert.equal(view.issuer.address, "Issuer address");
  assert.equal(view.totalMinor, 10000);

  const html = renderFinalDocumentHtml(snap, "data:image/png;base64,ZmFrZQ==");
  assert.match(html, /TEST-INV 0004/);
  assert.match(html, /data:image\/png;base64,ZmFrZQ==/);
  assert.doesNotMatch(html, /<span>DRAFT<\/span>/);
  assert.doesNotMatch(html, /Signature applied on finalize/);
});

test("PDF generation renders from the immutable snapshot, stores privately and returns no R2 key", async () => {
  const row = await finalizedRow();
  const calls = {};
  const result = await generateFinalPdf({}, {
    documentId: row.id,
    actorEmail: "sam@sdlive.show",
    now: () => "2026-09-27T22:30:00Z"
  }, generationOverrides(row, calls));

  assert.equal(result.ok, true);
  assert.equal(result.pdfStatus, "ready");
  assert.equal(result.testOnly, true);
  assert.equal(result.idempotent, false);
  assert.equal(result.downloadPath, `/api/admin/documents/${row.id}/pdf`);
  assert.equal("pdfR2Key" in result, false);
  assert.match(calls.html, /TEST-INV 0004/);
  assert.match(calls.html, /data:image\/png;base64/);
  assert.equal(calls.pageSize, "Letter");
  assert.match(calls.key, new RegExp(`^final/test/invoice/${row.id}/`));
  assert.equal(calls.metadata.documentId, row.id);
  assert.equal(calls.metadata.snapshotSha256, row.snapshot_sha256);
  assert.equal(calls.ready.sha256, result.pdfSha256);
  assert.equal(calls.failed, undefined);
});

test("ready PDF generation is idempotent and never invokes Browser again", async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-READY");
  const row = await finalizedRow({ pdf_status: "ready", pdf_r2_key: "private/key.pdf", pdf_sha256: await sha256Hex(pdfBytes) });
  let renders = 0;
  const result = await generateFinalPdf({}, { documentId: row.id, actorEmail: "sam@sdlive.show" }, {
    readDocumentFn: async () => row,
    readSequenceFn: async () => testSequence,
    renderPdfFn: async () => { renders += 1; throw new Error("should_not_render"); }
  });
  assert.equal(result.idempotent, true);
  assert.equal(result.pdfStatus, "ready");
  assert.equal(renders, 0);
  assert.equal("pdfR2Key" in result, false);
});

test("PDF artifact gate fails closed for real series", async () => {
  const row = await finalizedRow({ series_key: "samuel:INV" });
  await assert.rejects(
    () => generateFinalPdf({}, { documentId: row.id, actorEmail: "sam@sdlive.show" }, {
      readDocumentFn: async () => row,
      readSequenceFn: async () => ({ ...testSequence, series_key: "samuel:INV", is_test: 0 })
    }),
    /real_document_series_disabled/
  );
});

test("artifact failure records failed state without changing the finalized snapshot", async () => {
  const row = await finalizedRow();
  const calls = {};
  const overrides = generationOverrides(row, calls);
  overrides.renderPdfFn = async () => { throw new Error("browser_pdf_failed"); };
  await assert.rejects(
    () => generateFinalPdf({}, { documentId: row.id, actorEmail: "sam@sdlive.show", now: () => "2026-09-27T22:35:00Z" }, overrides),
    /browser_pdf_failed/
  );
  assert.equal(calls.ready, undefined);
  assert.equal(calls.failed.reason, "browser_pdf_failed");
  assert.equal(row.status, "finalized");
  assert.equal(row.number, 4);
  assert.equal(row.snapshot_sha256, await sha256Hex(row.snapshot_json));
});

test("authenticated PDF download returns bytes with no-store headers and verifies hash", async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-DOWNLOAD");
  const row = await finalizedRow({ pdf_status: "ready", pdf_r2_key: "secret/private-key.pdf", pdf_sha256: await sha256Hex(pdfBytes) });
  const response = await downloadFinalPdf({}, { documentId: row.id }, {
    readDocumentFn: async () => row,
    readSequenceFn: async () => testSequence,
    getPdfFn: async (_env, key) => {
      assert.equal(key, "secret/private-key.pdf");
      return { arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) };
    }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("content-disposition"), /TEST-INV-0004\.pdf/);
  assert.equal(await response.text(), "%PDF-DOWNLOAD");
});

test("PDF gate policy and Wrangler keep private/test-only boundaries explicit", () => {
  const policy = documentsPdfArtifactPolicy();
  assert.equal(policy.testSeriesOnly, true);
  assert.equal(policy.realSeriesEnabled, false);
  assert.equal(policy.sourceOfTruth, "immutable_snapshot");
  assert.equal(policy.signatureSource, "private_DOCS_BUCKET");
  assert.equal(policy.pdfBucket, "private_DOCS_BUCKET");
  assert.equal(policy.exposesPrivateR2Key, false);
  assert.equal(policy.authenticatedDownloadRequired, true);
  assert.equal(policy.numberReleasedOnPdfFailure, false);

  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(wrangler, /"browser"\s*:\s*\{\s*"binding"\s*:\s*"BROWSER"/s);
  assert.match(wrangler, /"binding"\s*:\s*"DOCS_BUCKET"/);
});
