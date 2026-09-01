import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("stable Admin worker remains the deploy entry and mounts the WhatsApp webhook narrowly", async () => {
  const [wrangler, worker] = await Promise.all([
    source("wrangler.jsonc"),
    source("admin-stabilization-worker.js")
  ]);

  assert.match(wrangler, /"main": "\.\/admin-stabilization-worker\.js"/);
  assert.match(worker, /handleWhatsAppOwnerWebhook/);
  assert.match(worker, /WHATSAPP_OWNER_WEBHOOK_PATH = "\/api\/webhooks\/whatsapp"/);
  assert.match(worker, /path === WHATSAPP_OWNER_WEBHOOK_PATH/);
  assert.match(worker, /baseWorker\.fetch\(request, env\)/);
});

test("WhatsApp secrets and owner number are not committed to wrangler vars", async () => {
  const wrangler = await source("wrangler.jsonc");

  assert.doesNotMatch(wrangler, /WHATSAPP_ACCESS_TOKEN/);
  assert.doesNotMatch(wrangler, /WHATSAPP_APP_SECRET/);
  assert.doesNotMatch(wrangler, /WHATSAPP_OWNER_NUMBER/);
  assert.doesNotMatch(wrangler, /WHATSAPP_WEBHOOK_VERIFY_TOKEN/);
});
