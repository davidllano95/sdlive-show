import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = [
  "admin/editor/admin-shell.js",
  "admin/editor/trusted-editor.js",
  "admin/editor/trusted-preview-controls.js",
  "admin/editor/trusted-select-bridge.js",
  "admin/editor/trusted-media-controls.js",
  "admin/editor/trusted-brand-placement.js",
  "admin/editor/trusted-preview-parity.js"
];

for (const file of files) {
  test(`${file} parses as browser JavaScript`, async () => {
    const source = await readFile(
      new URL(`../${file}`, import.meta.url),
      "utf8"
    );

    assert.doesNotThrow(() => {
      // Compile only. The editor scripts depend on browser globals and are not
      // executed in Node during this syntax guard.
      new Function(source);
    });
  });
}
