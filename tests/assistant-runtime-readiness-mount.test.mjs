import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("runtime readiness is mounted only on the authenticated Admin path", async () => {
  const worker = await source("public-form-rate-limit.js");

  assert.match(
    worker,
    /import \{ handleAssistantRuntimeReadinessApi \} from "\.\/assistant-admin-readiness\.js"/
  );
  assert.match(worker, /if \(path === "\/api\/admin\/assistant\/readiness"\)/);
  assert.match(worker, /handleAssistantRuntimeReadinessApi\(request, env, \{\s*verifyAdmin: verifyAdminViaExistingApi/);

  const readinessIndex = worker.indexOf('if (path === "/api/admin/assistant/readiness")');
  const publicAssistantIndex = worker.indexOf('if (path === "/api/assistant")');
  const legacyFormIndex = worker.indexOf("const limited = await enforcePublicFormRateLimit");
  assert.ok(readinessIndex >= 0);
  assert.ok(publicAssistantIndex > readinessIndex);
  assert.ok(legacyFormIndex > publicAssistantIndex);
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
