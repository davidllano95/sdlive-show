import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../admin/documents/index.html", import.meta.url), "utf8");
const polish = readFileSync(new URL("../admin/documents/editor-polish.css", import.meta.url), "utf8");

test("line item editor exposes quantity, unit, rate and optional date", () => {
  assert.match(editor, /line-quantity/);
  assert.match(editor, /line-unit/);
  assert.match(editor, /line-rate/);
  assert.match(editor, /Date \(optional\)/);
  assert.match(editor, /amountMinor = unitMinor \* quantity/);
  assert.match(editor, /serviceDate: null/);
});

test("line item layout is card-based and loaded after base Documents styles", () => {
  assert.match(polish, /\.draft-line\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(polish, /line-field--description/);
  assert.match(polish, /line-total/);
  const base = html.indexOf("documents.css?v=20260927-2");
  const override = html.indexOf("editor-polish.css?v=20260927-1");
  assert.ok(base >= 0 && override > base);
});

test("visual brand behavior is explicit in the editor", () => {
  assert.match(html, /Blank = use the issuer profile brand/);
  assert.match(html, /SD\.Live · Creative Audio/);
  assert.match(html, /overrides this document only/);
});

test("new draft defaults target canonical COP and USD issuer ids when present", () => {
  assert.match(editor, /samuel-cop/);
  assert.match(editor, /samuel-usd/);
});
