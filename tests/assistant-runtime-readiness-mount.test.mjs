import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("runtime readiness is mounted only on the authenticated Admin wrapper", async () => {
  const [wrapper, publicWorker] = await Promise.all([
    source("admin-stabilization-worker.js"),
    source("public-form-rate-limit.js")
  ]);

  assert.match(
    wrapper,
    /import \{ handleAssistantRuntimeReadinessApi \} from "\.\/assistant-admin-readiness\.js"/
  );
  assert.match(wrapper, /if \(path === "\/api\/admin\/assistant\/readiness"\)/);
  assert.match(wrapper, /handleAssistantRuntimeReadinessApi\(request, env, \{\s*verifyAdmin: verifyAdminViaExistingApi/);

  const readinessIndex = wrapper.indexOf('if (path === "/api/admin/assistant/readiness")');
  const availabilityIndex = wrapper.indexOf('if (path === "/api/admin/availability")');
  assert.ok(readinessIndex >= 0);
  assert.ok(availabilityIndex > readinessIndex);

  assert.doesNotMatch(publicWorker, /handleAssistantRuntimeReadinessApi/);
  assert.doesNotMatch(publicWorker, /\/api\/admin\/assistant\/readiness/);
});

test("readiness implementation has no network or storage mutation path", async () => {
  const readiness = await source("assistant-runtime-readiness.js");
  const handler = await source("assistant-admin-readiness.js");
  const combined = `${readiness}\n${handler}`;

  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /\.batch\s*\(/);
  assert.doesNotMatch(combined, /\.run\s*\(/);
  assert.doesNotMatch(combined, /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\s+(TABLE|INTO|FROM)/i);
  assert.match(readiness, /revealsSecretValues:\s*false/);
  assert.match(readiness, /storagePreflightRequiredSeparately:\s*true/);
});
