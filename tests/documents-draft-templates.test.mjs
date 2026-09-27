import test from "node:test";
import assert from "node:assert/strict";

import { renderCuentaDeCobro } from "../documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "../documents-templates/invoice-intl-en.v1.js";
import { formatMoney, safeBrand } from "../documents-templates/shared.js";
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
  brandLabel: "SD.Live · Creative Audio"
};

const client = {
  legalName: "CLIENTE TEST S.A.S.",
  taxIdType: "NIT",
  taxId: "900000000-0",
  billingAddress: "Bogotá, Colombia",
  phone: "+57 1 0000000"
};

const bank = {
  beneficiary: "Hidden beneficiary",
  bankName: "Lead Bank",
  routingNumber: "ROUTING-TEST",
  accountType: "Checking",
  accountNumber: "ACCOUNT-TEST",
  bankAddress: "Kansas City, MO"
};

test("document money always renders two decimal places", () => {
  assert.equal(formatMoney(45000000, "COP", "es-CO"), "450.000,00");
  assert.equal(formatMoney(45000000, "USD", "en-US"), "450,000.00");
});

test("blank visual brand falls back to the canonical SD.Live brand", () => {
  assert.deepEqual(safeBrand({ brandLabel: "" }), { primary: "SD.Live", secondary: "Creative Audio" });
  assert.deepEqual(safeBrand({ brandLabel: "Custom Brand" }), { primary: "Custom Brand", secondary: "" });
});

test("Cuenta de cobro draft renders optional metadata, type, quantity and ordered Spanish bank rows", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-10-02",
    dueDate: "2026-10-17",
    terms: "Pago a 15 días",
    projectLabel: "Allegra",
    purchaseOrder: "PO-DOC-77",
    lines: [{ kind: "professional_service", description: "Ingeniero de Sonido", quantity: 2, unit: "servicio", unitMinor: 22500000, amountMinor: 45000000, poNumber: "OC-254" }],
    totalMinor: 45000000,
    amountInWords: "CUATROCIENTOS CINCUENTA MIL PESOS M/CTE",
    usesCostsDeductions: false,
    legalBlockVersion: "co-ret@2026-1",
    showBankDetails: true,
    bankDetails: bank,
    notes: "Nota visible"
  }, { mode: "draft" });

  assert.match(html, /BORRADOR/);
  assert.match(html, /No\. —/);
  assert.match(html, /<div class="issue-city">Bogotá, Colombia<\/div><div class="issue-date">2 de octubre de 2026<\/div>/);
  assert.match(html, /Proyecto \/ servicio/);
  assert.match(html, /PO-DOC-77/);
  assert.match(html, /Pago a 15 días/);
  assert.match(html, /Nota visible/);
  assert.match(html, /<div class="concept-title">Por concepto de<\/div>/);
  assert.match(html, /\.concept-title\{text-align:center;font-size:10\.6pt;font-weight:800/);
  assert.match(html, /<table class="concept-table"><colgroup>/);
  assert.match(html, /<th>Cant\.<\/th><th>Descripción<\/th>/);
  assert.match(html, /Tipo: Servicio · Unidad: servicio/);
  assert.match(html, /225\.000,00/);
  assert.match(html, /450\.000,00/);
  assert.match(html, /OC-254/);
  assert.doesNotMatch(html, /Fecha \/ período/);
  assert.match(html, /La firma se aplica al finalizar/);
  assert.match(html, /co-ret@2026-1/);
  assert.doesNotMatch(html, /Hidden beneficiary/);
  const labels = ["Nombre del Banco", "Routing Number", "Tipo de cuenta", "Número de cuenta", "Dirección del banco"];
  for (let i = 1; i < labels.length; i += 1) assert.ok(html.indexOf(labels[i - 1]) < html.indexOf(labels[i]));
  assert.doesNotMatch(html, /<img[^>]+alt="Firma"/);
  assert.doesNotMatch(html, /data:image/i);
});

test("Cuenta de cobro collapses to concepts and prices when no structured line metadata is used", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    lines: [
      { kind: "professional_service", description: "Diseño de sonido", quantity: 0, unit: null, unitMinor: 30000000, amountMinor: 30000000 },
      { kind: "professional_service", description: "Programación QLab", quantity: 0, unit: null, unitMinor: 15000000, amountMinor: 15000000 }
    ],
    totalMinor: 45000000,
    showBankDetails: false
  }, { mode: "draft" });
  assert.match(html, /<table class="concept-table simple">/);
  assert.match(html, /Diseño de sonido/);
  assert.match(html, /Programación QLab/);
  assert.match(html, /300\.000,00/);
  assert.match(html, /150\.000,00/);
  assert.doesNotMatch(html, /<th>Cant\.<\/th>/);
  assert.doesNotMatch(html, /Valor unitario/);
  assert.doesNotMatch(html, /Tipo: Servicio/);
  assert.doesNotMatch(html, /Unidad:/);
  assert.doesNotMatch(html, /Fecha \/ período/);
  assert.doesNotMatch(html, /Orden de compra/);
});

