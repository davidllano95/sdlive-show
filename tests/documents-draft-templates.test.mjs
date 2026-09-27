import test from "node:test";
import assert from "node:assert/strict";

import { renderCuentaDeCobro } from "../documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "../documents-templates/invoice-intl-en.v1.js";
import { documentsDraftPolicy } from "../documents-drafts.js";
import { documentsEditorApiPolicy, handleDocumentsEditorApi } from "../documents-admin-editor-api.js";

const issuer = {
  id: "samuel",
  legalName: "Samuel David Llano Muñoz",
  idType: "C.C.",
  idNumber: "TEST-ID",
  vatLabel: "No responsable de IVA",
  ciiu: "9006",
  phone: "+57 300 000 0000",
  email: "test@example.com",
  address: "Bogotá, Colombia",
  brandLabel: "sd•live · Creative Audio"
};

const client = {
  legalName: "CLIENTE TEST S.A.S.",
  taxIdType: "NIT",
  taxId: "900000000-0",
  billingAddress: "Bogotá, Colombia",
  phone: "+57 1 0000000"
};

test("Cuenta de cobro draft has watermark, no number and no usable signature", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-10-02",
    projectLabel: "Allegra",
    lines: [{ description: "Ingeniero de Sonido", serviceDate: "2026-09-02", poNumber: "OC-254", amountMinor: 45000000 }],
    totalMinor: 45000000,
    amountInWords: "CUATROCIENTOS CINCUENTA MIL PESOS M/CTE",
    usesCostsDeductions: false,
    legalBlockVersion: "co-ret@2026-1",
    showBankDetails: false
  }, { mode: "draft" });

  assert.match(html, /BORRADOR/);
  assert.match(html, /No\. —/);
  assert.match(html, /La firma se aplica al finalizar/);
  assert.match(html, /OC-254/);
  assert.match(html, /co-ret@2026-1/);
  assert.doesNotMatch(html, /<img[^>]+alt="Firma"/);
  assert.doesNotMatch(html, /data:image/i);
});

test("Invoice draft groups services and reimbursements and preserves original currency", () => {
  const html = renderInvoice({
    issuer,
    client,
    currency: "USD",
    issueDate: "2026-09-26",
    dueDate: "2026-10-11",
    terms: "Net 15",
    projectLabel: "NCL Jade",
    purchaseOrder: "PO-77",
    servicePeriodLabel: "Sep 2026",
    lines: [
      { kind: "professional_service", description: "Associate Sound Design", quantity: 1, unit: "service", unitMinor: 600000, amountMinor: 600000 },
      { kind: "transport", description: "Uber - Airport to Home", quantity: 1, unit: "trip", unitMinor: 2364, amountMinor: 2364, originalCurrency: "COP", originalAmountMinor: 7734000 }
    ],
    totalMinor: 602364,
    showBankDetails: false,
    notes: "Thank you"
  }, { mode: "draft" });

  assert.match(html, /DRAFT/);
  assert.match(html, /Invoice No\.<\/dt><dd>—/);
  assert.match(html, /Professional services/);
  assert.match(html, /Expenses &amp; reimbursements/);
  assert.match(html, /Original expense COP 77\.340/);
  assert.match(html, /Signature applied on finalize/);
  assert.doesNotMatch(html, /data:image/i);
});

test("draft templates escape user-controlled HTML", () => {
  const html = renderInvoice({
    issuer: { ...issuer, legalName: '<script>alert("x")</script>' },
    client: { ...client, legalName: "<img src=x onerror=alert(1)>" },
    currency: "USD",
    lines: [{ kind: "other", description: "<b>unsafe</b>", quantity: 1, amountMinor: 100 }],
    totalMinor: 100,
    showBankDetails: false
  }, { mode: "draft" });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<b>unsafe<\/b>/);
  assert.match(html, /&lt;script&gt;/);
});

test("draft/editor policies keep numbering and signature closed", () => {
  const draftPolicy = documentsDraftPolicy();
  const apiPolicy = documentsEditorApiPolicy();
  assert.equal(draftPolicy.draftsConsumeNumbers, false);
  assert.equal(draftPolicy.previewReadsSignatureBytes, false);
  assert.equal(draftPolicy.previewContainsUsableSignature, false);
  assert.equal(draftPolicy.updateUsesDraftRevisionCas, true);
  assert.equal(draftPolicy.profileEditsWriteBackFromDocument, false);
  assert.equal(apiPolicy.adminOnly, true);
  assert.equal(apiPolicy.draftsConsumeNumbers, false);
  assert.equal(apiPolicy.previewReturnsSignatureBytes, false);
  assert.equal(apiPolicy.optimisticConcurrency, "draftRev");
});

test("editor API rejects unauthenticated registry access before storage", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/registry"),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "Unauthorized" });
});
