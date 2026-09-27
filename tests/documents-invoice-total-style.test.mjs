import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../documents-templates/invoice-intl-en.v1.js", import.meta.url), "utf8");

test("international invoice total due is emphasized without a black box", () => {
  assert.match(template, /\.totalbox\{[^}]*border-top:1px solid #15161c/);
  assert.doesNotMatch(template, /\.totalbox\{[^}]*background:#15161c/);
  assert.doesNotMatch(template, /\.totalbox\{[^}]*color:#fff/);
  assert.match(template, /<span class="label">Total due<\/span><span class="v">/);
});
