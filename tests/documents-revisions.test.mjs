import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  revisionCodeFromIndex,
  revisionDisplayNumber,
  revisionSequenceKey
} from "../documents-revisions.js";
import { buildTestFinalizePreview } from "../documents-finalize-gate.js";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("revision suffixes reserve A for original and begin corrections at B", () => {
  assert.equal(revisionCodeFromIndex(1), "B");
  assert.equal(revisionCodeFromIndex(2), "C");
  assert.equal(revisionCodeFromIndex(25), "Z");
  assert.equal(revisionCodeFromIndex(26), "AA");
  assert.equal(revisionDisplayNumber("TEST-INV 0004", "B"), "TEST-INV 0004-B");
  assert.equal(revisionSequenceKey("test:INV", 4), "revision:test:INV:4");
});

test("revision drafts route to revision preview instead of consuming the base test sequence", async () => {
  const document = {
    id: "doc-revision",
    status: "draft",
    draft_rev: 2,
    supersedes_id: "doc-original",
    doc_type: "invoice",
    issuer_id: "test",
    draft_json: JSON.stringify({ currency: "USD" })
  };
  let revisionPreviewCalled = false;
  const result = await buildTestFinalizePreview({}, {
    documentId: document.id,
    draftRev: 2
  }, {
    readDocument: async () => document,
    buildTestRevisionFinalizePreview: async (_env, input) => {
      revisionPreviewCalled = true;
      assert.equal(input.document.id, document.id);
      assert.equal(input.draft.currency, "USD");
      return { ok: true, revision: true, displayNumber: "TEST-INV 0004-B" };
    }
  });
  assert.equal(revisionPreviewCalled, true);
  assert.equal(result.revision, true);
  assert.equal(result.displayNumber, "TEST-INV 0004-B");
});

test("revision finalization preserves the base sequence and stores revised identity separately", () => {
  const source = read("documents-revisions.js");
  assert.match(source, /REVISION_SEQUENCE_PREFIX = "revision:"/);
  assert.match(source, /SET next_value = next_value \+ 1/);
  assert.match(source, /status = 'finalized', series_key = \?, number = NULL, display_number = \?/);
  assert.match(source, /superseded_by_id IS NULL/);
  assert.match(source, /revisionCode/);
  assert.match(source, /firstCorrectionSuffix: "B"/);
  assert.match(source, /consumesBaseSequenceNumber: false/);
});

test("correction creation clones the frozen draft and never increments the base sequence", () => {
  const source = read("documents-corrections.js");
  assert.match(source, /source\.draft_json \|\| "\{\}"/);
  assert.match(source, /supersedes_id/);
  assert.match(source, /correction_draft_created/);
  assert.match(source, /nextBaseSequenceUnaffected: true/);
  assert.doesNotMatch(source, /SET next_value = next_value \+ 1/);
});

test("Documents Admin exposes correction info/create routes and correction UX", () => {
  const api = read("documents-admin-editor-api.js");
  const ux = read("admin/documents/revision-ux.js");
  const router = read("admin/documents/state-router-fix.js");
  assert.match(api, /correction-info/);
  assert.match(api, /\/corrections/);
  assert.match(api, /createTestCorrectionDraft/);
  assert.match(ux, /Create correction/);
  assert.match(ux, /Open correction draft/);
  assert.match(ux, /nextDisplayNumber/);
  assert.match(ux, /sessionStorage\.setItem\(PENDING_KEY/);
  assert.match(router, /revision-ux\.js/);
});
