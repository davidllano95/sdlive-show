import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents loads dedicated mobile webapp CSS and JS", () => {
  const router = read("admin/documents/state-router-fix.js");
  assert.match(router, /mobile-webapp\.css\?v=20260928-1/);
  assert.match(router, /mobile-webapp\.js\?v=20260928-1/);
  assert.match(router, /loadMobileWebappUx\(\)/);
});

test("mobile Documents UX uses iOS safe-area and app-like viewport metadata", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp.css");
  assert.match(source, /viewport-fit=cover/);
  assert.match(source, /interactive-widget=resizes-content/);
  assert.match(source, /apple-mobile-web-app-capable/);
  assert.match(source, /black-translucent/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /100vw/);
});

test("mobile Documents editor provides Preview and Edit modes plus fullscreen preview", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp.css");
  assert.match(source, /documentsMobileEditorMode/);
  assert.match(source, /data-mode="preview"/);
  assert.match(source, /data-mode="edit"/);
  assert.match(source, /documentsMobilePreviewFullscreen/);
  assert.match(source, /documents-preview-fullscreen/);
  assert.match(css, /documents-mobile-mode-preview \.draft-editor\{display:none!important\}/);
  assert.match(css, /documents-mobile-mode-edit \.preview-panel\{display:none!important\}/);
});

test("mobile Documents uses touch-sized controls without another MutationObserver", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp.css");
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(css, /--documents-touch:46px/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /\.draft-actions\{/);
  assert.match(css, /position:sticky/);
  assert.match(css, /documents-finalize-dialog/);
});

test("iPad landscape keeps a dual editor and preview workspace", () => {
  const css = read("admin/documents/mobile-webapp.css");
  assert.match(css, /@media \(min-width:821px\) and \(max-width:1200px\)/);
  assert.match(css, /grid-template-columns:minmax\(360px,\.82fr\) minmax\(470px,1\.18fr\)/);
});
