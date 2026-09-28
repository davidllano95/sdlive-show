import test from "node:test";
import assert from "node:assert/strict";

import { inspectDocumentsProductionPreflight } from "../documents-production-preflight.js";

async function sha256Hex(bytes) {
  const value = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readyOverrides(sequenceFor) {
  const bytes = new TextEncoder().encode("real-private-signature");
  const hash = await sha256Hex(bytes);
  return {
    storagePreflightFn: async () => ({
      ready: true,
      available: true,
      schema: { exact: true },
      testSequences: { ready: true },
      foreignKeyViolations: 0,
      blockers: []
    }),
    readIssuerFn: async (_env, issuerId) => ({ id: issuerId, active: 1, active_signature_id: `sig-${issuerId}` }),
    readSignatureFn: async (_env, signatureId) => ({
      id: signatureId,
      issuer_id: String(signatureId).replace(/^sig-/, ""),
      content_type: "image/png",
      sha256: hash,
      retired_at: null
    }),
    readSignatureObjectFn: async () => ({
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }),
    readSequenceFn: async (_env, seriesKey) => sequenceFor(seriesKey),
    readIssuedStateFn: async (_env, config, targetNumber) => ({
      maxSeriesNumber: config.docType === "cc" ? 21 : 19,
      maxIssuerTypeNumber: config.docType === "cc" ? 21 : 19,
      requestedNumberRows: targetNumber === (config.docType === "cc" ? 22 : 20) ? 0 : 1
    })
  };
}

test("production preflight stays READY after legitimate real-number advancement", async () => {
  const overrides = await readyOverrides((seriesKey) => seriesKey === "samuel:CC" ? {
    series_key: "samuel:CC",
    issuer_id: "samuel-cop",
    doc_type: "cc",
    next_value: 22,
    display_pattern: "{n}",
    is_test: 0
  } : {
    series_key: "samuel:INV",
    issuer_id: "samuel-usd",
    doc_type: "invoice",
    next_value: 20,
    display_pattern: "{n:04}",
    is_test: 0
  });

  const result = await inspectDocumentsProductionPreflight({}, overrides);
  assert.equal(result.ready, true);
  const cc = result.series.find((item) => item.seriesKey === "samuel:CC");
  const inv = result.series.find((item) => item.seriesKey === "samuel:INV");
  assert.equal(cc.existingNextValue, 22);
  assert.equal(cc.currentDisplay, "22");
  assert.equal(inv.existingNextValue, 20);
  assert.equal(inv.currentDisplay, "0020");
});

test("production preflight blocks a real sequence whose next value falls below its approved bootstrap floor", async () => {
  const overrides = await readyOverrides((seriesKey) => seriesKey === "samuel:CC" ? {
    series_key: "samuel:CC",
    issuer_id: "samuel-cop",
    doc_type: "cc",
    next_value: 20,
    display_pattern: "{n}",
    is_test: 0
  } : null);
  overrides.readIssuedStateFn = async () => ({ maxSeriesNumber: 0, maxIssuerTypeNumber: 0, requestedNumberRows: 0 });

  const result = await inspectDocumentsProductionPreflight({}, overrides);
  const cc = result.series.find((item) => item.seriesKey === "samuel:CC");
  assert.equal(result.ready, false);
  assert.equal(cc.ready, false);
  assert.equal(cc.blocker, "existing_sequence_next_value_below_bootstrap");
});
