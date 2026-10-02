import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../admin/patch/patch.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../admin/patch/index.html", import.meta.url), "utf8");

test("Patch workspace consumes canonical Admin brand tokens", () => {
  for (const token of [
    "var(--panel)",
    "var(--panel2)",
    "var(--border)",
    "var(--text)",
    "var(--soft)",
    "var(--muted)",
    "var(--accent)",
    "rgba(var(--accent-rgb)",
    "var(--green)",
    "var(--amber)",
    "var(--danger)"
  ]) {
    assert.ok(css.includes(token), `missing Admin token: ${token}`);
  }
});

test("Patch does not reintroduce the legacy lime/blue parallel palette", () => {
  assert.doesNotMatch(css, /#dfff69/i);
  assert.doesNotMatch(css, /#88a2ff/i);
  assert.doesNotMatch(css, /rgba\(136\s*,\s*162\s*,\s*255/i);
  assert.doesNotMatch(css, /--patch-(?:lime|violet|accent|danger|warning)/i);
});

test("Patch uses the canonical SD.Live Admin logo assets", () => {
  assert.match(html, /sd-live-header-normal\.png/);
  assert.match(html, /sd-live-header-normal-symbol\.png/);
});
