import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Wrangler mounts the narrow WhatsApp owner wrapper", async () => {
  const [wrangler, wrapper] = await Promise.all([
    source("wrangler.jsonc"),
    source("whatsapp-owner-worker.js")
  ]);

  assert.match(wrangler, /"main": "\.\/whatsapp-owner-worker\.js"/);
  assert.match(wrapper, /handleWhatsAppOwnerWebhook/);
  assert.match(wrapper, /baseWorker\.fetch\(request, env, ctx\)/);
});

test("WhatsApp secrets and owner number are not committed to wrangler vars", async () => {
  const wrangler = await source("wrangler.jsonc");

  assert.doesNotMatch(wrangler, /WHATSAPP_ACCESS_TOKEN/);
  assert.doesNotMatch(wrangler, /WHATSAPP_APP_SECRET/);
  assert.doesNotMatch(wrangler, /WHATSAPP_OWNER_NUMBER/);
  assert.doesNotMatch(wrangler, /WHATSAPP_WEBHOOK_VERIFY_TOKEN/);
});
