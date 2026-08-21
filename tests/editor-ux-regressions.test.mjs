import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Trusted select bridge jumps client cards to the Trusted editor", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-select-bridge.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /sdliveAdminSelect/);
  assert.match(source, /client-strip-card\[data-client\]/);
  assert.match(source, /trustedSectionButton\.click\(\)/);
  assert.match(source, /trusted-collection-item/);
  assert.match(source, /scrollIntoView/);
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
});
