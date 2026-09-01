import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Lead Admin workspace is explicitly read-only and points at the protected Admin API", async () => {
  const [html, js, api] = await Promise.all([
    source("admin/leads/index.html"),
    source("admin/leads/leads.js"),
    source("lead-admin-api.js")
  ]);

  assert.match(html, /Lead Core · D1/);
  assert.match(html, /Read-only/);
  assert.match(js, /\/api\/admin\/leads\?limit=100/);
  assert.match(js, /\/api\/admin\/whoami/);
  assert.doesNotMatch(api, /INSERT\s+INTO\s+leads/i);
  assert.doesNotMatch(api, /UPDATE\s+leads/i);
  assert.doesNotMatch(api, /DELETE\s+FROM\s+leads/i);
});

test("Admin navigation promotes Leads from Soon to the live Lead Core workspace", async () => {
  const [entry, edge] = await Promise.all([
    source("admin/leads-dashboard-entry.js"),
    source("lead-admin-dashboard-edge.js")
  ]);

  assert.match(entry, /\/admin\/leads\//);
  assert.match(entry, /Lead Core/);
  assert.match(entry, /Live · Read-only/);
  assert.match(edge, /leads-dashboard-entry\.js/);
});

test("edge router mounts the protected Lead Admin API and navigation runtime", async () => {
  const router = await source("public-form-rate-limit.js");

  assert.match(router, /handleLeadAdminApi/);
  assert.match(router, /path === "\/api\/admin\/leads"/);
  assert.match(router, /verifyAdmin: verifyAdminViaExistingApi/);
  assert.match(router, /applyLeadAdminNavigationRuntime/);
  assert.match(router, /path\.startsWith\("\/admin"\)/);
});
