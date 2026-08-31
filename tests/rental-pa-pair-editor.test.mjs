import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/editor/rental-stabilization-editor.js", import.meta.url), "utf8");
const shell = readFileSync(new URL("../admin/admin-stabilization.js", import.meta.url), "utf8");
const publicEdge = readFileSync(new URL("../home-presentation-edge.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("PA markup remains a visible two-unit pair", () => {
  const match = home.match(/<div class="equipment-pa-pair">([\s\S]*?)<\/div>/);
  assert.ok(match, "PA pair container should exist");
  assert.equal((match[1].match(/<img\b/g) || []).length, 2, "PA pair should render exactly two units");
});

test("Rental editor treats the PA pair as one synchronized media control", () => {
  assert.match(editor, /PA pair · both units always use the same image, size and position\./);
  assert.match(editor, /id === "pa"\s*\? \[\.\.\.card\.querySelectorAll\("\.equipment-pa-pair img"\)\]/);
  assert.match(editor, /images\.forEach\(\(img, imageIndex\) => \{/);
  assert.match(editor, /img\.src = resolveMedia\(item\.image\.src\)/);
  assert.match(editor, /img\.style\.scale = String\(clamp\(item\.image\.displayScale \?\? item\.image\.scale/);
  assert.match(editor, /img\.style\.translate = `\$\{clamp\(item\.image\.positionX/);
});

test("published Rental rendering applies the canonical item image to every PA unit", () => {
  assert.match(publicEdge, /\.on\(`#rental \[data-rental-item="\$\{id\}"\] img`, imageHandler\(item\.image\)\)/);
});

test("Site Editor cache-busts the PA pair runtime change", () => {
  assert.match(shell, /const EDITOR_EXTENSION_VERSION = "20260831-4";/);
  assert.match(shell, /rental-stabilization-editor\.js\?v=\$\{EDITOR_EXTENSION_VERSION\}/);
});
