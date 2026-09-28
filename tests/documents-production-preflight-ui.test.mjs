import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents Admin exposes authenticated read-only production preflight", () => {
  const api = read("documents-admin-profiles-api.js");
  const ux = read("admin/documents/production-preflight-ux.js");
  const stabilization = read("admin/admin-stabilization.js");

  assert.match(api, /\/production-preflight/);
  assert.match(api, /request\.method === "GET"/);
  assert.match(api, /inspectDocumentsProductionPreflight/);
  assert.match(api, /realSequenceBootstrapExposed:\s*false/);
  assert.match(api, /productionPreflightReadOnly:\s*true/);

  assert.match(ux, /Run production preflight/);
  assert.match(ux, /performs no writes/);
  assert.match(ux, /Documents storage/);
  assert.match(ux, /DOCS_DB \+ DOCS_BUCKET available/);
  assert.match(ux, /It cannot bootstrap or issue a real number/);
  assert.match(ux, /credentials:\s*"include"/);
  assert.match(stabilization, /production-preflight-ux\.js/);
});
