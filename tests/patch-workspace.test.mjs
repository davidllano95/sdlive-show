import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../admin/patch/index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../admin/patch/patch.js", import.meta.url), "utf8");
const storage = readFileSync(new URL("../admin/patch/patch-storage.js", import.meta.url), "utf8");

test("Patch Smoke remains isolated local-first while moving to spreadsheet UX", () => {
  assert.match(html, /Spreadsheet Smoke 0\.2/);
  assert.match(html, /Local-first smoke/);
  assert.match(html, /type="module" src="\.\/patch\/patch\.js/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /WebSocket/);
  assert.match(storage, /indexedDB\.open/);
});

test("Input List is the primary spreadsheet-like Patch surface", () => {
  assert.match(html, /aria-label="Patch input list"/);
  assert.match(html, /<th>Source<\/th>/);
  assert.match(html, /<th>Input Method<\/th>/);
  assert.match(html, /<th>Stage Position<\/th>/);
  assert.match(html, /<th>Input \/ I\/O<\/th>/);
  assert.match(html, /<th>Console Channel<\/th>/);
  assert.match(html, /data-new-source/);
  assert.match(script, /data-grid-field/);
  assert.match(script, /handlePaste/);
  assert.match(script, /Type Source \+ Enter/);
});

test("profile setup creates capacity rather than asking for arbitrary I/O counts", () => {
  assert.match(html, /id="consoleProfile"/);
  assert.match(html, /id="ioProfile"/);
  assert.match(script, /addDeviceFromProfile/);
  assert.match(script, /listPatchProfiles/);
  assert.doesNotMatch(html, /id="deviceInputs"/);
  assert.doesNotMatch(html, /Add input device/);
});

test("spreadsheet and System View derive from the same route projection", () => {
  assert.match(html, /data-patch-view="sheet"/);
  assert.match(html, /data-patch-view="system"/);
  assert.match(script, /projectRouteRows\(project\)/);
  assert.match(script, /renderGrid\(rows, validation\)/);
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
