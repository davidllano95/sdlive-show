import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Documents loads dedicated mobile webapp layers and JS", () => {
  const router = read("admin/documents/state-router-fix.js");
  assert.match(router, /mobile-webapp\.css\?v=20260928-1/);
  assert.match(router, /mobile-webapp-v2\.css\?v=20260928-2/);
  assert.match(router, /mobile-webapp-v3\.css\?v=20260928-1/);
  assert.match(router, /mobile-webapp-v4\.css\?v=20260928-1/);
  assert.match(router, /mobile-settings-polish\.css\?v=20260928-1/);
  assert.match(router, /mobile-webapp\.js\?v=20260928-2/);
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

test("mobile draft header and Preview Edit rail are fixed to the viewport top", () => {
  const css = read("admin/documents/mobile-webapp-v3.css");
  assert.match(css, /body\.documents-mobile-editor-open \.editor-toolbar\{\s*position:fixed!important/);
  assert.match(css, /body\.documents-mobile-editor-open \.documents-mobile-editor-mode\{\s*position:fixed!important/);
  assert.match(css, /left:0!important;right:0!important/);
  assert.match(css, /\.document-editor-grid\{\s*padding-top:101px!important/);
  assert.match(css, /env\(safe-area-inset-top\)/);
});

test("open mobile drafts replace translucent Admin topbar with one solid app shell", () => {
  const css = read("admin/documents/mobile-webapp-v4.css");
  assert.match(css, /\.backoffice:not\(\.editor-backoffice\) \.topbar\{\s*display:none!important/);
  assert.match(css, /\.admin-mobile-menu-toggle\{/);
  assert.match(css, /background:#0b0d14!important/);
  assert.match(css, /\.editor-toolbar\{/);
  assert.match(css, /top:0!important/);
  assert.match(css, /padding-top:calc\(env\(safe-area-inset-top\) \+ 6px\)!important/);
  assert.match(css, /\.documents-mobile-editor-mode\{/);
  assert.match(css, /padding-top:calc\(105px \+ env\(safe-area-inset-top\)\)!important/);
});

test("mobile Documents uses a real fixed Save Finalize dock", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp-v2.css");
  assert.match(source, /documentsMobileActionDock/);
  assert.match(source, /data-mobile-action="save"/);
  assert.match(source, /data-mobile-action="finalize"/);
  assert.match(source, /document\.getElementById\("saveDraft"\)\?\.click\(\)/);
  assert.match(source, /document\.getElementById\("finalizeDraft"\)\?\.click\(\)/);
  assert.match(css, /\.documents-mobile-action-dock\{\s*position:fixed/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /body\.documents-mobile-editor-open \.draft-actions\{display:none!important\}/);
});

test("mobile date controls cannot overflow their cards", () => {
  const css = read("admin/documents/mobile-webapp-v2.css");
  assert.match(css, /input\[type="date"\]/);
  assert.match(css, /min-inline-size:0!important/);
  assert.match(css, /inline-size:100%!important/);
  assert.match(css, /::-webkit-date-and-time-value/);
  assert.match(css, /\.draft-line \.line-field/);
});

test("mobile editor collapses prefilled identity sections and hides registry while editing", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp-v2.css");
  assert.match(source, /collapsedByDefault = key === "issuer" \|\| key === "client"/);
  assert.match(source, /documents-mobile-fieldset-toggle/);
  assert.match(source, /documents-mobile-editor-open/);
  assert.match(css, /body\.documents-mobile-editor-open \.documents-registry-layout\{display:none!important\}/);
  assert.match(css, /fieldset\.is-mobile-collapsed>:not\(legend\)\{display:none!important\}/);
});

test("mobile Settings keeps navigation chrome opaque and compacts health cards", () => {
  const css = read("admin/documents/mobile-settings-polish.css");
  assert.match(css, /#settingsWorkspace:not\(\[hidden\]\)/);
  assert.match(css, /background:#06070b!important/);
  assert.match(css, /#sequenceList \.sequence-item/);
  assert.match(css, /documents-production-preflight__row/);
  assert.match(css, /documents-test-cleanup/);
  assert.match(css, /padding-bottom:calc\(120px \+ env\(safe-area-inset-bottom\)\)/);
});

test("mobile Documents avoids another MutationObserver", () => {
  const source = read("admin/documents/mobile-webapp.js");
  const css = read("admin/documents/mobile-webapp.css");
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(css, /--documents-touch:46px/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /documents-finalize-dialog/);
});

test("iPad landscape keeps a dual editor and preview workspace", () => {
  const css = read("admin/documents/mobile-webapp.css");
  assert.match(css, /@media \(min-width:821px\) and \(max-width:1200px\)/);
  assert.match(css, /grid-template-columns:minmax\(360px,\.82fr\) minmax\(470px,1\.18fr\)/);
});
