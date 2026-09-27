import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = readFileSync(new URL("../documents-templates/invoice-intl-en.v1.js", import.meta.url), "utf8");

test("international invoice total due is emphasized without a box or top rule", () => {
  assert.doesNotMatch(template, /\.totalbox\{[^}]*border-top:/);
  assert.doesNotMatch(template, /\.totalbox\{[^}]*background:#15161c/);
  assert.doesNotMatch(template, /\.totalbox\{[^}]*color:#fff/);
  assert.match(template, /\.totalbox\{[^}]*margin-top:18px;[^}]*padding:0/);
  assert.match(template, /<span class="label">Total due<\/span><span class="v">/);
});

test("international invoice aligns all table headings on the same typographic baseline", () => {
  assert.match(template, /thead th\{line-height:1;vertical-align:bottom\}/);
  assert.match(template, /thead th\.num\{font-family:var\(--font-sans\)\}/);
});

test("international invoice fills a Letter page and uses the lower page area", () => {
  assert.match(template, /\.page\{display:flex;flex-direction:column\}/);
  assert.match(template, /\.bottom\{[^}]*margin-top:auto;[^}]*padding-top:30px/);
  assert.match(template, /\.footer\{margin-top:14px\}/);
  assert.match(template, /@media print\{html,body\{width:8\.5in;height:11in;min-height:11in;background:#fff!important;padding:0!important\}/);
  assert.match(template, /\.page\{width:8\.5in!important;height:11in!important;min-height:11in!important/);
});

test("international invoice aligns number metadata and renders a larger applied signature", () => {
  assert.match(template, /\.meta\{display:grid;grid-template-columns:max-content max-content;[^}]*align-items:baseline/);
  assert.match(template, /\.meta dd\{[^}]*min-width:108px;text-align:right/);
  assert.match(template, /\.signature-applied\{[^}]*height:108px;[^}]*margin:0 4px -15px 0/);
  assert.match(template, /<img class="signature-applied"/);
});
