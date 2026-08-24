import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../showday-runtime.css", import.meta.url), "utf8");

test("Anima and Sonique client logos render white in all modes", () => {
  assert.match(
    css,
    /\.client-logo\[alt="Anima Producciones"\],\s*\n\.client-logo\[alt="Sonique"\]\s*\{\s*\n\s*filter:\s*brightness\(0\) invert\(1\);/
  );

  assert.doesNotMatch(
    css,
    /html\.showday-active\s+\.client-logo\[alt="(?:Anima Producciones|Sonique)"\]/
  );
  assert.doesNotMatch(css, /client-logo-frame[\s\S]{0,300}(radial-gradient|box-shadow)/);
});
