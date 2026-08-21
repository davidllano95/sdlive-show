import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Trusted select bridge routes clients and supported brands to exact editor items", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-select-bridge.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /sdliveAdminSelect/);
  assert.match(source, /client-strip-card\[data-client\]/);
  assert.match(source, /supported-brand-tile/);
  assert.match(source, /collaboration-credit/);
  assert.match(source, /trusted-subitem/);
  assert.match(source, /data-trusted-path\$=\"\.src\"/);
  assert.match(source, /cmsMediaSource/);
  assert.match(source, /trustedSectionButton\.click\(\)/);
  assert.match(source, /trusted-collection-item/);
  assert.match(source, /trusted-reveal-editor/);
  assert.match(source, /:scope > \.trusted-item-head/);
  assert.match(source, /block:\s*"start"/);
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

test("Trusted preview transport preserves manual Pause across editor rebuilds", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-preview-controls.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /let manualPaused = false/);
  assert.match(source, /restorePauseAfterPreviewChange/);
  assert.match(source, /previewObserver\.observe\(section/);
  assert.match(source, /setPauseOnTarget\(target, manualPaused\)/);
  assert.match(source, /manualPaused = !manualPaused/);
});
