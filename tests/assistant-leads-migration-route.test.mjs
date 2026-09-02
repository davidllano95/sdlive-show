import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminEntry = new URL("../admin-stabilization-worker.js", import.meta.url);
const sharedRouter = new URL("../public-form-rate-limit.js", import.meta.url);

test("destructive Leads migration route exists only in the Admin stabilization entrypoint", async () => {
  const [adminSource, sharedSource] = await Promise.all([
    readFile(adminEntry, "utf8"),
    readFile(sharedRouter, "utf8")
  ]);

  assert.match(adminSource, /handleAssistantLeadsMigrationApi/);
  assert.match(adminSource, /\/api\/admin\/assistant\/leads-migrate/);
  assert.doesNotMatch(sharedSource, /handleAssistantLeadsMigrationApi/);
  assert.doesNotMatch(sharedSource, /\/api\/admin\/assistant\/leads-migrate/);

  const routeIndex = adminSource.indexOf('path === "/api/admin/assistant/leads-migrate"');
  const baseForwardIndex = adminSource.indexOf("baseWorker.fetch(request, env)");
  assert.ok(routeIndex >= 0);
  assert.ok(baseForwardIndex >= 0);
  assert.ok(routeIndex < baseForwardIndex);
});
