import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Trusted Select routes by stable editor keys without reactivating an already-active section", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-select-bridge.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /data-trusted-editor-key/);
  assert.match(source, /section:title/);
  assert.match(source, /client:\$\{clientIndex\}/);
  assert.match(source, /reveal:\$\{clientIndex\}/);
  assert.match(source, /item:\$\{clientIndex\}:\$\{itemIndex\}/);
  assert.match(source, /supported-brand-tile/);
  assert.match(source, /collaboration-credit/);
  assert.match(source, /trusted-subitem/);
  assert.match(source, /if \(!isTrustedActive\(\)\)\s*\{\s*trustedSectionButton\.click\(\)/);
  assert.match(source, /block:\s*"center"/);
});

test("Editor plugin loader keeps Trusted helpers in deterministic order", async () => {
  const source = await readFile(
    new URL("../admin/editor/admin-shell.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /script\.async = false/);
  assert.ok(
    source.indexOf("trusted-editor.js") <
      source.indexOf("trusted-select-bridge.js")
  );
  assert.ok(
    source.indexOf("trusted-select-bridge.js") <
      source.indexOf("trusted-media-controls.js")
  );
  assert.ok(
    source.indexOf("trusted-brand-placement.js") <
      source.indexOf("trusted-preview-parity.js")
  );
});

test("Editor toast stack is offset away from inspector actions", async () => {
  const css = await readFile(
    new URL("../admin/editor/editor-ux.css", import.meta.url),
    "utf8"
  );

  assert.match(css, /\.toast-stack/);
  assert.match(css, /right:\s*calc\(var\(--inspector\) \+ 34px\)/);
});

test("Manual carousel pause guards delayed hover resume", async () => {
  const source = await readFile(
    new URL("../trusted-marquee-interactions.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /manualPaused/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /data-interaction-paused/);
  assert.match(source, /enforceManualPause/);
  assert.match(
    source,
    /setTrustedMarqueePaused[\s\S]*bindManualPauseGuard\(marquee\)/
  );
});

test("Trusted preview transport preserves pause and carousel phase across editor rebuilds", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-preview-controls.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /let manualPaused = false/);
  assert.match(source, /let savedProgress = null/);
  assert.match(source, /captureCarouselProgress/);
  assert.match(source, /restoreCarouselProgress/);
  assert.match(source, /restoreCarouselStateAfterPreviewChange/);
  assert.match(source, /previewObserver\.observe\(section/);
  assert.match(source, /setPauseOnTarget\(target, manualPaused\)/);
  assert.match(source, /manualPaused = !manualPaused/);
});

test("Desktop Admin preview reasserts the published Wonderlust two-row layout", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-preview-parity.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /data-sdlive-admin-device/);
  assert.match(source, /supported-reveal-logos--wonderlust/);
  assert.match(source, /repeat\(15, minmax\(0, 1fr\)\)/);
  assert.match(source, /grid-column: span 5/);
  assert.match(source, /grid-column: span 3/);
  assert.match(source, /height: 92px/);
  assert.match(source, /height: 72px/);
});
