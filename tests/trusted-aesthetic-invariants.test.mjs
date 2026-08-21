import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Trusted By keeps the established card sheen in base CSS", async () => {
  const css = await readFile(
    new URL("../styles.css", import.meta.url),
    "utf8"
  );

  assert.match(css, /\.client-strip-card::after\s*\{/);
  assert.match(css, /\.client-strip-card:hover::after\s*\{/);
  assert.match(css, /@keyframes client-card-sheen/);
  assert.match(css, /rgba\(255, 255, 255, 0\.2\) 50%/);
});

test("Trusted CMS renderers preserve the same public card class contract", async () => {
  const [edge, editor] = await Promise.all([
    readFile(new URL("../trusted-edge.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/editor/trusted-editor.js", import.meta.url), "utf8")
  ]);

  assert.match(edge, /classNames\("client-strip-card", client\.cardClass\)/);
  assert.match(editor, /card\.className = "client-strip-card"/);
  assert.match(editor, /addExtraClasses\(card, client\.cardClass\)/);
});

test("Trusted interaction layer keeps sheen above CMS-managed media stacking contexts", async () => {
  const source = await readFile(
    new URL("../trusted-marquee-interactions.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /TRUSTED_CARD_AESTHETIC_STYLE_ID/);
  assert.match(source, /\.client-strip-card \{[\s\S]*isolation: isolate/);
  assert.match(source, /\.client-strip-card > \* \{[\s\S]*z-index: 1/);
  assert.match(source, /\.client-strip-card::after \{[\s\S]*z-index: 2/);
  assert.match(source, /focus-within::after/);
  assert.match(source, /client-card-sheen 900ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
});
