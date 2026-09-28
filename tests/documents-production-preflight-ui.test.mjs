import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents Admin exposes read-only preflight plus owner-authorized real bootstrap", () => {
  const api = read("documents-admin-profiles-api.js");
  const ux = read("admin/documents/production-preflight-ux.js");
  const stabilization = read("admin/admin-stabilization.js");

  assert.match(api, /\/production-preflight/);
  assert.match(api, /request\.method === "GET"/);
  assert.match(api, /inspectDocumentsProductionPreflight/);
  assert.match(api, /\/production-bootstrap/);
  assert.match(api, /request\.method === "POST"/);
  assert.match(api, /bootstrapDocumentsProduction/);
  assert.match(api, /realSequenceBootstrapExposed:\s*true/);
  assert.match(api, /productionBootstrapRequiresReadyPreflight:\s*true/);
  assert.match(api, /productionPreflightReadOnly:\s*true/);

  assert.match(ux, /Run production preflight/);
  assert.match(ux, /Reading production Documents state\. This operation performs no writes/);
  assert.match(ux, /Documents storage/);
  assert.match(ux, /DOCS_DB \+ DOCS_BUCKET available/);
  assert.match(ux, /Bootstrap real series · CC 21 \+ INV 0019/);
  assert.match(ux, /BOOTSTRAP_SAMUEL_CC_21_AND_INV_0019/);
  assert.match(ux, /method:\s*"POST"/);
  assert.match(ux, /does NOT issue a document, generate a PDF, or consume either number/);
  assert.match(ux, /credentials:\s*"include"/);
  assert.match(stabilization, /production-preflight-ux\.js/);
});
