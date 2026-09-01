import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wrangler = JSON.parse(
  await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
);
const adminEdge = await readFile(
  new URL("../availability-admin-edge.js", import.meta.url),
  "utf8"
);
const worker = await readFile(
  new URL("../public-form-rate-limit.js", import.meta.url),
  "utf8"
);

test("Admin dashboard requests run through the Availability HTML runtime without routing every Admin asset through the Worker", () => {
  const patterns = wrangler?.assets?.run_worker_first || [];
  assert.ok(patterns.includes("/admin"));
  assert.ok(patterns.includes("/admin/"));
  assert.ok(!patterns.includes("/admin/*"));
  assert.match(worker, /path === "\/admin" \|\| path === "\/admin\/index\.html"/);
  assert.match(worker, /applyAvailabilityAdminRuntime\(response\)/);
  assert.match(adminEdge, /availability-admin\.css/);
  assert.match(adminEdge, /availability-admin\.js/);
});
