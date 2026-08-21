import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const placementSource = await readFile(
  new URL("../admin/editor/trusted-brand-placement.js", import.meta.url),
  "utf8"
);

const shellSource = await readFile(
  new URL("../admin/editor/admin-shell.js", import.meta.url),
  "utf8"
);

test("placement controls target only supported-brand logo source fields", () => {
  assert.match(
    placementSource,
    /clients\\\.\\d\+\\\.reveal\\\.items\\\.\\d\+\\\.src/
  );
  assert.match(placementSource, /item\?\.type !== "logo"/);
});

test("placement supports auto, left, center and right", () => {
  assert.match(
    placementSource,
    /\["auto", "left", "center", "right"\]/
  );
  assert.match(placementSource, /Brand position/);
  assert.match(placementSource, /gridTemplateColumns/);
  assert.match(placementSource, /gridColumn = `\$\{start\} \/ span \$\{span\}`/);
});

test("placement persists through the Trusted draft binding and survives replacements", () => {
  assert.match(placementSource, /replace\(\/\\\.src\$\/, "\.placement"\)/);
  assert.match(placementSource, /placementBySource\.set\(nextSource, placementBySource\.get\(previousSource\)\)/);
  assert.match(placementSource, /setDraftPathThroughBoundInput/);
});

test("placement draft bridge emits only one synthetic input per change", () => {
  const bridge = placementSource.match(
    /function setDraftPathThroughBoundInput[\s\S]*?\n  }\n\n  function refreshButtons/
  );

  assert.ok(bridge, "placement draft bridge should exist");
  const dispatches = bridge[0].match(/dispatchEvent\(new Event\("input"\)\)/g) || [];
  assert.equal(dispatches.length, 1);
  assert.match(bridge[0], /carousel continuity guard/);
});

test("placement is recalculated when the preview layout changes", () => {
  assert.match(placementSource, /ResizeObserver/);
  assert.match(placementSource, /countGridColumns/);
  assert.match(placementSource, /gridSpan/);
});

test("admin shell loads placement after Trusted media controls", () => {
  const mediaIndex = shellSource.indexOf("trusted-media-controls.js");
  const placementIndex = shellSource.indexOf("trusted-brand-placement.js");

  assert.ok(mediaIndex >= 0);
  assert.ok(placementIndex > mediaIndex);
  assert.match(shellSource, /trusted-brand-placement\.js\?v=20260820-2/);
});
