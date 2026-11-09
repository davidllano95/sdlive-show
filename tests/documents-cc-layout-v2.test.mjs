import test from "node:test";
import assert from "node:assert/strict";

import { getDocumentKind } from "../documents-kinds.js";
import { renderCuentaDeCobro as renderCcV1 } from "../documents-templates/cc-co-es.v1.js";
import { renderCuentaDeCobro as renderCcV2, CC_CO_ES_TEMPLATE_VERSION } from "../documents-templates/cc-co-es.v2.js";
import { finalSnapshotToRendererView, renderFinalDocumentHtml } from "../documents-pdf-artifacts.js";

const signature = "data:image/png;base64,AA==";
const sampleLine = {
  kind: "professional_service",
  description: "Karaoke de prueba",
  quantity: 1,
  unitMinor: 165000000,
  amountMinor: 165000000,
  serviceDate: "2026-10-22",
  poNumber: "OC-441-2026"
};

function view(lines = [sampleLine]) {
  return {
    issuer: { legalName: "Proveedor de prueba", idType: "C.C.", idNumber: "000000", brandLabel: "[[none]]" },
    client: { legalName: "Cliente de prueba", taxIdType: "NIT", taxId: "900000000-0" },
    number: { display: "TEST-1" },
    issueCity: "Bogotá, Colombia",
    issueDate: "2026-11-09",
    currency: "COP",
    lines,
    itemize: true,
    totalMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0),
    amountInWords: "VALOR DE PRUEBA",
    usesCostsDeductions: false,
    showBankDetails: false
  };
}

function snapshot(version) {
  const renderedView = view();
  return {
    kind: { id: "cc-co-es", templateVersion: version, pageSize: "Letter" },
    number: renderedView.number,
    issue: { city: renderedView.issueCity, date: renderedView.issueDate },
    issuer: { ...renderedView.issuer, addresses: [] },
    client: renderedView.client,
    currency: renderedView.currency,
    pricing: { itemize: true },
    lines: renderedView.lines,
    totals: { totalMinor: renderedView.totalMinor, amountInWords: renderedView.amountInWords },
    legal: { usesCostsDeductions: false },
    payment: { showBankDetails: false }
  };
}

test("new Colombian collection notices select v2 and keep frozen v1 resolvable", () => {
  assert.equal(getDocumentKind("cc-co-es").templateVersion, "cc-co-es@2");
  assert.equal(CC_CO_ES_TEMPLATE_VERSION, "cc-co-es@2");
  const old = snapshot("cc-co-es@1");
  const oldHtml = renderFinalDocumentHtml(old, signature);
  assert.equal(oldHtml, renderCcV1(finalSnapshotToRendererView(old), { mode: "final", signatureDataUri: signature }));
  assert.match(oldHtml, /<col style="width:27%">/);
  assert.doesNotMatch(oldHtml, /class="date-head"/);
  const current = renderFinalDocumentHtml(snapshot("cc-co-es@2"), signature);
  assert.match(current, /<col style="width:24%">/);
  assert.match(current, /class="date-head"/);
  assert.match(current, /class="mono po po-short">OC-441-2026<\/td>/);
});

test("v2 column widths add to 100 percent for each optional-column permutation", () => {
  const cases = [
    [{ serviceDate: "2026-10-22", poNumber: "OC-441-2026" }, [6, 24, 18, 20, 15, 17]],
    [{ serviceDate: "2026-10-22", poNumber: "" }, [6, 35, 19, 21, 19]],
    [{ serviceDate: "", poNumber: "OC-441-2026" }, [6, 37, 19, 17, 21]],
    [{ serviceDate: "", poNumber: "" }, [7, 49, 21, 23]]
  ];
  for (const [fields, widths] of cases) {
    const html = renderCcV2(view([{ ...sampleLine, ...fields }]));
    const cols = html.match(/<colgroup>(.*?)<\/colgroup>/)?.[1] || "";
    const actual = [...cols.matchAll(/width:(\d+)%/g)].map((match) => Number(match[1]));
    assert.deepEqual(actual, widths);
    assert.equal(actual.reduce((sum, width) => sum + width, 0), 100);
  }
});

test("v2 keeps whitespace between type and description, protects headers, and spaces numbers", () => {
  const html = renderCcV2(view());
  assert.match(html, /<span class="kind">Servicio<\/span> Karaoke de prueba/);
  assert.match(html, /<th scope="col" class="num rate-head">Valor unitario<\/th>/);
  assert.match(html, /<th scope="col" class="date-head">Fecha \/ período<\/th>/);
  assert.match(html, /<th scope="col" class="po-head">Orden de compra<\/th>/);
  assert.match(html, /\.concept-table \.rate\{padding-right:12px;font-size:9pt\}/);
  assert.match(html, /\.concept-table \.date\{padding-left:12px;padding-right:10px\}/);
  assert.match(html, /\.concept-table \.po-short\{white-space:nowrap;overflow-wrap:normal\}/);
  assert.match(html, /1\.650\.000,00/);
  assert.match(html, /22 de octubre de 2026/);
  assert.match(html, /Certificación de retención/);
  assert.match(html, /Información de pago/);
});

test("v2 lets long purchase-order references wrap rather than force a narrow column overflow", () => {
  const html = renderCcV2(view([{ ...sampleLine, poNumber: "OC-EXTREMADAMENTE-LARGA-2026-000000" }]));
  assert.match(html, /<td class="mono po">OC-EXTREMADAMENTE-LARGA-2026-000000<\/td>/);
});
