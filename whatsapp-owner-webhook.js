import { executeAvailabilityOwnerCommand } from "./availability-owner-control.js";

const WEBHOOK_PATH = "/api/webhooks/whatsapp";
const MAX_WEBHOOK_BYTES = 512000;
const schemaPromises = new WeakMap();

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
}

function text(value, status = 200) {
  return new Response(String(value || ""), {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function normalizeWhatsAppNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

export async function verifyMetaWebhookSignature(
  rawBody,
  signatureHeader,
  appSecret,
  { cryptoImpl = globalThis.crypto } = {}
) {
  const secret = String(appSecret || "");
  const match = String(signatureHeader || "").match(/^sha256=([0-9a-f]{64})$/i);
  if (!secret || !match || !cryptoImpl?.subtle) return false;

  const signature = hexToBytes(match[1]);
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await cryptoImpl.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return cryptoImpl.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(String(rawBody || ""))
  );
}

export function extractWhatsAppMessages(payload, expectedPhoneNumberId = "") {
  const expected = String(expectedPhoneNumberId || "").trim();
  const results = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      if (!value || typeof value !== "object") continue;
      const phoneNumberId = String(value?.metadata?.phone_number_id || "").trim();
      if (expected && phoneNumberId !== expected) continue;

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        const id = String(message?.id || "").trim();
        const from = normalizeWhatsAppNumber(message?.from);
        if (!id || !from) continue;

        results.push({
          id,
          from,
          type: String(message?.type || "").trim().toLowerCase(),
          text: message?.type === "text" ? String(message?.text?.body || "").trim() : "",
          phoneNumberId
        });
      }
    }
  }

  return results;
}

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

async function ensureMessageSchema(env) {
  const db = databaseFromEnv(env);
  if (schemaPromises.has(db)) return schemaPromises.get(db);

  const promise = db.prepare(`
    CREATE TABLE IF NOT EXISTS whatsapp_owner_messages (
      message_id TEXT PRIMARY KEY,
      from_number TEXT NOT NULL,
      command_text TEXT,
      command_status TEXT NOT NULL DEFAULT 'received',
      response_text TEXT,
      reply_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      replied_at TEXT
    )
  `).run().catch((error) => {
    schemaPromises.delete(db);
    throw error;
  });

  schemaPromises.set(db, promise);
  return promise;
}

export function createD1OwnerMessageStore(env) {
  const db = databaseFromEnv(env);

  return {
    async claim(message) {
      await ensureMessageSchema(env);
      const result = await db.prepare(`
        INSERT OR IGNORE INTO whatsapp_owner_messages (
          message_id,
          from_number,
          command_text
        ) VALUES (?, ?, ?)
      `).bind(message.id, message.from, message.text || null).run();

      const row = await db.prepare(`
        SELECT
          message_id,
          from_number,
          command_text,
          command_status,
          response_text,
          reply_status,
          created_at,
          processed_at,
          replied_at
        FROM whatsapp_owner_messages
        WHERE message_id = ?
        LIMIT 1
      `).bind(message.id).first();

      return {
        isNew: Number(result?.meta?.changes || 0) > 0,
        row
      };
    },

    async markProcessed(messageId, responseText) {
      await db.prepare(`
        UPDATE whatsapp_owner_messages
        SET
          command_status = 'processed',
          response_text = ?,
          processed_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).bind(responseText, messageId).run();
    },

    async markReplied(messageId) {
      await db.prepare(`
        UPDATE whatsapp_owner_messages
        SET
          reply_status = 'sent',
          replied_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).bind(messageId).run();
    }
  };
}

function requiredMetaConfig(env) {
  const graphVersion = String(env?.WHATSAPP_GRAPH_API_VERSION || "").trim();
  const phoneNumberId = String(env?.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const accessToken = String(env?.WHATSAPP_ACCESS_TOKEN || "").trim();

  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    throw new Error("WHATSAPP_GRAPH_API_VERSION is missing or invalid");
  }
  if (!/^\d+$/.test(phoneNumberId)) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is missing or invalid");
  }
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is missing");
  }

  return { graphVersion, phoneNumberId, accessToken };
}

