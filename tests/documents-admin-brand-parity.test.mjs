import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const documentsCss = readFileSync(new URL("../admin/documents/documents.css", import.meta.url), "utf8");
const stabilization = readFileSync(new URL("../admin/admin-stabilization.js", import.meta.url), "utf8");
const navigationCss = readFileSync(new URL("../admin/navigation.css", import.meta.url), "utf8");

test("Documents workspace uses the shared Admin visual tokens instead of a parallel palette", () => {
  assert.match(documentsCss, /var\(--panel\)/);
  assert.match(documentsCss, /var\(--border\)/);
  assert.match(documentsCss, /var\(--accent\)/);
  assert.match(documentsCss, /var\(--soft\)/);
  assert.doesNotMatch(documentsCss, /#dfff69/i);
  assert.doesNotMatch(documentsCss, /#88a2ff/i);
  assert.doesNotMatch(documentsCss, /rgba\(136\s*,\s*162\s*,\s*255/i);
});

test("Documents preserves exact SD.Live brand copy in Admin inputs", () => {
  assert.match(stabilization, /SD\.Live · Creative Audio/);
  assert.doesNotMatch(stabilization, /sd•live/i);
});

test("Documents is a canonical primary workspace between Finance and Calendar", () => {
  const finance = navigationCss.indexOf('a[href="/admin/finance/"]');
  const documents = navigationCss.indexOf('a[href="/admin/documents/"]');
  const calendar = navigationCss.indexOf('a[href="/admin/calendar/"]');
  assert.ok(finance >= 0 && documents > finance && calendar > documents);
  assert.match(navigationCss, /a\[href="\/admin\/documents\/"\]\s*\{\s*order:\s*-35;/);
});
