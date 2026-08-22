import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "admin"]);
const GTM_MARKER = "googletagmanager.com/gtm.js";
const CONSENT_MARKER = "analytics-consent.js";

async function collectPublicHtml(directory = ROOT) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectPublicHtml(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

test("every public HTML page that loads GTM establishes consent first", async () => {
  const htmlFiles = await collectPublicHtml();
  const gtmPages = [];

  for (const filePath of htmlFiles) {
    const html = await readFile(filePath, "utf8");
    const gtmIndex = html.indexOf(GTM_MARKER);
    if (gtmIndex === -1) continue;

    gtmPages.push(path.relative(ROOT, filePath));
    const consentIndex = html.indexOf(CONSENT_MARKER);

    assert.notEqual(
      consentIndex,
      -1,
      `${path.relative(ROOT, filePath)} loads GTM without analytics-consent.js`
    );
    assert.ok(
      consentIndex < gtmIndex,
      `${path.relative(ROOT, filePath)} must load analytics-consent.js before GTM`
    );
  }

  assert.ok(gtmPages.length >= 9, "expected the current public GTM page set to be covered");
});

test("analytics consent establishes denied defaults before DOM-ready UI work", async () => {
  const source = await readFile(path.join(ROOT, "analytics-consent.js"), "utf8");
  const defaultCall = source.indexOf("setGoogleConsentDefault();");
  const domReady = source.indexOf('document.addEventListener("DOMContentLoaded"');

  assert.notEqual(defaultCall, -1, "missing default Consent Mode initialization");
  assert.notEqual(domReady, -1, "missing consent UI DOMContentLoaded initialization");
  assert.ok(defaultCall < domReady, "Consent Mode defaults must execute before DOM-ready UI work");
  assert.match(source, /analytics_storage:\s*"denied"/);
  assert.match(source, /ad_storage:\s*"denied"/);
});
