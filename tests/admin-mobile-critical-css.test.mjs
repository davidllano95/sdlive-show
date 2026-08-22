import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");

test("Admin mobile layout CSS is part of the initial document head", () => {
  const headEnd = html.indexOf("</head>");
  const baseCss = html.indexOf('href="./dashboard.css"');
  const mobileCss = html.indexOf('href="./mobile-dashboard.css"');

  assert.ok(headEnd > 0);
  assert.ok(baseCss >= 0 && baseCss < headEnd);
  assert.ok(mobileCss >= 0 && mobileCss < headEnd);
  assert.ok(baseCss < mobileCss);
});
