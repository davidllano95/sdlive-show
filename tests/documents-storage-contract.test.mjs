import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
  documentsStoragePolicy,
  finalizeSqlContract
} from "../documents-storage.js";

test("finalize SQL contract uses sequence CAS and draft revision guard", () => {
  const sql = finalizeSqlContract();
  assert.match(sql.sequenceCas, /WHERE series_key = \? AND next_value = \?/);
  assert.match(sql.finalizeDraft, /status = 'draft'/);
  assert.match(sql.finalizeDraft, /draft_rev = \?/);
  assert.match(sql.finalizeDraft, /snapshot_json = \?/);
  assert.match(sql.finalizeDraft, /snapshot_sha256 = \?/);
  assert.match(sql.finalizeDraft, /finalize_key = \?/);
  assert.match(sql.finalizeDraft, /pdf_status = 'pending'/);
  assert.match(sql.finalizeDraft, /next_value = \?/);
  assert.match(sql.finalizedEventGuard, /CASE WHEN changes\(\) = 1 THEN 'finalized' ELSE NULL END/);
});

test("storage policy preserves numbering and Finance boundaries", () => {
  const policy = documentsStoragePolicy();
  assert.equal(policy.draftsConsumeNumbers, false);
  assert.equal(policy.finalizeUsesBatchTransaction, true);
  assert.equal(policy.finalizeUsesSequenceCas, true);
  assert.equal(policy.finalizeIsIdempotentByKey, true);
  assert.equal(policy.pdfFailureMayReleaseNumber, false);
  assert.equal(policy.realBootstrapRequiresExplicitConfirmation, true);
  assert.equal(policy.realBootstrapMayLowerSequence, false);
  assert.equal(policy.writesGoogleSheets, false);
  assert.equal(DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION, "BOOTSTRAP_DOCUMENT_SEQUENCE");
});
