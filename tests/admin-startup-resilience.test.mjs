import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(
  new URL("../admin/dashboard.js", import.meta.url),
  "utf8"
);

test("Admin startup does not depend on writable localStorage", () => {
  assert.match(dashboard, /function safeStorageGet\(/);
  assert.match(dashboard, /function safeStorageSet\(/);
  assert.match(
    dashboard,
    /const collapsed = safeStorageGet\("sdlive-admin-dashboard-collapsed"\)/
  );
  assert.doesNotMatch(dashboard, /const collapsed = localStorage\.getItem/);
});

test("Admin API checks fail visibly instead of hanging forever", () => {
  assert.match(dashboard, /new AbortController\(\)/);
  assert.match(dashboard, /setTimeout\(\(\) => controller\.abort\(\), 10000\)/);
  assert.match(dashboard, /Admin API timed out/);
});
