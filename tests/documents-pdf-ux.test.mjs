import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents Admin loads PDF artifact UX and no longer describes PDF as a future gate", () => {
  const stabilization = read("admin/admin-stabilization.js");
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(stabilization, /pdf-artifact-ux\.js/);
  assert.match(ux, /signed PDF is generated automatically from the frozen snapshot/);
  assert.match(ux, /artifact failure never releases the number and can be retried/);
  assert.match(ux, /Real CC\/INV series remain locked/);
  assert.match(ux, /Finalized · signed PDF generation requested/);
});

test("PDF pipeline uses Cloudflare Browser Run Quick Action with raw final HTML", () => {
  const source = read("documents-pdf-artifacts.js");
  assert.match(source, /quickAction\("pdf",\s*\{/);
  assert.match(source, /html,/);
  assert.match(source, /printBackground:\s*true/);
  assert.match(source, /preferCSSPageSize:\s*true/);
  assert.match(source, /pdf_status = 'ready'/);
  assert.match(source, /pdf_status = 'failed'/);
  assert.match(source, /Cache-Control"?:\s*"private, no-store, max-age=0"/);
});
