import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Home footer uses a balanced desktop grid and collapses responsively", async () => {
  const css = await readFile(path.join(ROOT, "site-consistency.css"), "utf8");

  assert.match(css, /\.site-footer \.footer-top\s*\{[^}]*display:\s*grid;/s);
  assert.match(css, /\.site-footer \.footer-links\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /\.site-footer \.footer-links \.footer-col:first-child\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(css, /@media \(max-width:\s*620px\)[\s\S]*\.site-footer \.footer-links,[\s\S]*grid-template-columns:\s*1fr;/);
});

test("footer copyright renders SD.Live with a normal text period", async () => {
  const css = await readFile(path.join(ROOT, "site-consistency.css"), "utf8");
  const match = css.match(/\.site-footer \.footer-bottom \.brand-wordmark-text__dot\s*\{([\s\S]*?)\}/);

  assert.ok(match, "missing footer copyright dot normalization");
  assert.match(match[1], /display:\s*inline;/);
  assert.match(match[1], /background:\s*none;/);
  assert.match(match[1], /box-shadow:\s*none;/);
  assert.match(match[1], /color:\s*inherit;/);
});
