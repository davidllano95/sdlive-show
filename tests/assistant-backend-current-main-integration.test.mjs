import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Assistant backend integration preserves closed storage gates and current Lead status contract", async () => {
  const [publicWorker, adminWrapper, leadAdmin] = await Promise.all([
    source("public-form-rate-limit.js"),
    source("admin-stabilization-worker.js"),
    source("lead-admin-api.js")
  ]);

  assert.match(publicWorker, /\/api\/admin\/assistant\/preflight/);
  assert.match(publicWorker, /if \(path === "\/api\/assistant"\)/);
  assert.match(publicWorker, /if \(!assistantPublicEnabled\(env\)\)/);
  assert.ok(
    publicWorker.indexOf("assistantPublicEnabled(env)") <
    publicWorker.indexOf("handleAssistantApi(request, env)")
  );

  assert.match(adminWrapper, /\/api\/admin\/assistant\/leads-migrate/);
  assert.match(adminWrapper, /\/api\/admin\/assistant\/storage-prepare/);
  assert.match(adminWrapper, /\/api\/admin\/assistant\/readiness/);

  for (const status of ["new", "contacted", "quoted", "confirmed", "lost"]) {
    assert.match(leadAdmin, new RegExp(`\\"${status}\\"`));
  }

  assert.doesNotMatch(leadAdmin, /LEAD_CORE_STATUSES/);
});

test("Assistant launch switch and provider secrets are not committed enabled in Wrangler", async () => {
  const wranglerText = await source("wrangler.jsonc");
  const wrangler = JSON.parse(wranglerText);

  assert.equal(wrangler.vars?.ASSISTANT_PUBLIC_ENABLED, undefined);
  for (const forbidden of [
    "OPENAI_API_KEY",
    "OPENAI_ASSISTANT_MODEL",
    "ASSISTANT_SESSION_KEY",
    "TURNSTILE_SECRET_KEY",
    "ASSISTANT_TURNSTILE_SITE_KEY",
    "RESEND_API_KEY"
  ]) {
    assert.equal(forbidden in (wrangler.vars || {}), false, forbidden);
  }

  assert.equal(wrangler.vars.ASSISTANT_LEAD_NOTIFICATION_TO, "hello@sdlive.show");
  assert.equal(
    wrangler.vars.ASSISTANT_LEAD_NOTIFICATION_FROM,
    "SD.Live Assistant <hello@sdlive.show>"
  );
});
