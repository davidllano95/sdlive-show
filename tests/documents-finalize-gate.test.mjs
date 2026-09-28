import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { handleDocumentsEditorApi, documentsEditorApiPolicy } from "../documents-admin-editor-api.js";
import { documentsFinalizeGatePolicy } from "../documents-finalize-gate.js";

const UUID = "7d444840-9dc0-4f5a-9a3f-5d24af26b8a1";

function draftRow(overrides = {}) {
  return {
    id: "doc-test-1",
    kind_id: "cc-co-es",
    doc_type: "cc",
    issuer_id: "test",
    client_id: "client-1",
    status: "draft",
    currency: "COP",
    draft_rev: 3,
    draft_json: JSON.stringify({
      kindId: "cc-co-es",
      currency: "COP",
      issueDate: "2026-09-27",
      issueCity: "Bogotá, Colombia",
      usesCostsDeductions: false,
      lines: [{ id: "line-1", description: "Sound design", quantity: 0, amountMinor: 375500000 }]
    }),
    ...overrides
  };
}

function gateOverrides({ row = draftRow(), sequence = null, finalized = null, peek = null } = {}) {
  const seq = sequence || {
    series_key: "test:CC",
    issuer_id: "test",
    doc_type: "cc",
    next_value: 7,
    display_pattern: "TEST-CC {n}",
    is_test: 1
  };
  const expectedSeriesKey = seq.series_key;
  const expectedNumber = Number(seq.next_value);
  const expectedDisplay = seq.display_pattern === "{n}" ? String(expectedNumber)
    : seq.display_pattern === "{n:04}" ? String(expectedNumber).padStart(4, "0")
      : `TEST-CC ${expectedNumber}`;
  return {
    readDocument: async () => row,
    readDocumentSequence: async () => seq,
    peekDocumentNumber: async () => peek || ({
      seriesKey: expectedSeriesKey,
      number: expectedNumber,
      displayNumber: expectedDisplay,
      isTest: Number(seq.is_test) === 1
    }),
    resolveContext: async () => ({
      issuer: { id: row.issuer_id, legalName: "Test Issuer", idNumber: "123" },
      client: { id: "client-1", legalName: "Test Client S.A.S.", taxId: "900123" },
      signatureAsset: { id: "sig-test", sha256: "abc123" },
      sources: []
    }),
    validateDraftForFinalize: () => ({ totalMinor: 375500000, lines: [], kind: { id: row.kind_id } }),
    finalizeDocument: async (_env, options) => {
      const numberContext = {
        seriesKey: expectedSeriesKey,
        number: expectedNumber,
        displayNumber: expectedDisplay
      };
      await options.resolveContext({
        document: row,
        draft: JSON.parse(row.draft_json),
        sequence: seq,
        numberContext
      });
      return finalized || {
        ok: true,
        finalized: true,
        idempotent: false,
        document: { ...row, status: "finalized", number: expectedNumber, display_number: expectedDisplay },
        number: expectedNumber,
        displayNumber: expectedDisplay,
        snapshotSha256: "deadbeef",
        pdfStatus: "pending"
      };
    }
  };
}

const verifyAdmin = async () => ({ email: "sam@sdlive.show" });

test("finalize preview exposes only a prospective TEST number and safe summary", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize-preview?draftRev=3"),
    {},
    { verifyAdmin, finalizeGate: gateOverrides() }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.testOnly, true);
  assert.equal(body.production, false);
  assert.equal(body.seriesKey, "test:CC");
  assert.equal(body.displayNumber, "TEST-CC 7");
  assert.equal(body.draftRev, 3);
  assert.equal(body.signatureApplied, true);
  assert.equal(body.totalMinor, 375500000);
  assert.equal("signatureAsset" in body, false);
  assert.equal(JSON.stringify(body).includes("abc123"), false);
});

test("finalize POST accepts exactly draftRev + UUID finalizeKey and treats PDF as a separate failure domain", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftRev: 3, finalizeKey: UUID })
    }),
    {},
    { verifyAdmin, finalizeGate: gateOverrides() }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.finalized, true);
  assert.equal(body.displayNumber, "TEST-CC 7");
  assert.equal(body.pdfStatus, "pending");
  assert.equal(body.pdfEnabled, true);
  assert.equal(body.pdf.ok, false);
  assert.equal(body.pdf.pdfStatus, "failed");
  assert.equal(body.pdf.error, "documents_storage_unavailable");
  assert.equal(body.pdf.retryPath, "/api/admin/documents/doc-test-1/pdf");
  assert.equal(body.testOnly, true);
});

test("finalize POST rejects extra body keys and non-UUID keys", async () => {
  const extra = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftRev: 3, finalizeKey: UUID, seriesKey: "samuel:CC" })
    }),
    {},
    { verifyAdmin, finalizeGate: gateOverrides() }
  );
  assert.equal(extra.status, 400);
  assert.deepEqual(await extra.json(), { ok: false, error: "invalid_finalize_body" });

  const invalidKey = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftRev: 3, finalizeKey: "retry-1" })
    }),
    {},
    { verifyAdmin, finalizeGate: gateOverrides() }
  );
  assert.equal(invalidKey.status, 400);
  assert.deepEqual(await invalidKey.json(), { ok: false, error: "invalid_finalize_key" });
});

test("finalize refuses stale draftRev before consuming a number", async () => {
  let finalizeCalls = 0;
  const overrides = gateOverrides({ row: draftRow({ draft_rev: 4 }) });
  overrides.finalizeDocument = async () => { finalizeCalls += 1; throw new Error("should_not_finalize"); };
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftRev: 3, finalizeKey: UUID })
    }),
    {},
    { verifyAdmin, finalizeGate: overrides }
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { ok: false, error: "stale_draft_revision" });
  assert.equal(finalizeCalls, 0);
});

