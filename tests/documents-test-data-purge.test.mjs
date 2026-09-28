import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DOCUMENTS_TEST_PURGE_CONFIRMATION,
  documentsTestDataPurgePolicy,
  purgeDocumentsTestData
} from "../documents-test-data-purge.js";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TEST data purge policy is admin-only, dry-run fingerprinted and excludes real data", () => {
  const policy = documentsTestDataPurgePolicy();
  assert.equal(policy.adminOnly, true);
  assert.equal(policy.dryRunRequired, true);
  assert.equal(policy.fingerprintRequired, true);
  assert.equal(policy.exactConfirmation, DOCUMENTS_TEST_PURGE_CONFIRMATION);
  assert.equal(policy.deletesRealDocuments, false);
  assert.equal(policy.deletesRealSequences, false);
  assert.equal(policy.deletesIssuerProfiles, false);
  assert.equal(policy.deletesSignatureAssets, false);
  assert.equal(policy.resetsTestSequencesToOne, true);
});

test("TEST purge refuses to touch storage without exact owner confirmation", async () => {
  await assert.rejects(
    purgeDocumentsTestData({}, { confirmation: "wrong", fingerprint: "abc" }),
    /explicit_test_purge_confirmation_required/
  );
});

test("TEST purge source is scoped to TEST issuer/root series and resets only TEST roots", () => {
  const source = read("documents-test-data-purge.js");
  assert.match(source, /issuer_id = 'test'/);
  assert.match(source, /series_key IN \('test:CC', 'test:INV'\)/);
  assert.match(source, /revision:test:CC:%/);
  assert.match(source, /revision:test:INV:%/);
  assert.match(source, /series_key = 'test:CC'/);
  assert.match(source, /series_key = 'test:INV'/);
  assert.match(source, /SET next_value = 1/);
  assert.doesNotMatch(source, /DELETE FROM doc_sequences[^`]*samuel:CC/s);
  assert.doesNotMatch(source, /DELETE FROM doc_sequences[^`]*samuel:INV/s);
});

test("issued TEST deletion temporarily removes and restores immutable-delete triggers in one D1 batch", () => {
  const source = read("documents-test-data-purge.js");
  assert.match(source, /DROP TRIGGER IF EXISTS doc_events_no_delete/);
  assert.match(source, /DROP TRIGGER IF EXISTS doc_no_delete_issued/);
  assert.match(source, /triggerSql\("doc_no_delete_issued"\)/);
  assert.match(source, /triggerSql\("doc_events_no_delete"\)/);
  assert.match(source, /await store\.batch\(statements\)/);
});

test("TEST purge dry-run blocks real references and requires state fingerprint", () => {
  const source = read("documents-test-data-purge.js");
  assert.match(source, /real_document_references_test_document/);
  assert.match(source, /test_purge_preflight_changed/);
  assert.match(source, /fingerprint/);
  assert.match(source, /privateArtifacts/);
});

test("authenticated Documents API exposes TEST dry-run and purge with explicit policy", () => {
  const api = read("documents-admin-profiles-api.js");
  assert.match(api, /\/test-data-preflight/);
  assert.match(api, /\/test-data-purge/);
  assert.match(api, /inspectDocumentsTestDataPurge/);
  assert.match(api, /purgeDocumentsTestData/);
  assert.match(api, /testDataPurgeRequiresDryRunFingerprint:\s*true/);
  assert.match(api, /testDataPurgeCanDeleteRealDocuments:\s*false/);
});

test("TEST cleanup UI hides destructive action when the workspace is already clean", () => {
  const ux = read("admin/documents/test-cleanup-ux.js");
  const router = read("admin/documents/state-router-fix.js");
  assert.match(ux, /Scan TEST data/);
  assert.match(ux, /Purge verified TEST data/);
  assert.match(ux, /PURGE_DOCUMENTS_TEST_DATA/);
  assert.match(ux, /lastPreflight\.fingerprint/);
  assert.match(ux, /REAL sequences samuel:CC and samuel:INV are excluded/);
  assert.match(ux, /setPurgeVisibility/);
  assert.match(ux, /documents-test-cleanup__purge\[hidden\]\{display:none!important\}/);
  assert.match(ux, /setPurgeVisibility\(purgeButton, Boolean\(data\.ready && hasAnything\)\)/);
  assert.doesNotMatch(ux, /MutationObserver/);
  assert.match(router, /test-cleanup-ux\.js\?v=20260928-2/);
});
