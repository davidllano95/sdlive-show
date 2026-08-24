import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../showday-runtime.css", import.meta.url), "utf8");

test("Show Day gives Anima and Sonique a luminous neutral logo surface without recoloring artwork", () => {
  assert.match(
    css,
    /html\.showday-active \.client-strip-card:has\(\.client-logo\[alt="Anima Producciones"\]\) \.client-logo-frame/
  );
  assert.match(
    css,
    /html\.showday-active \.client-strip-card:has\(\.client-logo\[alt="Sonique"\]\) \.client-logo-frame/
  );
  assert.match(css, /radial-gradient\(/);
  assert.match(css, /0 0 28px rgba\(var\(--showday-accent-rgb\), 0\.18\)/);
  assert.match(css, /0 0 36px rgba\(var\(--showday-accent-rgb\), 0\.26\)/);

  const contrastRule = css.match(
    /html\.showday-active \.client-strip-card:has\(\.client-logo\[alt="Anima Producciones"\]\)[\s\S]*?\n\}/
  )?.[0] || "";

  assert.doesNotMatch(contrastRule, /filter\s*:/);
});
