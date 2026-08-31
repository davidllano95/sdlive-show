import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/editor/rental-stabilization-editor.js", import.meta.url), "utf8");
const mediaEdge = readFileSync(new URL("../media-presentation-edge.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const toolIds = ["labeler", "videoServer", "monitor"];

test("all Production Tools expose real image elements in the public Rental cards", () => {
  for (const id of toolIds) {
    const marker = `data-rental-item="${id}"`;
    const start = home.indexOf(marker);
    assert.notEqual(start, -1, `missing Rental card for ${id}`);
    const end = home.indexOf("</article>", start);
    assert.notEqual(end, -1, `missing closing article for ${id}`);
    const card = home.slice(start, end + 10);
    assert.match(card, /equipment-tool-visual/);
    assert.match(card, /<img\b/);
  }
});

test("Rental preview image controls cover both equipment and Production Tool visual containers", () => {
  assert.match(editor, /\.equipment-card-visual img, \.equipment-tool-visual img/);
  assert.match(editor, /function focusPreviewItem\(id, smooth = false\)/);
  assert.match(editor, /button\("Preview", \(\) => focusPreviewItem\(id, true\)\)/);
  assert.match(editor, /focusPreviewItem\(id\);/);
});

test("Rental Media Library uses its canonical logicalPath without rerendering the whole editor", () => {
  assert.match(editor, /media\.logicalPath \|\| media\.logicalRef/);
  assert.match(editor, /setRentalImageSource\(id, data\.media\.logicalPath/);
  assert.doesNotMatch(editor, /image\.src = media\.logicalRef[^\n]*changed\(true\)/);
});

test("published Rental extended media presentation targets every item image", () => {
  assert.match(mediaEdge, /#rental \[data-rental-item=/);
  assert.match(mediaEdge, /\] img`, item\.image, \{ allowPosition: true \}/);
  assert.doesNotMatch(mediaEdge, /data-rental-item[^\n]*\.equipment-card-visual img/);
});
