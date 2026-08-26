import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const i18n = readFileSync(new URL("../admin/finance-dashboard-i18n.js", import.meta.url), "utf8");
const portal = readFileSync(new URL("../admin/finance-liventx-portal-link.js", import.meta.url), "utf8");
const stability = readFileSync(new URL("../admin/finance-runtime-stability.js", import.meta.url), "utf8");

test("Finance runtimes use explicit events instead of DOM-wide observation", () => {
  assert.match(i18n, /function refresh\(\)/);
  for (const source of [i18n, portal, stability]) {
    assert.doesNotMatch(source, /MutationObserver/);
    assert.doesNotMatch(source, /\.observe\(document\.(?:body|documentElement)/);
  }
  assert.match(portal, /scheduleDialogSync/);
  assert.match(portal, /data-finance-action-queue=\\"liventxReadyToSign\\"/);
});
