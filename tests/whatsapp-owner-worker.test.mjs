import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Wrangler keeps the stable Admin worker as deploy entry and mounts WhatsApp owner routes beneath it", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  assert.equal(wrangler.main, "./admin-stabilization-worker.js");

  const stableWorker = await source("admin-stabilization-worker.js");
  assert.match(stableWorker, /import baseWorker from "\.\/public-form-rate-limit\.js"/);

  const runtime = await source("public-form-rate-limit.js");
  assert.match(runtime, /handleWhatsAppOwnerWebhook/);
  assert.match(runtime, /handleWhatsAppOwnerAdminApi/);
  assert.match(runtime, /verifyAdmin:\s*verifyAdminViaExistingApi/);
  assert.match(runtime, /let response = await appWorker\.fetch\(preparedLead\.request, env\)/);
});

test("public WhatsApp webhook contains no schema migration DDL", async () => {
  const webhook = await source("whatsapp-owner-webhook.js");
  assert.doesNotMatch(webhook, /CREATE\s+TABLE/i);
  assert.doesNotMatch(webhook, /ALTER\s+TABLE/i);
  assert.match(webhook, /createD1OwnerMessageStore/);

  const storage = await source("whatsapp-owner-storage.js");
  assert.match(storage, /CREATE TABLE IF NOT EXISTS whatsapp_owner_messages/);
  assert.match(storage, /Public webhook traffic must never call it/);
});