export async function sendWhatsAppText(
  env,
  to,
  body,
  { fetchImpl = fetch } = {}
) {
  const { graphVersion, phoneNumberId, accessToken } = requiredMetaConfig(env);
  const recipient = normalizeWhatsAppNumber(to);
  const message = String(body || "").trim();
  if (!recipient || !message) throw new Error("WhatsApp recipient and body are required");

  const response = await fetchImpl(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body: message }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp reply failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

function nonTextReply(message) {
  return message.type === "text"
    ? null
    : "Text commands only. Try: away 2h, limited 30m, back or status.";
}

async function processOwnerMessage(
  env,
  message,
  store,
  { executeCommand, sendText }
) {
  const claimed = await store.claim(message);
  const existing = claimed?.row || null;

  if (!claimed?.isNew) {
    if (existing?.command_status === "processed") {
      if (existing.reply_status !== "sent" && existing.response_text) {
        await sendText(env, message.from, existing.response_text);
        await store.markReplied(message.id);
      }
      return { duplicate: true, replied: existing.reply_status !== "sent" };
    }

    // A second delivery can arrive before the first request finishes. Never let
    // that concurrent retry execute the same temporary Availability command.
    // Returning a retryable failure keeps the operation fail-safe until the
    // first request reaches the durable 'processed' state.
    throw new Error("Duplicate WhatsApp owner message is still processing");
  }

  let responseText = nonTextReply(message);
  if (!responseText) {
    const result = await executeCommand(env, message.text, {
      actorEmail: String(env?.WHATSAPP_OWNER_ACTOR_EMAIL || "sam@sdlive.show").trim()
    });
    responseText = String(result?.reply || "Command processed.").trim();
  }

  await store.markProcessed(message.id, responseText);
  await sendText(env, message.from, responseText);
  await store.markReplied(message.id);
  return { duplicate: false, replied: true };
}

/**
 * Meta WhatsApp webhook for verified-owner Availability commands.
 *
 * Security order is intentional:
 * 1. validate Meta HMAC signature;
 * 2. parse only the signed body;
 * 3. require the configured phone_number_id and owner sender number;
 * 4. only then invoke the Availability command executor.
 */
export async function handleWhatsAppOwnerWebhook(
  request,
  env,
  {
    verifySignature = verifyMetaWebhookSignature,
    executeCommand = executeAvailabilityOwnerCommand,
    sendText = sendWhatsAppText,
    store = null
  } = {}
) {
  if (normalizedPath(request) !== WEBHOOK_PATH) return null;

  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = String(env?.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "");

    if (mode === "subscribe" && expected && token === expected && challenge) {
      return text(challenge, 200);
    }
    return text("Forbidden", 403);
  }

  if (request.method !== "POST") return text("Method not allowed", 405);

  const appSecret = String(env?.WHATSAPP_APP_SECRET || "");
  if (!appSecret) return text("Webhook unavailable", 503);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return text("Payload too large", 413);
  }

  const signatureOk = await verifySignature(
    rawBody,
    request.headers.get("X-Hub-Signature-256"),
    appSecret
  );
  if (!signatureOk) return text("Unauthorized", 401);

  let payload;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    return text("Invalid JSON", 400);
  }

  const ownerNumber = normalizeWhatsAppNumber(env?.WHATSAPP_OWNER_NUMBER);
  const phoneNumberId = String(env?.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  if (!ownerNumber || !/^\d+$/.test(phoneNumberId)) return text("Webhook unavailable", 503);

  const messages = extractWhatsAppMessages(payload, phoneNumberId);
  const ownerMessages = messages.filter((message) => message.from === ownerNumber);
  if (!ownerMessages.length) return text("EVENT_RECEIVED", 200);

  const messageStore = store || createD1OwnerMessageStore(env);

  try {
    for (const message of ownerMessages) {
      await processOwnerMessage(env, message, messageStore, {
        executeCommand,
        sendText
      });
    }
    return text("EVENT_RECEIVED", 200);
  } catch (error) {
    console.error("[SD.Live] WhatsApp owner command failed", error);
    // Returning 500 asks Meta to retry. Idempotency prevents an already-applied
    // Availability command from being applied a second time; a pending reply
    // can be retried independently.
    return text("Temporary webhook failure", 500);
  }
}
