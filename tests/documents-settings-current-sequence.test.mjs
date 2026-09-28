import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents settings expose and render current active real sequence values", () => {
  const api = read("documents-admin-profiles-api.js");
  const ui = read("admin/documents/documents.js");
  assert.match(api, /currentNextValue: bootstrapped \? Number\(existing\.nextValue\) : null/);
  assert.match(ui, /Current next \$\{seq\.currentNextValue\}/);
  assert.match(ui, /seq\.bootstrapped \? "ACTIVE" : "LOCKED"/);
});