test("finalize re-checks draftRev inside the core resolver to close the confirmation race", async () => {
  const original = draftRow({ draft_rev: 3 });
  const changed = draftRow({ draft_rev: 4 });
  const overrides = gateOverrides({ row: original });
  overrides.finalizeDocument = async (_env, options) => {
    await options.resolveContext({
      document: changed,
      draft: JSON.parse(changed.draft_json),
      sequence: { series_key: "test:CC", issuer_id: "test", doc_type: "cc", is_test: 1 },
      numberContext: { seriesKey: "test:CC", number: 7, displayNumber: "TEST-CC 7" }
    });
    throw new Error("should_not_reach");
  };
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftRev: 3, finalizeKey: UUID })
    }),
    {},
    { verifyAdmin, finalizeGate: overrides }
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { ok: false, error: "stale_draft_revision" });
});

test("canonical real sequence is enabled while environment and issuer mismatches fail closed", async () => {
  const realRow = draftRow({ issuer_id: "samuel-cop" });
  const realSequence = {
    series_key: "samuel:CC",
    issuer_id: "samuel-cop",
    doc_type: "cc",
    next_value: 21,
    display_pattern: "{n}",
    is_test: 0
  };
  const realResponse = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize-preview?draftRev=3"),
    {},
    { verifyAdmin, finalizeGate: gateOverrides({ row: realRow, sequence: realSequence }) }
  );
  assert.equal(realResponse.status, 200);
  const realBody = await realResponse.json();
  assert.equal(realBody.testOnly, false);
  assert.equal(realBody.production, true);
  assert.equal(realBody.seriesKey, "samuel:CC");
  assert.equal(realBody.displayNumber, "21");

  const wrongEnvironment = gateOverrides({ sequence: {
    series_key: "test:CC",
    issuer_id: "test",
    doc_type: "cc",
    next_value: 7,
    display_pattern: "TEST-CC {n}",
    is_test: 0
  } });
  const wrongEnvironmentResponse = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize-preview?draftRev=3"),
    {},
    { verifyAdmin, finalizeGate: wrongEnvironment }
  );
  assert.equal(wrongEnvironmentResponse.status, 409);
  assert.deepEqual(await wrongEnvironmentResponse.json(), { ok: false, error: "sequence_environment_mismatch" });

  const mismatch = gateOverrides({ sequence: {
    series_key: "test:CC",
    issuer_id: "someone-else",
    doc_type: "cc",
    next_value: 7,
    display_pattern: "TEST-CC {n}",
    is_test: 1
  } });
  const mismatchResponse = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/doc-test-1/finalize-preview?draftRev=3"),
    {},
    { verifyAdmin, finalizeGate: mismatch }
  );
  assert.equal(mismatchResponse.status, 409);
  assert.deepEqual(await mismatchResponse.json(), { ok: false, error: "test_series_issuer_mismatch" });
});

test("policies enable canonical real numbering and correction chains", () => {
  const gate = documentsFinalizeGatePolicy();
  const api = documentsEditorApiPolicy();
  assert.equal(gate.testSeriesOnly, false);
  assert.equal(gate.testSeriesEnabled, true);
  assert.equal(gate.realSeriesEnabled, true);
  assert.equal(gate.realCorrectionRevisionsEnabled, true);
  assert.equal(gate.correctionConsumesBaseNumber, false);
  assert.equal(gate.requiresExactDraftRev, true);
  assert.equal(gate.rendersPdf, false);
  assert.equal(gate.bootstrapsRealSequences, false);
  assert.equal(gate.returnsSignatureBytes, false);
  assert.equal(api.finalizeTestSeriesOnly, false);
  assert.equal(api.testSeriesFinalizeEnabled, true);
  assert.equal(api.realSeriesFinalizeEnabled, true);
  assert.equal(api.correctionTestSeriesOnly, false);
  assert.equal(api.correctionTestSeriesEnabled, true);
  assert.equal(api.correctionRealSeriesEnabled, true);
  assert.equal(api.correctionConsumesBaseSequence, false);
  assert.equal(api.finalizeRendersPdf, true);
  assert.equal(api.pdfRetryEndpoint, true);
  assert.equal(api.pdfDownloadAuthenticated, true);
  assert.equal(api.pdfTestSeriesOnly, false);
  assert.equal(api.pdfRealSeriesEnabled, true);
});

test("confirmation UX distinguishes REAL from TEST and keeps same finalize key on retry", async () => {
  const management = await readFile(new URL("../admin/documents/management.js", import.meta.url), "utf8");
  const productionUx = await readFile(new URL("../admin/documents/production-active-ux.js", import.meta.url), "utf8");
  const index = await readFile(new URL("../admin/documents/index.html", import.meta.url), "utf8");
  assert.match(management, /finalizeKey = crypto\.randomUUID\(\)/);
  assert.match(management, /body: JSON\.stringify\(\{ draftRev: finalizePreview\.draftRev, finalizeKey \}\)/);
  assert.match(management, /button\.disabled = true/);
  assert.match(management, /Retry with same key/);
  assert.match(productionUx, /REAL document issue/);
  assert.match(productionUx, /Issue REAL document/);
  assert.match(productionUx, /TEST document issue/);
  assert.match(productionUx, /never reused/);
  assert.match(index, /production-active-ux\.js/);
});
