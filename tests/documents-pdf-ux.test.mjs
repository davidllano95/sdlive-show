import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents Admin loads PDF artifact UX and deterministic state router", () => {
  const stabilization = read("admin/admin-stabilization.js");
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(stabilization, /pdf-artifact-ux\.js/);
  assert.match(stabilization, /state-router-fix\.js/);
  assert.match(ux, /signed PDF is generated automatically from the frozen snapshot/);
  assert.match(ux, /artifact failure never releases the number and can be retried/);
  assert.match(ux, /Real CC\/INV series remain locked/);
  assert.match(ux, /Finalized · signed PDF requested/);
});

test("PDF artifact UX does not create a self-triggering MutationObserver loop", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(ux, /const FINALIZE_WARNING_COPY =/);
  assert.match(ux, /warning\.textContent !== FINALIZE_WARNING_COPY/);
  assert.match(ux, /warning\.textContent = FINALIZE_WARNING_COPY/);
});

test("draft documents prioritize live preview before the editor", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(ux, /documents-draft-preview-first/);
  assert.match(ux, /\.documents-draft-preview-first \.preview-panel\{order:1/);
  assert.match(ux, /\.documents-draft-preview-first \.draft-editor\{order:2/);
  assert.match(ux, /shell\.classList\.add\("documents-draft-preview-first"\)/);
});

test("finalized TEST documents bypass draft row handlers and prioritize PDF preview", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  const artifacts = read("documents-pdf-artifacts.js");
  assert.match(ux, /Issued TEST artifact/);
  assert.match(ux, /snapshot frozen/);
  assert.match(ux, /draft editor is disabled for issued documents/i);
  assert.match(ux, /Download PDF/);
  assert.match(ux, /Retry PDF/);
  assert.match(ux, /data-issued-pdf-frame/);
  assert.match(ux, /Finalized PDF preview/);
  assert.match(ux, /frame\.src = `\$\{pdfPath\}#view=FitH`/);
  assert.match(ux, /download\.download =/);
  assert.match(artifacts, /"Content-Disposition": `inline; filename=/);
  assert.match(ux, /<div class="documents-issued-status" data-issued-status>Checking signed PDF…<\/div>[\s\S]*data-issued-preview[\s\S]*<h4>/);
  assert.match(ux, /shell\.classList\.remove\("documents-draft-preview-first"\)/);
  assert.match(ux, /function installRegistryCapture\(\)/);
  assert.match(ux, /list\.addEventListener\("click", async \(event\) =>/);
  assert.match(ux, /event\.stopImmediatePropagation\(\)/);
  assert.match(ux, /await showIssuedDocument\(info\)/);
});

test("state router clears stale PDF-ready UI for new/draft views and hides draft grid immediately for issued rows", () => {
  const router = read("admin/documents/state-router-fix.js");
  assert.match(router, /function resetIssuedState\(\)/);
  assert.match(router, /panel\.replaceChildren\(\)/);
  assert.match(router, /panel\.hidden = true/);
  assert.match(router, /grid\.hidden = false/);
  assert.match(router, /target\.closest\("#newDraft"\)/);
  assert.match(router, /status === "draft"/);
  assert.match(router, /function prepareIssuedState\(\)/);
  assert.match(router, /grid\.hidden = true/);
  assert.match(router, /document\.addEventListener\("click", \(event\) =>/);
  assert.match(router, /}, true\);/);
});

test("international draft UX removes FX date and states rate as 1 USD to original currency", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(ux, /\.line-exchange-rate-date/);
  assert.match(ux, /closest\("\.line-field"\)\?\.remove\(\)/);
  assert.match(ux, /FX rate · 1 USD = original currency \(optional\)/);
  assert.match(ux, /e\.g\. 0\.92/);
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
