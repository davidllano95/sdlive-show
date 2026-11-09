import test from "node:test";
import assert from "node:assert/strict";
import { getDocumentKind } from "../documents-kinds.js";
import { renderCuentaDeCobro as renderCcV2 } from "../documents-templates/cc-co-es.v2.js";
import { renderCuentaDeCobro as renderCcV3, CC_CO_ES_TEMPLATE_VERSION } from "../documents-templates/cc-co-es.v3.js";
import { finalSnapshotToRendererView, renderFinalDocumentHtml } from "../documents-pdf-artifacts.js";

const view = {
  issuer: { legalName: "Proveedor de prueba", idType: "CC", idNumber: "000000", brandLabel: "[[none]]" },
  client: { legalName: "LIVENT X S.A.S.", taxIdType: "NIT", taxId: "900000000-0" },
  number: { display: "TEST" },
  currency: "COP",
  issueDate: "2026-11-09",
  issueCity: "Bogotá, Colombia",
  lines: [
    { kind: "professional_service", quantity: 1, description: "Karaoke Terpel", unitMinor: 165000000, amountMinor: 165000000, serviceDate: "2026-10-22", poNumber: "OC-441-2026" },
    { kind: "professional_service", quantity: 1, description: "Club Plateado, Banco Popular", unitMinor: 134000000, amountMinor: 134000000, serviceDate: "2026-10-16", poNumber: "OC-427-2026" }
  ],
  totalMinor: 299000000,
  amountInWords: "DOS MILLONES NOVECIENTOS NOVENTA MIL PESOS M/CTE",
  itemize: true,
  showBankDetails: false,
  usesCostsDeductions: false
};

function finalSnapshot(templateVersion) {
  return {
    kind: { id: "cc-co-es", templateVersion },
    number: view.number,
    issuer: { ...view.issuer, addresses: [] },
    client: view.client,
    issue: { date: view.issueDate, city: view.issueCity },
    currency: view.currency,
    pricing: { itemize: true },
    lines: view.lines,
    totals: { totalMinor: view.totalMinor, amountInWords: view.amountInWords },
    payment: { showBankDetails: false },
    legal: { usesCostsDeductions: false }
  };
}

test("v3 is selected for newly issued CC and historic v2 PDFs keep their original markup", () => {
  assert.equal(getDocumentKind("cc-co-es").templateVersion, "cc-co-es@3");
  assert.equal(CC_CO_ES_TEMPLATE_VERSION, "cc-co-es@3");
  const signatureDataUri = "data:image/png;base64,AA==";
  const previous = finalSnapshot("cc-co-es@2");
  assert.equal(
    renderFinalDocumentHtml(previous, signatureDataUri),
    renderCcV2(finalSnapshotToRendererView(previous), { mode: "final", signatureDataUri })
  );
  const latest = renderFinalDocumentHtml(finalSnapshot("cc-co-es@3"), signatureDataUri);
  assert.equal(
    latest,
    renderCcV3(finalSnapshotToRendererView(finalSnapshot("cc-co-es@3")), { mode: "final", signatureDataUri })
  );
  assert.notEqual(latest, renderFinalDocumentHtml(previous, signatureDataUri));
});

test("v3 increases description width with rate, date and amount gutters intact", () => {
  const html = renderCcV3(view);
  assert.match(html, /<colgroup><col style="width:6%"><col style="width:27%"><col style="width:17%"><col style="width:19%"><col style="width:15%"><col style="width:16%"><\/colgroup>/);
  assert.match(html, /<span class="kind">Servicio<\/span> Karaoke Terpel/);
  assert.match(html, /Club Plateado, Banco Popular/);
  assert.match(html, /22 de octubre de 2026/);
  assert.match(html, /OC-441-2026/);
  assert.match(html, /2\.990\.000,00/);
  assert.match(html, /\.concept-table \.rate\{padding-right:12px;font-size:9pt\}/);
  assert.match(html, /\.concept-table \.date\{padding-left:12px;padding-right:10px\}/);
  assert.match(html, /\.concept-table \.po-head\{padding-left:3px;padding-right:3px;font-size:6\.7pt;letter-spacing:0;white-space:nowrap\}/);
  assert.match(html, /<th scope="col" class="po-head">Orden de compra<\/th>/);
  assert.match(html, /Certificación de retención/);
});

test("v3 retains existing proportional layouts when date or purchase-order columns are absent", () => {
  const cases = [
    [{ serviceDate: "2026-10-22", poNumber: "" }, [6, 35, 19, 21, 19]],
    [{ serviceDate: "", poNumber: "OC-441-2026" }, [6, 37, 19, 17, 21]],
    [{ serviceDate: "", poNumber: "" }, [7, 49, 21, 23]]
  ];
  for (const [fields, expected] of cases) {
    const html = renderCcV3({ ...view, lines: [{ ...view.lines[0], ...fields }] });
    const group = html.match(/<colgroup>(.*?)<\/colgroup>/)?.[1] || "";
    const widths = [...group.matchAll(/width:(\d+)%/g)].map(match => Number(match[1]));
    assert.deepEqual(widths, expected);
    assert.equal(widths.reduce((a,b) => a+b,0), 100);
  }
});
