import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";

import {
  extractWhatsAppMessages,
  handleWhatsAppOwnerWebhook,
  normalizeWhatsAppNumber,
  verifyMetaWebhookSignature
} from "../whatsapp-owner-webhook.js";

function env() {
  return {
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-me",
    WHATSAPP_APP_SECRET: "app-secret",
    WHATSAPP_OWNER_NUMBER: "+57 300 111 2233",
    WHATSAPP_PHONE_NUMBER_ID: "123456789",
    WHATSAPP_OWNER_ACTOR_EMAIL: "owner@sdlive.show"
  };
}

function payload({ id = "wamid.1", from = "573001112233", text = "away 2h", type = "text" } = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "123456789" },
          messages: [{
            id,
            from,
            type,
            ...(type === "text" ? { text: { body: text } } : {})
          }]
        }
      }]
    }]
  };
}

function webhookRequest(body, method = "POST") {
  return new Request("https://sdlive.show/api/webhooks/whatsapp", {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=" + "0".repeat(64)
    },
    body: method === "POST" ? JSON.stringify(body) : undefined
  });
}

function fakeStore() {
  const rows = new Map();
  return {
    rows,
    async claim(message) {
      const existing = rows.get(message.id);
      if (existing) return { isNew: false, row: { ...existing } };
      const row = {
        message_id: message.id,
        from_number: message.from,
        command_text: message.text,
        command_status: "received",
        response_text: null,
        reply_status: "pending"
      };
      rows.set(message.id, row);
      return { isNew: true, row: { ...row } };
    },
    async markProcessed(id, responseText) {
      const row = rows.get(id);
      row.command_status = "processed";
      row.response_text = responseText;
    },
    async markReplied(id) {
      rows.get(id).reply_status = "sent";
    }
  };
}

test("normalizes WhatsApp numbers to digits only", () => {
  assert.equal(normalizeWhatsAppNumber("+57 (300) 111-2233"), "573001112233");
});

test("verifies Meta sha256 webhook signatures", async () => {
  const rawBody = JSON.stringify({ hello: "world" });
  const secret = "app-secret";
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

  assert.equal(
    await verifyMetaWebhookSignature(rawBody, `sha256=${digest}`, secret, {
      cryptoImpl: webcrypto
    }),
    true
  );
  assert.equal(
    await verifyMetaWebhookSignature(rawBody + "x", `sha256=${digest}`, secret, {
      cryptoImpl: webcrypto
    }),
    false
  );
});

test("extracts only message payloads for the configured phone number id", () => {
  const messages = extractWhatsAppMessages(payload(), "123456789");
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], {
    id: "wamid.1",
    from: "573001112233",
    type: "text",
    text: "away 2h",
    phoneNumberId: "123456789"
  });
  assert.equal(extractWhatsAppMessages(payload(), "999").length, 0);

  const missingTarget = payload();
  delete missingTarget.entry[0].changes[0].value.metadata.phone_number_id;
  assert.equal(extractWhatsAppMessages(missingTarget, "123456789").length, 0);
});

test("GET webhook verification returns the Meta challenge only for the configured token", async () => {
  const request = new Request(
    "https://sdlive.show/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123"
  );
  const response = await handleWhatsAppOwnerWebhook(request, env());
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "abc123");

  const invalid = new Request(
    "https://sdlive.show/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123"
  );
  assert.equal((await handleWhatsAppOwnerWebhook(invalid, env())).status, 403);
});

test("rejects an invalid Meta signature before executing commands", async () => {
  let executed = false;
  const response = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), {
    verifySignature: async () => false,
    executeCommand: async () => {
      executed = true;
      return { reply: "should not happen" };
    },
    store: fakeStore(),
    sendText: async () => {}
  });

  assert.equal(response.status, 401);
  assert.equal(executed, false);
});

test("signed messages from non-owner numbers are acknowledged but ignored", async () => {
  let executed = false;
  let sent = false;
  const response = await handleWhatsAppOwnerWebhook(
    webhookRequest(payload({ from: "573009999999" })),
    env(),
    {
      verifySignature: async () => true,
      executeCommand: async () => {
        executed = true;
        return { reply: "no" };
      },
      store: fakeStore(),
      sendText: async () => { sent = true; }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(executed, false);
  assert.equal(sent, false);
});

test("verified owner command executes once and duplicate webhook delivery is idempotent", async () => {
  const store = fakeStore();
  let executions = 0;
  let sends = 0;
  const options = {
    verifySignature: async () => true,
    store,
    executeCommand: async (_env, command, input) => {
      executions += 1;
      assert.equal(command, "away 2h");
      assert.equal(input.actorEmail, "owner@sdlive.show");
      return { reply: "AWAY applied until 7:00 PM." };
    },
    sendText: async (_env, to, body) => {
      sends += 1;
      assert.equal(to, "573001112233");
      assert.match(body, /AWAY applied/);
    }
  };

  const first = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), options);
  const second = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), options);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(executions, 1);
  assert.equal(sends, 1);
});

test("an in-flight duplicate is retryable and never executes the Availability command twice", async () => {
  const store = fakeStore();
  store.rows.set("wamid.1", {
    message_id: "wamid.1",
    from_number: "573001112233",
    command_text: "away 2h",
    command_status: "received",
    response_text: null,
    reply_status: "pending"
  });

  let executions = 0;
  let sends = 0;
  const response = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), {
    verifySignature: async () => true,
    store,
    executeCommand: async () => {
      executions += 1;
      return { reply: "should not happen" };
    },
    sendText: async () => { sends += 1; }
  });

  assert.equal(response.status, 500);
  assert.equal(executions, 0);
  assert.equal(sends, 0);
});

test("reply retry does not re-apply an already processed Availability command", async () => {
  const store = fakeStore();
  let executions = 0;
  let sends = 0;
  const options = {
    verifySignature: async () => true,
    store,
    executeCommand: async () => {
      executions += 1;
      return { reply: "AWAY applied until 7:00 PM." };
    },
    sendText: async () => {
      sends += 1;
      if (sends === 1) throw new Error("temporary Meta outage");
    }
  };

  const first = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), options);
  const second = await handleWhatsAppOwnerWebhook(webhookRequest(payload()), env(), options);

  assert.equal(first.status, 500);
  assert.equal(second.status, 200);
  assert.equal(executions, 1);
  assert.equal(sends, 2);
  assert.equal(store.rows.get("wamid.1").reply_status, "sent");
});
