import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  documentsRevisionPolicy,
  requireRevisionSeries,
  revisionCodeFromIndex,
  revisionDisplayNumber,
  revisionSequenceKey
} from "../documents-revisions.js";
import { documentsCorrectionPolicy } from "../documents-corrections.js";
import { buildFinalizePreview } from "../documents-finalize-gate.js";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function sequenceEnv(rows) {
  return {
    DOCS_DB: {
      prepare() {
        return {
          bind(seriesKey) {
            return {
              async first() { return rows[seriesKey] || null; }
            };
          }
        };
      }
    }
  };
}

test("revision suffixes reserve A for original and begin corrections at B", () => {
  assert.equal(revisionCodeFromIndex(1), "B");
  assert.equal(revisionCodeFromIndex(2), "C");
  assert.equal(revisionCodeFromIndex(25), "Z");
  assert.equal(revisionCodeFromIndex(26), "AA");
  assert.equal(revisionDisplayNumber("TEST-INV 0004", "B"), "TEST-INV 0004-B");
  assert.equal(revisionDisplayNumber("0019", "B"), "0019-B");
  assert.equal(revisionDisplayNumber("21", "C"), "21-C");
  assert.equal(revisionSequenceKey("test:INV", 4), "revision:test:INV:4");
  assert.equal(revisionSequenceKey("samuel:INV", 19), "revision:samuel:INV:19");
});

test("revision drafts route through the generic preview without consuming the base sequence", async () => {
  const document = {
    id: "doc-revision",
    status: "draft",
    draft_rev: 2,
    supersedes_id: "doc-original",
    doc_type: "invoice",
    issuer_id: "samuel-usd",
    draft_json: JSON.stringify({ currency: "USD" })
  };
  let revisionPreviewCalled = false;
  const result = await buildFinalizePreview({}, {
    documentId: document.id,
    draftRev: 2
  }, {
    readDocument: async () => document,
    buildRevisionFinalizePreview: async (_env, input) => {
      revisionPreviewCalled = true;
      assert.equal(input.document.id, document.id);
      assert.equal(input.draft.currency, "USD");
      return { ok: true, revision: true, displayNumber: "0019-B", testOnly: false, production: true };
    }
  });
  assert.equal(revisionPreviewCalled, true);
  assert.equal(result.revision, true);
  assert.equal(result.displayNumber, "0019-B");
  assert.equal(result.testOnly, false);
  assert.equal(result.production, true);
});

test("canonical TEST and real roots are accepted while stale real identity fails closed", async () => {
  const env = sequenceEnv({
    "test:CC": { series_key: "test:CC", issuer_id: "test", doc_type: "cc", display_pattern: "TEST-CC {n}", is_test: 1 },
    "samuel:CC": { series_key: "samuel:CC", issuer_id: "samuel-cop", doc_type: "cc", display_pattern: "{n}", is_test: 0 },
    "samuel:INV": { series_key: "samuel:INV", issuer_id: "samuel-usd", doc_type: "invoice", display_pattern: "Invoice No. {n:04}", is_test: 0 }
  });

  const testRoot = await requireRevisionSeries(env, { series_key: "test:CC", issuer_id: "test", doc_type: "cc" });
  assert.equal(testRoot.testOnly, true);

  const realRoot = await requireRevisionSeries(env, { series_key: "samuel:CC", issuer_id: "samuel-cop", doc_type: "cc" });
  assert.equal(realRoot.testOnly, false);

  await assert.rejects(
    () => requireRevisionSeries(env, { series_key: "samuel:INV", issuer_id: "samuel-usd", doc_type: "invoice" }),
    /sequence_environment_mismatch/
  );
});

test("revision finalization preserves the base sequence and stores revised identity separately", () => {
  const source = read("documents-revisions.js");
  assert.match(source, /REVISION_SEQUENCE_PREFIX = "revision:"/);
  assert.match(source, /SET next_value = next_value \+ 1/);
  assert.match(source, /status = 'finalized', series_key = \?, number = NULL, display_number = \?/);
  assert.match(source, /superseded_by_id IS NULL/);
  assert.match(source, /revisionCode/);
  assert.match(source, /Number\(resolved\.rootSequence\.is_test\) === 1 \? 1 : 0/);
  assert.match(source, /counter\.display_pattern\) === "REV \{n\}"/);
  assert.match(source, /firstCorrectionSuffix: "B"/);
  assert.match(source, /consumesBaseSequenceNumber: false/);
});

test("correction creation clones the frozen draft and never increments the base sequence", () => {
  const source = read("documents-corrections.js");
  assert.match(source, /source\.draft_json \|\| "\{\}"/);
  assert.match(source, /supersedes_id/);
  assert.match(source, /correction_draft_created/);
  assert.match(source, /requireRevisionSeries/);
  assert.match(source, /nextBaseSequenceUnaffected: true/);
  assert.doesNotMatch(source, /SET next_value = next_value \+ 1/);
});

test("revision and correction policies enable canonical real chains without base-number consumption", () => {
  const revision = documentsRevisionPolicy();
  const correction = documentsCorrectionPolicy();
  assert.equal(revision.testSeriesOnly, false);
  assert.equal(revision.testSeriesEnabled, true);
  assert.equal(revision.realSeriesEnabled, true);
  assert.equal(revision.revisionCounterInheritsEnvironment, true);
  assert.equal(revision.consumesBaseSequenceNumber, false);
  assert.equal(correction.testSeriesOnly, false);
  assert.equal(correction.testSeriesEnabled, true);
  assert.equal(correction.realSeriesEnabled, true);
  assert.equal(correction.nextBaseSequenceUnaffected, true);
});

test("Documents Admin exposes generic correction info/create routes and correction UX", () => {
  const api = read("documents-admin-editor-api.js");
  const ux = read("admin/documents/revision-ux.js");
  const router = read("admin/documents/state-router-fix.js");
  assert.match(api, /correction-info/);
  assert.match(api, /\/corrections/);
  assert.match(api, /createCorrectionDraft/);
  assert.match(api, /readCorrectionInfo/);
  assert.match(ux, /Create correction/);
  assert.match(ux, /Open correction draft/);
  assert.match(ux, /nextDisplayNumber/);
  assert.match(ux, /sessionStorage\.setItem\(PENDING_KEY/);
  assert.match(router, /revision-ux\.js/);
});
