import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routerUrl = new URL("../worker-router.js", import.meta.url);
const homeUrl = new URL("../index.html", import.meta.url);

test("public Home keeps Consent Mode denied before deferring the consent UI manager", async () => {
  const [router, home] = await Promise.all([
    readFile(routerUrl, "utf8"),
    readFile(homeUrl, "utf8")
  ]);

  assert.match(router, /CONSENT_DEFAULT_BOOTSTRAP/);
  assert.match(router, /analytics_storage:\s*"denied"/);
  assert.match(router, /ad_storage:\s*"denied"/);
  assert.match(router, /window\.gtag\("consent","default"/);
  assert.match(router, /script\[src\*="analytics-consent\.js"\]/);
  assert.match(router, /element\.before\(CONSENT_DEFAULT_BOOTSTRAP,\s*\{\s*html:\s*true\s*\}\)/);
  assert.match(router, /element\.setAttribute\("defer",\s*""\)/);

  const staticConsent = home.match(/<script\s+src="analytics-consent\.js[^\"]*"><\/script>/);
  assert.ok(staticConsent, "static Home/Admin preview keeps the existing synchronous consent script");
  assert.doesNotMatch(
    staticConsent[0],
    /\bdefer\b/,
    "Admin/static preview should not inherit the public edge defer experiment"
  );
});
