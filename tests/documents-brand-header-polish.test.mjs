import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { renderCuentaDeCobro } from "../documents-templates/cc-co-es.v1.js";
import { renderInvoice } from "../documents-templates/invoice-intl-en.v1.js";

const issuerBase = {
  legalName: "Samuel Test",
  idType: "CC",
  idNumber: "TEST-ID",
  vatLabel: "No responsable de IVA",
  ciiu: "9006",
  phone: "3000000000",
  email: "samuel@example.com",
  address: "Bogotá, Colombia"
};

const client = { legalName: "CLIENT TEST", taxIdType: "NIT", taxId: "900000000-0" };

function ccSnapshot(issuer) {
  return {
    issuer,
    client,
    currency: "COP",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-09-27",
    projectLabel: "Test line",
    purchaseOrder: "test PO",
    lines: [{ kind: "professional_service", description: "Diseño de sonido", quantity: 0, amountMinor: 30000000 }],
    totalMinor: 30000000,
    amountInWords: "TRESCIENTOS MIL PESOS M/CTE",
    showBankDetails: false
  };
}

test("blank visual brand renders no brand block", () => {
  const html = renderCuentaDeCobro(ccSnapshot({ ...issuerBase, brandLabel: "" }), { mode: "draft" });
  assert.doesNotMatch(html, /<div class="brand-block">/);
  assert.doesNotMatch(html, /sd-live-header-normal-symbol\.png/);
});

test("standard SD Live brand renders exact wordmark, subtitle, rule and optional logo", () => {
  const html = renderCuentaDeCobro(ccSnapshot({ ...issuerBase, brandLabel: "SD.Live · Creative Audio [[logo]]" }), { mode: "draft" });
  assert.match(html, />SD•Live<\/div>/);
  assert.match(html, />Creative Audio<\/div>/);
  assert.match(html, /class="brand-rule"/);
  assert.match(html, /sd-live-header-normal-symbol\.png/);
});

test("Cuenta de Cobro header separates city and date and places concept heading before metadata", () => {
  const html = renderCuentaDeCobro(ccSnapshot({ ...issuerBase, brandLabel: "[[none]]" }), { mode: "draft" });
  assert.match(html, /<div class="issue-city">Bogotá, Colombia<\/div><div class="issue-date">27 de septiembre de 2026<\/div>/);
  assert.ok(html.indexOf("Por concepto de") < html.indexOf("Proyecto / servicio"));
  assert.ok(html.indexOf("Por concepto de") < html.indexOf("Orden de compra / referencia"));
  assert.match(html, /class="meta-row"/);
  assert.doesNotMatch(html, /Atentamente/);
  assert.match(html, /samuel@example\.com/);
  assert.match(html, /SD•Live Documents/);
});

test("Invoice uses the same brand visibility, date stack, signature email and footer brand", () => {
  const html = renderInvoice({
    issuer: { ...issuerBase, brandLabel: "[[none]]" },
    client,
    currency: "USD",
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-09-27",
    lines: [{ kind: "professional_service", description: "Sound design", quantity: 0, amountMinor: 10000 }],
    totalMinor: 10000,
    showBankDetails: false
  }, { mode: "draft" });
  assert.doesNotMatch(html, /<div class="brand-block">/);
  assert.match(html, /<div class="issue-city">Bogotá, Colombia<\/div><div class="issue-date">September 27, 2026<\/div>/);
  assert.match(html, /samuel@example\.com/);
  assert.match(html, /SD•Live Documents/);
});

test("document templates use the shared two-family typography system", () => {
  const shared = readFileSync(new URL("../documents-templates/shared.js", import.meta.url), "utf8");
  const cc = readFileSync(new URL("../documents-templates/cc-co-es.v1.js", import.meta.url), "utf8");
  const invoice = readFileSync(new URL("../documents-templates/invoice-intl-en.v1.js", import.meta.url), "utf8");
  assert.match(shared, /--font-sans:Arial,sans-serif/);
  assert.match(shared, /--font-mono:Consolas,monospace/);
  assert.doesNotMatch(shared + cc + invoice, /Inter|SFMono-Regular/);
});

test("editor stores explicit blank brand state and exposes the SD Live logo toggle", () => {
  const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
  assert.match(editor, /BRAND_NONE_TOKEN = "\[\[none\]\]"/);
  assert.match(editor, /BRAND_LOGO_TOKEN = "\[\[logo\]\]"/);
  assert.match(editor, /draftBrandLogo/);
  assert.match(editor, /Show SD•Live logo/);
  assert.match(editor, /Blank hides the visual brand/);
});
