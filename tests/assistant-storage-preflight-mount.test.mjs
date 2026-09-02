import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("preflight is mounted only on the protected Admin route", async () => {
  const worker = await source("public-form-rate-limit.js");

  assert.match(
    worker,
    /import \{ handleAssistantStoragePreflightApi \} from "\.\/assistant-admin-preflight\.js"/
  );
  assert.match(worker, /if \(path === "\/api\/admin\/assistant\/preflight"\)/);
  assert.match(worker, /verifyAdmin: verifyAdminViaExistingApi/);

  assert.doesNotMatch(worker, /handleAssistantApi/);
  assert.doesNotMatch(worker, /if \(path === "\/api\/assistant"\)/);

  const preflightIndex = worker.indexOf('if (path === "/api/admin/assistant/preflight")');
  const legacyPipelineIndex = worker.indexOf("const limited = await enforcePublicFormRateLimit");
  assert.ok(preflightIndex >= 0);
  assert.ok(legacyPipelineIndex > preflightIndex);
});

test("preflight PR adds no Assistant public limiter or runtime configuration", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  const names = wrangler.ratelimits.map((entry) => entry.name).sort();

  assert.deepEqual(names, [
    "CONTACT_FORM_RATE_LIMITER",
    "RENTAL_FORM_RATE_LIMITER"
  ]);
  assert.equal("ASSISTANT_RATE_LIMITER" in Object.fromEntries(names.map((name) => [name, true])), false);
  assert.equal("OPENAI_ASSISTANT_MODEL" in wrangler.vars, false);
  assert.equal(wrangler.main, "./admin-stabilization-worker.js");
});

test("preflight source contains no storage mutation statements", async () => {
  const inspector = await source("assistant-storage-preflight.js");

  const executableSql = [...inspector.matchAll(/db\.prepare\((?:`([^`]*)`|"([^"]*)")\)/g)]
    .map((match) => String(match[1] || match[2] || "").replace(/\s+/g, " ").trim());

  assert.equal(executableSql.length, 5);
  for (const sql of executableSql) {
    assert.match(sql, /^(PRAGMA|SELECT)\b/i, sql);
    assert.doesNotMatch(sql, /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i, sql);
  }
});
