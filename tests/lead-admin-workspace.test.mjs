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

test("Leads workspace loads the shared mobile Admin navigation runtime directly", async () => {
  const html = await source("admin/leads/index.html");

  assert.match(html, /\.\/admin-stabilization\.js\?v=20260901-1/);
  assert.ok(
    html.indexOf("./admin-stabilization.js?v=20260901-1") <
      html.indexOf("./leads/leads.js?v=20260901-1"),
    "shared Admin runtime should load before the Leads workspace runtime"
  );
});

test("Leads dashboard entry keeps a fallback mobile Admin runtime loader", async () => {
  const entry = await source("admin/leads-dashboard-entry.js");

  assert.match(entry, /currentPath !== "\/admin\/leads"/);
  assert.match(entry, /\/admin\/admin-stabilization\.js\?v=20260831-4/);
  assert.match(entry, /SDLiveAdminStabilization/);
});

test("edge router mounts the protected Lead Admin API and navigation runtime", async () => {
  const router = await source("public-form-rate-limit.js");

  assert.match(router, /handleLeadAdminApi/);
  assert.match(router, /path === "\/api\/admin\/leads"/);
  assert.match(router, /verifyAdmin: verifyAdminViaExistingApi/);
  assert.match(router, /applyLeadAdminNavigationRuntime/);
  assert.match(router, /path\.startsWith\("\/admin"\)/);
});
