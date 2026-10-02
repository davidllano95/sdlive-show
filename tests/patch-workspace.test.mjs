import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../admin/patch/index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../admin/patch/patch.js", import.meta.url), "utf8");
const storage = readFileSync(new URL("../admin/patch/patch-storage.js", import.meta.url), "utf8");

test("Patch Smoke workspace is an isolated local-first Admin surface", () => {
  assert.match(html, /Patch Smoke · SD\.Live Admin/);
  assert.match(html, /Smoke 0\.1/);
  assert.match(html, /local-only/i);
  assert.match(html, /type="module" src="\.\/patch\/patch\.js/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /WebSocket/);
  assert.match(storage, /indexedDB\.open/);
});

test("Input List and System View are projections mounted by the same runtime", () => {
  assert.match(html, /id="routeRows"/);
  assert.match(html, /id="systemView"/);
  assert.match(script, /projectRouteRows\(project\)/);
  assert.match(script, /renderRows\(rows, validation\)/);
  assert.match(script, /renderSystem\(rows\)/);
});

test("workspace exposes explicit Save plus autosave states", () => {
  assert.match(html, /id="savePatch"/);
  assert.match(script, /AUTOSAVE_DELAY_MS/);
  assert.match(script, /Unsaved changes/);
  assert.match(script, /Saving…/);
  assert.match(script, /Saved locally/);
  assert.match(script, /Save failed/);
});
