import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Wrangler deploys the narrow WhatsApp owner wrapper over the stable worker", async () => {
  const wrangler = JSON.parse(await source("wrangler.jsonc"));
  assert.equal(wrangler.main, "./whatsapp-owner-worker.js");

  const wrapper = await source("whatsapp-owner-worker.js");
  assert.match(wrapper, /import baseWorker from "\.\/admin-stabilization-worker\.js"/);
  assert.match(wrapper, /handleWhatsAppOwnerWebhook/);
  assert.match(wrapper, /handleWhatsAppOwnerAdminApi/);
  assert.match(wrapper, /return baseWorker\.fetch\(request, env, ctx\)/);
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
