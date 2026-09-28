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
  assert.match(ux, /Finalized · signed PDF requested/);
  assert.match(ux, /PDF ready · private artifact/);
  assert.match(ux, /retry is safe/);
});

test("PDF artifact UX cannot fight production finalize copy or create a characterData observer loop", () => {
  const artifacts = read("admin/documents/pdf-artifact-ux.js");
  const production = read("admin/documents/production-active-ux.js");
  assert.doesNotMatch(artifacts, /FINALIZE_WARNING_COPY/);
  assert.doesNotMatch(artifacts, /documents-finalize-warning/);
  assert.doesNotMatch(artifacts, /characterData:\s*true/);
  assert.match(artifacts, /new MutationObserver\(queueSync\)/);
  assert.match(artifacts, /requestAnimationFrame/);
  assert.match(artifacts, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(production, /documents-finalize-warning/);
  assert.match(production, /REAL document issue/);
  assert.match(production, /TEST document issue/);
});

test("draft documents prioritize live preview before the editor", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  assert.match(ux, /documents-draft-preview-first/);
  assert.match(ux, /\.documents-draft-preview-first \.preview-panel\{order:1/);
  assert.match(ux, /\.documents-draft-preview-first \.draft-editor\{order:2/);
  assert.match(ux, /shell\.classList\.add\("documents-draft-preview-first"\)/);
});

test("finalized documents bypass draft row handlers and prioritize PDF preview", () => {
  const ux = read("admin/documents/pdf-artifact-ux.js");
  const artifacts = read("documents-pdf-artifacts.js");
  assert.match(ux, /Issued \$\{environment\} artifact/);
  assert.match(ux, /function environmentLabel/);
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

test("state router clears stale PDF-ready UI and CSS cannot override hidden draft grid", () => {
  const router = read("admin/documents/state-router-fix.js");
  assert.match(router, /function installHiddenGuard\(\)/);
  assert.match(router, /\.document-editor-grid\[hidden\]\{display:none!important\}/);
  assert.match(router, /installHiddenGuard\(\)/);
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
