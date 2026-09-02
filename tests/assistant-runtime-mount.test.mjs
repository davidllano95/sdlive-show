import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("stable Admin worker remains Wrangler deploy entry", async () => {
  const wrangler = await source("wrangler.jsonc");
  assert.match(wrangler, /"main": "\.\/admin-stabilization-worker\.js"/);
});

test("Assistant is mounted narrowly before legacy public-form pipeline", async () => {
  const worker = await source("public-form-rate-limit.js");
  assert.match(worker, /import \{ handleAssistantApi \} from "\.\/assistant-api\.js"/);
  assert.match(worker, /if \(path === "\/api\/assistant"\)/);

  const assistantIndex = worker.indexOf('if (path === "/api/assistant")');
  const legacyLimitIndex = worker.indexOf("const limited = await enforcePublicFormRateLimit");
  const prepareLeadIndex = worker.indexOf("const preparedLead = await preparePublicLeadRequest");
  assert.ok(assistantIndex >= 0);
  assert.ok(legacyLimitIndex > assistantIndex);
  assert.ok(prepareLeadIndex > assistantIndex);
});

test("Assistant has its own bounded rate limiter while Contact/Rental stay unchanged", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  const limits = Object.fromEntries(
    wrangler.ratelimits.map((entry) => [entry.name, entry.simple])
  );
  assert.deepEqual(limits.CONTACT_FORM_RATE_LIMITER, { limit: 10, period: 60 });
  assert.deepEqual(limits.RENTAL_FORM_RATE_LIMITER, { limit: 10, period: 60 });
  assert.deepEqual(limits.ASSISTANT_RATE_LIMITER, { limit: 30, period: 60 });
});

test("no Assistant secret or provider credential is committed to Wrangler vars", async () => {
  const wrangler = await source("wrangler.jsonc");
  for (const forbidden of [
    "OPENAI_API_KEY",
    "ASSISTANT_SESSION_KEY",
    "RESEND_API_KEY"
  ]) {
    assert.doesNotMatch(wrangler, new RegExp(`\\"${forbidden}\\"\\s*:`), forbidden);
  }
});

test("non-secret Assistant notification routing is explicit and owner-safe", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  assert.equal(
    wrangler.vars.ASSISTANT_LEAD_NOTIFICATION_FROM,
    "SD.Live Assistant <hello@sdlive.show>"
  );
  assert.equal(wrangler.vars.ASSISTANT_LEAD_NOTIFICATION_TO, "hello@sdlive.show");
  assert.equal("OPENAI_ASSISTANT_MODEL" in wrangler.vars, false);
});
