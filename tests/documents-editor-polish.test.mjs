import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../admin/documents/index.html", import.meta.url), "utf8");
const polish = readFileSync(new URL("../admin/documents/editor-polish.css", import.meta.url), "utf8");

test("line item editor exposes optional quantity, unit, rate and clearable date range", () => {
  assert.match(editor, /line-quantity/);
  assert.match(editor, /quantity\.min = "0"/);
  assert.match(editor, /Qty · 0 = hidden/);
  assert.match(editor, /line-unit/);
  assert.match(editor, /Unit \(optional\)/);
  assert.match(editor, /line-rate/);
  assert.match(editor, /line-date-end/);
  assert.match(editor, /Date from \(optional\)/);
  assert.match(editor, /Date to \(optional\)/);
  assert.match(editor, /line-clear-dates/);
  assert.match(editor, /Sin fecha/);
  assert.match(editor, /date\.value = ""/);
  assert.match(editor, /dateEnd\.value = ""/);
  assert.match(editor, /const multiplier = quantity > 0 \? quantity : 1/);
  assert.match(editor, /serviceDateEnd:/);
});

test("original expense fields remain invoice-only and explicitly named", () => {
  assert.match(editor, /kindId === "invoice-intl-en"/);
  assert.match(editor, /Original expense currency \(optional\)/);
  assert.match(editor, /Original expense amount \(optional\)/);
});

test("line item layout is card-based, responsive and styles the no-date control", () => {
  assert.match(polish, /\.draft-line\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(polish, /line-field--description/);
  assert.match(polish, /line-total/);
  assert.match(polish, /line-clear-dates/);
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
