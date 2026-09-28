import test from "node:test";
import assert from "node:assert/strict";

import {
  documentsProductionPreflightPolicy,
  inspectDocumentsProductionPreflight
} from "../documents-production-preflight.js";

async function sha256Hex(bytes) {
  const value = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readyOverrides(bytes, hash) {
  return {
    storagePreflightFn: async () => ({ ready: true }),
    readIssuerFn: async (_env, issuerId) => ({ id: issuerId, active: 1, active_signature_id: "sig-real" }),
    readSignatureFn: async () => ({
      id: "sig-real",
      issuer_id: "samuel",
      content_type: "image/png",
      sha256: hash,
      retired_at: null
    }),
    readSignatureObjectFn: async () => ({
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }),
    readSequenceFn: async () => null,
    readIssuedStateFn: async () => ({ maxSeriesNumber: 0, maxIssuerTypeNumber: 0, requestedNumberRows: 0 })
  };
}

test("production preflight is read-only and passes clean planned real state", async () => {
  const bytes = new TextEncoder().encode("real-private-signature");
  const hash = await sha256Hex(bytes);
  const result = await inspectDocumentsProductionPreflight({}, readyOverrides(bytes, hash));

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.ready, true);
  assert.equal(result.bootstrapEnabled, false);
  assert.equal(result.signatures[0].hashVerified, true);
  assert.equal("r2Key" in result.signatures[0], false);
  assert.equal("bytes" in result.signatures[0], false);

  const cc = result.series.find((item) => item.seriesKey === "samuel:CC");
  const inv = result.series.find((item) => item.seriesKey === "samuel:INV");
  assert.equal(cc.intendedNextValue, 21);
  assert.equal(cc.intendedDisplay, "21");
  assert.equal(cc.displayPattern, "{n}");
  assert.equal(inv.intendedNextValue, 19);
  assert.equal(inv.intendedDisplay, "0019");
  assert.equal(inv.displayPattern, "{n:04}");
});

test("production preflight blocks number collisions", async () => {
  const bytes = new TextEncoder().encode("real-private-signature");
  const hash = await sha256Hex(bytes);
  const overrides = readyOverrides(bytes, hash);
  overrides.readIssuedStateFn = async (_env, config) => ({
    maxSeriesNumber: config.docType === "cc" ? 21 : 0,
    maxIssuerTypeNumber: config.docType === "cc" ? 21 : 0,
    requestedNumberRows: config.docType === "cc" ? 1 : 0
  });

  const result = await inspectDocumentsProductionPreflight({}, overrides);
  const cc = result.series.find((item) => item.seriesKey === "samuel:CC");
  assert.equal(result.ready, false);
  assert.equal(cc.ready, false);
  assert.equal(cc.blocker, "requested_number_collision");
});

test("production preflight blocks an existing sequence with stale identity or next value", async () => {
  const bytes = new TextEncoder().encode("real-private-signature");
  const hash = await sha256Hex(bytes);
  const overrides = readyOverrides(bytes, hash);
  overrides.readSequenceFn = async (_env, seriesKey) => seriesKey === "samuel:INV" ? {
    series_key: "samuel:INV",
    issuer_id: "samuel",
    doc_type: "invoice",
    next_value: 20,
    display_pattern: "Invoice No. {n:04}",
    is_test: 0
  } : null;

  const result = await inspectDocumentsProductionPreflight({}, overrides);
  const inv = result.series.find((item) => item.seriesKey === "samuel:INV");
  assert.equal(result.ready, false);
  assert.equal(inv.ready, false);
  assert.equal(inv.blocker, "existing_sequence_identity_mismatch");
});

test("production preflight blocks signature hash mismatch", async () => {
  const bytes = new TextEncoder().encode("real-private-signature");
  const overrides = readyOverrides(bytes, "0".repeat(64));
  const result = await inspectDocumentsProductionPreflight({}, overrides);
  assert.equal(result.ready, false);
  assert.equal(result.signatures[0].blocker, "signature_hash_mismatch");
});

test("production preflight policy exposes no bootstrap/write capability", () => {
  const policy = documentsProductionPreflightPolicy();
  assert.equal(policy.readOnly, true);
  assert.equal(policy.writesDatabase, false);
  assert.equal(policy.writesBucket, false);
  assert.equal(policy.bootstrapEnabled, false);
  assert.equal(policy.verifiesPrivateSignatureObject, true);
  assert.equal(policy.exposesPrivateSignatureKey, false);
  assert.equal(policy.exposesSignatureBytes, false);
});
