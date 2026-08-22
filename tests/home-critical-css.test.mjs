import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("static/Admin Home keeps its existing stylesheet contract", async () => {
  const html = await source("index.html");

  assert.match(html, /<link[^>]+href="site-consistency\.css\?v=20260819-2"[^>]+data-sdlive-consistency/);
  assert.doesNotMatch(html, /data-sdlive-consistency[^>]+media="print"/);
  assert.match(html, /<link href="styles\.css\?v=20260819-1" rel="stylesheet"/);
});

test("public Home makes only the shared consistency layer nonblocking", async () => {
  const entry = await source("worker-entry.js");

  const consistencyHandler = entry.match(
    /\.on\("link\[data-sdlive-consistency\]"[\s\S]*?\n\s*\}\)\n\s*\.on\("#contentStaging"/
  )?.[0] || "";

  assert.match(consistencyHandler, /setAttribute\("media", "print"\)/);
  assert.match(consistencyHandler, /this\.onload=null;this\.media='all'/);
  assert.match(entry, /<script src="\/language-bootstrap\.js\?v=\$\{LANGUAGE_BOOTSTRAP_VERSION\}"><\/script>/);
  assert.doesNotMatch(entry, /<script defer src="\/language-bootstrap\.js/);
});

test("public visual safeguards download without blocking first paint", async () => {
  const router = await source("worker-router.js");

  assert.match(
    router,
    /visual-safeguards\.css\?v=\$\{VISUAL_SAFEGUARDS_VERSION\}" media="print" onload="this\.onload=null;this\.media='all'" data-sdlive-visual-safeguards/
  );
  assert.match(
    router,
    /<script defer src="\/visual-safeguards\.js\?v=\$\{VISUAL_SAFEGUARDS_VERSION\}"><\/script>/
  );
});
