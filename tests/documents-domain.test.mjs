import test from "node:test";
import assert from "node:assert/strict";

import {
  amountMinorToSpanishWords,
  buildFinalSnapshot,
  calculateDocumentLines,
  canonicalJson,
  formatSequenceNumber,
  sha256Hex
} from "../documents-domain.js";
import { getDocumentKind, SAMUEL_SEQUENCE_BOOTSTRAP } from "../documents-kinds.js";

test("kind registry locks v1 kinds and intended Samuel series", () => {
  assert.equal(getDocumentKind("cc-co-es").templateVersion, "cc-co-es@1");
  assert.equal(getDocumentKind("invoice-intl-en").defaultShowBankDetails, true);
  assert.equal(SAMUEL_SEQUENCE_BOOTSTRAP["samuel:CC"].issuerId, "samuel-cop");
  assert.equal(SAMUEL_SEQUENCE_BOOTSTRAP["samuel:CC"].nextValue, 21);
  assert.equal(SAMUEL_SEQUENCE_BOOTSTRAP["samuel:INV"].issuerId, "samuel-usd");
  assert.equal(SAMUEL_SEQUENCE_BOOTSTRAP["samuel:INV"].nextValue, 19);
});

test("sequence display formatting never parses display text back into numbers", () => {
  assert.equal(formatSequenceNumber("CUENTA DE COBRO No. {n}", 21), "CUENTA DE COBRO No. 21");
  assert.equal(formatSequenceNumber("Invoice No. {n:04}", 19), "Invoice No. 0019");
  assert.throws(() => formatSequenceNumber("Invoice", 19), /invalid_display_pattern/);
});

test("line totals use integer minor units and optional zero quantity means one rate with hidden quantity", () => {
  const result = calculateDocumentLines([
    { description: "Service", unitMinor: 600000, quantity: 0, unit: "service", serviceDate: "2026-09-20", serviceDateEnd: "2026-09-22" },
    { description: "Per diem", unitMinor: 5000, quantity: 4 },
    { description: "Taxi", amountMinor: 2364 }
  ]);
  assert.equal(result.totalMinor, 622364);
  assert.equal(result.lines[0].quantity, 0);
  assert.equal(result.lines[0].amountMinor, 600000);
  assert.equal(result.lines[0].unit, "service");
  assert.equal(result.lines[0].serviceDateEnd, "2026-09-22");
  assert.equal(result.lines[1].amountMinor, 20000);
  assert.throws(() => calculateDocumentLines([{ description: "Bad", unitMinor: 100, quantity: 2, amountMinor: 201 }]), /line_amount_mismatch/);
  assert.throws(() => calculateDocumentLines([{ description: "Bad qty", unitMinor: 100, quantity: -1 }]), /line_quantity_must_be_non_negative_integer/);
});

test("Spanish amount words match common COP billing amounts", () => {
  assert.equal(amountMinorToSpanishWords(45000000), "CUATROCIENTOS CINCUENTA MIL PESOS M/CTE");
  assert.equal(amountMinorToSpanishWords(2100000), "VEINTIÚN MIL PESOS M/CTE");
  assert.equal(amountMinorToSpanishWords(10050), "CIEN PESOS CON 50/100 M/CTE");
});

test("canonical JSON and sha256 are deterministic across key order", async () => {
  const a = { z: 2, a: { y: 3, x: 1 } };
  const b = { a: { x: 1, y: 3 }, z: 2 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(await sha256Hex(a), await sha256Hex(b));
});

test("final snapshot freezes number, issuer, client, lines, signature and sources", async () => {
  const document = {
    id: "doc-1",
    kind_id: "cc-co-es",
    doc_type: "cc",
    issuer_id: "samuel",
    status: "draft",
    currency: "COP",
    project_label: "Show",
    supersedes_id: null
  };
  const draft = {
    currency: "COP",
    issueCity: "Bogotá",
    issueDate: "2026-09-27",
    lines: [{ id: "l1", description: "Ingeniero de Sonido", quantity: 0, unit: null, amountMinor: 45000000, poNumber: "PO-42" }],
    usesCostsDeductions: false,
    showBankDetails: false
  };
  const result = await buildFinalSnapshot({
    document,
    draft,
    issuer: { id: "samuel", legalName: "Samuel David Llano Muñoz", idType: "CC", idNumber: "x" },
    client: { id: "client-1", legalName: "Livent X S.A.S.", taxId: "x" },
    signatureAsset: { id: "sig-1", sha256: "abc", contentType: "image/png" },
    numberContext: { seriesKey: "samuel:CC", number: 21, displayNumber: "CUENTA DE COBRO No. 21" },
    finalizedAt: "2026-09-27T05:00:00Z",
    sources: [{ lineId: "l1", sourceSystem: "registro", sourceRef: "row-1", observed: { grossMinor: 45000000 } }]
  });
  assert.equal(result.snapshot.schema, "sdlive.document.snapshot/1");
  assert.equal(result.snapshot.number.value, 21);
  assert.equal(result.snapshot.totals.totalMinor, 45000000);
  assert.equal(result.snapshot.totals.amountInWords, "CUATROCIENTOS CINCUENTA MIL PESOS M/CTE");
  assert.equal(result.snapshot.pricing.itemize, true);
  assert.equal(result.snapshot.pricing.generalAmountMinor, null);
  assert.equal(result.snapshot.lines[0].quantity, 0);
  assert.equal(result.snapshot.lines[0].poNumber, "PO-42");
  assert.equal(result.snapshot.sources[0].sourceRef, "row-1");
  assert.match(result.snapshotSha256, /^[0-9a-f]{64}$/);
});

test("non-itemized CC freezes the general total while preserving concept lines", async () => {
  const result = await buildFinalSnapshot({
    document: {
      id: "doc-simple",
      kind_id: "cc-co-es",
      doc_type: "cc",
      issuer_id: "samuel",
      status: "draft",
      currency: "COP",
      project_label: "Show",
      supersedes_id: null
    },
    draft: {
      currency: "COP",
      issueCity: "Bogotá",
      issueDate: "2026-09-27",
      itemize: false,
      generalAmountMinor: 97500000,
      lines: [
        { id: "l1", description: "Diseño de sonido", quantity: 0, amountMinor: 0 },
        { id: "l2", description: "Programación QLab", quantity: 0, amountMinor: 0 }
      ],
      usesCostsDeductions: false,
      showBankDetails: false
    },
    issuer: { id: "samuel", legalName: "Samuel David Llano Muñoz", idType: "CC", idNumber: "x" },
    client: { id: "client-1", legalName: "Livent X S.A.S.", taxId: "x" },
    signatureAsset: { id: "sig-1", sha256: "abc", contentType: "image/png" },
    numberContext: { seriesKey: "test:CC", number: 4, displayNumber: "TEST-CC 4" },
    finalizedAt: "2026-09-27T05:00:00Z"
  });
  assert.equal(result.totalMinor, 97500000);
  assert.equal(result.snapshot.totals.totalMinor, 97500000);
  assert.equal(result.snapshot.pricing.itemize, false);
  assert.equal(result.snapshot.pricing.generalAmountMinor, 97500000);
  assert.equal(result.snapshot.lines.length, 2);
  assert.equal(result.snapshot.lines[0].description, "Diseño de sonido");
});