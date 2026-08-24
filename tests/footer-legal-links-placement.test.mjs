import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");

test("privacy and cookie controls live in the footer bottom legal group", async () => {
  const source = await readFile(path.join(ROOT, "analytics-consent.js"), "utf8");

  assert.match(source, /function ensureFooterLegalContainer\(\)/);
  assert.match(source, /querySelector\("\.site-footer \.footer-bottom"\)/);
  assert.match(source, /container\.className = "footer-legal-links"/);
  assert.match(source, /legalContainer\.appendChild\(link\)/);
  assert.doesNotMatch(source, /mainFooterColumn\.appendChild\(link\)/);
});
