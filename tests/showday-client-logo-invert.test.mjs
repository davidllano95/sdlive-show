import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../showday-runtime.css", import.meta.url), "utf8");

test("Show Day inverts only the Anima and Sonique client logos to white", () => {
  assert.match(
    css,
    /html\.showday-active \.client-logo\[alt="Anima Producciones"\],\s*\nhtml\.showday-active \.client-logo\[alt="Sonique"\]\s*\{\s*\n\s*filter:\s*brightness\(0\) invert\(1\);/
  );

  assert.doesNotMatch(css, /client-logo-frame[\s\S]{0,300}(radial-gradient|box-shadow)/);
});