test("Cuenta de cobro non-itemized mode keeps centered concepts and one general amount", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    itemize: false,
    generalAmountMinor: 97500000,
    lines: [
      { kind: "professional_service", description: "Diseño de sonido", quantity: 2, unit: "día", unitMinor: 10000000, amountMinor: 20000000 },
      { kind: "equipment", description: "Programación QLab", quantity: 1, unitMinor: 5000000, amountMinor: 5000000 }
    ],
    totalMinor: 97500000,
    amountInWords: "NOVECIENTOS SETENTA Y CINCO MIL PESOS M/CTE",
    showBankDetails: false
  }, { mode: "draft" });
  assert.match(html, /La suma de/);
  assert.match(html, /975\.000,00/);
  assert.match(html, /NOVECIENTOS SETENTA Y CINCO MIL PESOS M\/CTE/);
  assert.match(html, /<div class="concept-title">Por concepto de<\/div>/);
  assert.match(html, /<div class="nonitemized-concepts"><div class="nonitemized-concept">Diseño de sonido<\/div><div class="nonitemized-concept">Programación QLab<\/div><\/div>/);
  assert.match(html, /\.nonitemized-concepts\{text-align:center/);
  assert.doesNotMatch(html, /<table class="concept-table(?: simple)?">/);
  assert.doesNotMatch(html, /200\.000,00/);
  assert.doesNotMatch(html, /50\.000,00/);
  assert.doesNotMatch(html, /Total<\/td>/);
});

test("Cuenta de cobro uses the first column for optional quantity and renders a dash at zero", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    lines: [{ kind: "equipment", description: "Servicio", quantity: 0, unitMinor: 30000000, amountMinor: 30000000 }],
    totalMinor: 30000000,
    showBankDetails: false
  }, { mode: "draft" });
  assert.match(html, /<th>Cant\.<\/th><th>Descripción<\/th>/);
  assert.match(html, /<td class="qty">—<\/td>/);
  assert.match(html, /Tipo: Equipo/);
  assert.doesNotMatch(html, />01<\/td>/);
  assert.match(html, /300\.000,00/);
  assert.doesNotMatch(html, /Fecha \/ período/);
});

test("Cuenta de cobro renders a line date range only when supplied", () => {
  const html = renderCuentaDeCobro({
    issuer,
    client,
    currency: "COP",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-10-02",
    lines: [{ kind: "professional_service", description: "Servicio", quantity: 1, unitMinor: 10000, amountMinor: 10000, serviceDate: "2026-09-02", serviceDateEnd: "2026-09-04" }],
    totalMinor: 10000,
    showBankDetails: false
  }, { mode: "draft" });
  assert.match(html, /Fecha \/ período/);
  assert.match(html, /2 de septiembre de 2026 – 4 de septiembre de 2026/);
});

test("Invoice draft renders issue city/date, optional line metadata and ordered English bank rows", () => {
  const html = renderInvoice({
    issuer,
    client,
    currency: "USD",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-09-26",
    dueDate: "2026-10-11",
    terms: "Net 15",
    projectLabel: "NCL Jade",
    purchaseOrder: "PO-77",
    servicePeriodLabel: "Sep 2026",
    lines: [
      { kind: "professional_service", description: "Associate Sound Design", quantity: 0, unit: "", unitMinor: 600000, amountMinor: 600000, serviceDate: "2026-09-20", serviceDateEnd: "2026-09-22", poNumber: "PO-LINE-1" },
      { kind: "transport", description: "Uber - Airport to Home", quantity: 1, unit: "trip", unitMinor: 2364, amountMinor: 2364, originalCurrency: "COP", originalAmountMinor: 7734000 }
    ],
    totalMinor: 602364,
    showBankDetails: true,
    bankDetails: bank,
    notes: "Thank you"
  }, { mode: "draft" });

  assert.match(html, /DRAFT/);
  assert.match(html, /Invoice No\.<\/dt><dd>—/);
  assert.match(html, /<div class="issue-city">Bogotá, Colombia<\/div><div class="issue-date">September 26, 2026<\/div>/);
  assert.match(html, /Professional services/);
  assert.match(html, /Expenses &amp; reimbursements/);
  assert.match(html, /Date \/ period: September 20, 2026 – September 22, 2026/);
  assert.match(html, /PO \/ ref: PO-LINE-1/);
  assert.match(html, /Original expense COP 77\.340,00/);
  assert.match(html, /<td class="num">—<\/td><td class="sub" style="padding-left:10px">—<\/td>/);
  assert.match(html, /USD 6,023\.64/);
  assert.match(html, /Thank you/);
  assert.doesNotMatch(html, /Hidden beneficiary/);
  const labels = ["Bank Name", "Routing Number", "Account Type", "Account Number", "Bank Address"];
  for (let i = 1; i < labels.length; i += 1) assert.ok(html.indexOf(labels[i - 1]) < html.indexOf(labels[i]));
  assert.match(html, /Signature applied on finalize/);
  assert.doesNotMatch(html, /data:image/i);
});

test("draft templates escape user-controlled HTML", () => {
  const html = renderInvoice({
    issuer: { ...issuer, legalName: '<script>alert("x")</script>' },
    client: { ...client, legalName: "<img src=x onerror=alert(1)>" },
    currency: "USD",
    lines: [{ kind: "other", description: "<b>unsafe</b>", quantity: 0, amountMinor: 100 }],
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
  assert.equal(draftPolicy.saveUsesDraftRevisionCas, true);
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