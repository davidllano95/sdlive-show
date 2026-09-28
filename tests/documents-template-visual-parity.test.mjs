import test from "node:test";
import assert from "node:assert/strict";

import { renderCuentaDeCobro } from "../documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "../documents-templates/invoice-intl-en.v1.js";

const issuer = {
  legalName: "Test Issuer",
  idType: "ID",
  idNumber: "12345678",
  phone: "12345678",
  email: "test@test.com",
  address: "Calle 112",
  vatLabel: "Not liable for VAT",
  brandLabel: ""
};

const client = {
  legalName: "LIVENT X S.A.S.",
  taxIdType: "NIT",
  taxId: "901414735-0"
};

const bankDetails = {
  bankName: "Test Bank",
  routingNumber: "1234",
  accountType: "Savings",
  accountNumber: "56789",
  bankAddress: "Test Bank address"
};

test("Cuenta de Cobro keeps its semantic blocks while sharing the invoice visual footer and signature geometry", () => {
  const cc = renderCuentaDeCobro({
    issuer,
    client,
    number: { display: "TEST-CC 1" },
    currency: "COP",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-09-27",
    lines: [{ kind: "professional_service", description: "Servicio", quantity: 1, unitMinor: 100000, amountMinor: 100000 }],
    totalMinor: 100000,
    amountInWords: "MIL PESOS M/CTE",
    usesCostsDeductions: false,
    showBankDetails: true,
    bankDetails
  }, { mode: "final", signatureDataUri: "data:image/png;base64,AA==" });

  assert.match(cc, /Cuenta de Cobro No\. <strong>TEST-CC 1<\/strong>/);
  assert.match(cc, />La empresa</);
  assert.match(cc, />Debe a</);
  assert.match(cc, />La suma de</);
  assert.match(cc, />Por concepto de</);
  assert.match(cc, /\.bottom\{display:grid;grid-template-columns:1\.2fr 1fr;gap:28px;margin-top:auto;padding-top:30px/);
  assert.match(cc, /\.signature-applied\{display:block;height:108px;max-width:250px;object-fit:contain;object-position:right bottom/);
  assert.match(cc, /<div class="label" style="margin-bottom:6px">Información de pago<\/div>/);
  assert.match(cc, /<img class="signature-applied"[^>]+alt="Firma">/);
});

test("Cuenta de Cobro and Invoice use the same lower-page grid proportions and print page geometry", () => {
  const cc = renderCuentaDeCobro({
    issuer,
    client,
    number: { display: "TEST-CC 1" },
    currency: "COP",
    lines: [{ kind: "professional_service", description: "Servicio", quantity: 1, amountMinor: 100000 }],
    totalMinor: 100000,
    amountInWords: "MIL PESOS M/CTE",
    usesCostsDeductions: false,
    showBankDetails: false
  }, { mode: "draft" });

  const invoice = renderInvoice({
    issuer,
    client,
    number: { display: "TEST-INV 0001" },
    currency: "USD",
    lines: [{ kind: "professional_service", description: "Service", quantity: 1, amountMinor: 100 }],
    totalMinor: 100,
    showBankDetails: false
  }, { mode: "draft" });

  for (const html of [cc, invoice]) {
    assert.match(html, /grid-template-columns:1\.2fr 1fr/);
    assert.match(html, /margin-top:auto;padding-top:30px/);
    assert.match(html, /height:108px;max-width:250px/);
    assert.match(html, /width:8\.5in!important;height:11in!important;min-height:11in!important/);
  }
});
