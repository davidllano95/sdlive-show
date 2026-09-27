import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "../documents-schema.js",
  "../documents-storage-preparation.js",
  "../documents-admin-storage-preparation.js"
];

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("Documents storage foundation never references Finance writes, CMS_DB or public media", () => {
  const joined = files.map(source).join("\n");
  for (const forbidden of [
    "CMS_DB",
    "MEDIA_BUCKET",
    "MEDIA_PUBLIC_BASE",
    "sheets.googleapis.com",
    "batchUpdate",
    "GOOGLE_FINANCE_SPREADSHEET_ID",
    "fetchGoogleAccessToken",
    "readFinanceRows"
  ]) {
    assert.doesNotMatch(joined, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("Documents storage routes are mounted only behind the existing Admin worker", () => {
  const worker = source("../admin-stabilization-worker.js");
  assert.match(worker, /handleDocumentsStorageApi/);
  assert.match(worker, /\/api\/admin\/documents\/storage-preflight/);
  assert.match(worker, /\/api\/admin\/documents\/storage-prepare/);
  assert.match(worker, /verifyAdmin: verifyAdminViaExistingApi/);
});

test("normal public runtime does not call Documents schema preparation", () => {
  const worker = source("../admin-stabilization-worker.js");
  assert.doesNotMatch(worker, /documentsSchemaSql/);
  assert.doesNotMatch(worker, /prepareDocumentsStorage\(/);
});
