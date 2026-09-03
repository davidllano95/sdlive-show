import { executeAvailabilityOwnerCommand } from "./availability-owner-control.js";
import { createD1OwnerMessageStore } from "./whatsapp-owner-storage.js";

export const WHATSAPP_OWNER_WEBHOOK_PATH = "/api/webhooks/whatsapp";
const MAX_WEBHOOK_BYTES = 512000;

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
}

function text(value, status = 200, headers = {}) {
  return new Response(String(value || ""), {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function enabled(env) {
  return String(env?.WHATSAPP_OWNER_CONTROL_ENABLED || "").trim().toLowerCase() === "true";
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

function requiredReplyConfig(env) {
  const graphVersion = String(env?.WHATSAPP_GRAPH_API_VERSION || "").trim();
  const phoneNumberId = String(env?.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const accessToken = String(env?.WHATSAPP_ACCESS_TOKEN || "").trim();

  if (!/^v\d+\.\d+$/.test(graphVersion)) throw new Error("whatsapp_graph_version_invalid");
  if (!/^\d+$/.test(phoneNumberId)) throw new Error("whatsapp_phone_number_id_invalid");
  if (!accessToken) throw new Error("whatsapp_access_token_missing");

  return { graphVersion, phoneNumberId, accessToken };
}

export async function sendWhatsAppText(env, to, body, { fetchImpl = fetch } = {}) {
  const { graphVersion, phoneNumberId, accessToken } = requiredReplyConfig(env);
  const recipient = normalizeWhatsAppNumber(to);
  const message = String(body || "").trim();
  if (!recipient || !message) throw new Error("whatsapp_reply_input_invalid");

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
    // Never echo Meta/provider response bodies into public errors or logs.
    throw new Error(`whatsapp_reply_failed_${response.status}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

function nonTextReply(message) {
  return message.type === "text"
    ? null
    : "Text commands only. Try: away 2h, limited 30m, back or status.";
}

export async function processOwnerMessage(
  env,
  message,
  store,
  { executeCommand = executeAvailabilityOwnerCommand, sendText = sendWhatsAppText } = {}
) {
  const claimed = await store.claim(message);
  const existing = claimed?.row || null;

  if (!claimed?.isNew) {
    if (existing?.command_status === "processed") {
      if (existing.reply_status !== "sent" && existing.response_text) {
        await sendText(env, message.from, existing.response_text);
        await store.markReplied(message.id);
        return { duplicate: true, replied: true };
      }
      return { duplicate: true, replied: false };
    }

    // A retry can race the original request. Never execute the same Availability
    // command twice. Meta can retry after this request fails safely.
    throw new Error("whatsapp_message_in_flight");
  }

  let responseText = nonTextReply(message);
  if (!responseText) {
    const actorEmail = String(env?.WHATSAPP_OWNER_ACTOR_EMAIL || "").trim().toLowerCase();
    if (!actorEmail || !actorEmail.includes("@")) {
      throw new Error("whatsapp_owner_actor_email_missing");
    }
    const result = await executeCommand(env, message.text, { actorEmail });
    responseText = String(result?.reply || "Command processed.").trim();
  }

  await store.markProcessed(message.id, responseText);
  await sendText(env, message.from, responseText);
  await store.markReplied(message.id);
  return { duplicate: false, replied: true };
}

/**
 * Meta WhatsApp webhook for verified-owner Availability commands.
 * Security order: Meta HMAC -> signed-body parse -> hard kill switch -> exact
 * phone_number_id -> exact owner sender -> idempotency -> canonical Availability.
 * No public code path performs D1 DDL.
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
  if (normalizedPath(request) !== WHATSAPP_OWNER_WEBHOOK_PATH) return null;

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

  if (request.method !== "POST") return text("Method not allowed", 405, { Allow: "GET, POST" });

  const appSecret = String(env?.WHATSAPP_APP_SECRET || "");
  if (!appSecret) return text("Webhook unavailable", 503);

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) {
    return text("Payload too large", 413);
  }

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

  // Deployment is safe before onboarding. Signed events are acknowledged but
  // cannot mutate Availability until the explicit activation flag is true.
  if (!enabled(env)) return text("EVENT_RECEIVED", 200);

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
    console.error("[SD.Live] WhatsApp owner command failed", String(error?.name || "Error"));
    // 500 asks Meta to retry. The durable message ID prevents a completed
    // Availability command from being applied twice and retries pending replies.
    return text("Temporary webhook failure", 500);
  }
}
