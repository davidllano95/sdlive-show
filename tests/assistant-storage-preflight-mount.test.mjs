import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Assistant preflight stays Admin-protected while public runtime is independently kill-switched", async () => {
  const worker = await source("public-form-rate-limit.js");

  assert.match(
    worker,
    /import \{ handleAssistantStoragePreflightApi \} from "\.\/assistant-admin-preflight\.js"/
  );
  assert.match(worker, /if \(path === "\/api\/admin\/assistant\/preflight"\)/);
  assert.match(worker, /verifyAdmin: verifyAdminViaExistingApi/);

  assert.match(worker, /import \{ handleAssistantApi \} from "\.\/assistant-api\.js"/);
  assert.match(worker, /if \(path === "\/api\/assistant"\)/);
  assert.match(worker, /if \(!assistantPublicEnabled\(env\)\)/);
  assert.match(worker, /error: "assistant_unavailable"/);

  const preflightIndex = worker.indexOf('if (path === "/api/admin/assistant/preflight")');
  const assistantIndex = worker.indexOf('if (path === "/api/assistant")');
  const legacyPipelineIndex = worker.indexOf("const limited = await enforcePublicFormRateLimit");
  assert.ok(preflightIndex >= 0);
  assert.ok(assistantIndex > preflightIndex);
  assert.ok(legacyPipelineIndex > assistantIndex);
});

test("integrated Assistant adds a dedicated limiter without committing public enablement or model configuration", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  const names = wrangler.ratelimits.map((entry) => entry.name).sort();

  assert.deepEqual(names, [
    "ASSISTANT_RATE_LIMITER",
    "CONTACT_FORM_RATE_LIMITER",
    "RENTAL_FORM_RATE_LIMITER"
  ]);

  const assistantLimiter = wrangler.ratelimits.find((entry) => entry.name === "ASSISTANT_RATE_LIMITER");
  assert.deepEqual(assistantLimiter?.simple, {
    limit: 30,
    period: 60
  });

  assert.equal("ASSISTANT_PUBLIC_ENABLED" in wrangler.vars, false);
  assert.equal("OPENAI_ASSISTANT_MODEL" in wrangler.vars, false);
  assert.equal(wrangler.main, "./admin-stabilization-worker.js");
});

test("preflight source contains no storage mutation statements", async () => {
  const inspector = await source("assistant-storage-preflight.js");

  const executableSql = [...inspector.matchAll(/db\.prepare\((?:`([^`]*)`|"([^"]*)")\)/g)]
    .map((match) => String(match[1] || match[2] || "").replace(/\s+/g, " ").trim());

  assert.equal(executableSql.length, 8);
  for (const sql of executableSql) {
    assert.match(sql, /^(PRAGMA|SELECT)\b/i, sql);
    assert.doesNotMatch(sql, /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i, sql);
  }
});
