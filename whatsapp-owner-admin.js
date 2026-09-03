import {
  inspectWhatsAppOwnerStorage,
  prepareWhatsAppOwnerStorage
} from "./whatsapp-owner-storage.js";

export const WHATSAPP_OWNER_READINESS_PATH = "/api/admin/whatsapp-owner/readiness";
export const WHATSAPP_OWNER_STORAGE_PREPARE_PATH = "/api/admin/whatsapp-owner/storage-prepare";
export const WHATSAPP_OWNER_STORAGE_CONFIRMATION = "PREPARE_WHATSAPP_OWNER_STORAGE";

function normalizedPath(request) {
  try {
    const path = new URL(request.url).pathname;
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  } catch {
    return "";
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function isEnabled(env) {
  return String(env?.WHATSAPP_OWNER_CONTROL_ENABLED || "").trim().toLowerCase() === "true";
}

function validGraphVersion(value) {
  return /^v\d+\.\d+$/.test(String(value || "").trim());
}

function validPhoneNumberId(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function validOwnerNumber(value) {
  return /^\d{8,18}$/.test(String(value || "").replace(/\D/g, ""));
}

function validActorEmail(value) {
  const email = String(value || "").trim();
  return Boolean(email && email.includes("@") && email.length <= 320);
}

function runtimeConfig(env) {
  const checks = {
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: Boolean(String(env?.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim()),
    WHATSAPP_APP_SECRET: Boolean(String(env?.WHATSAPP_APP_SECRET || "").trim()),
    WHATSAPP_PHONE_NUMBER_ID: validPhoneNumberId(env?.WHATSAPP_PHONE_NUMBER_ID),
    WHATSAPP_ACCESS_TOKEN: Boolean(String(env?.WHATSAPP_ACCESS_TOKEN || "").trim()),
    WHATSAPP_OWNER_NUMBER: validOwnerNumber(env?.WHATSAPP_OWNER_NUMBER),
    WHATSAPP_OWNER_ACTOR_EMAIL: validActorEmail(env?.WHATSAPP_OWNER_ACTOR_EMAIL),
    WHATSAPP_GRAPH_API_VERSION: validGraphVersion(env?.WHATSAPP_GRAPH_API_VERSION)
  };
  const missingBindings = Object.entries(checks)
    .filter(([, ready]) => !ready)
    .map(([name]) => name);
  return { checks, missingBindings };
}

async function verifyActor(request, env, verifyAdmin) {
  if (typeof verifyAdmin !== "function") return null;
  return verifyAdmin(request, env).catch(() => null);
}

async function readConfirmation(request) {
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) {
    return { ok: false, status: 415, error: "application_json_required" };
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 512) {
    return { ok: false, status: 413, error: "request_too_large" };
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "body_must_be_object" };
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "confirmation") {
    return { ok: false, status: 400, error: "invalid_confirmation_payload" };
  }
  if (String(body.confirmation || "") !== WHATSAPP_OWNER_STORAGE_CONFIRMATION) {
    return { ok: false, status: 409, error: "explicit_confirmation_required" };
  }
  return { ok: true };
}

export async function handleWhatsAppOwnerAdminApi(
  request,
  env,
  {
    verifyAdmin,
    inspectStorage = inspectWhatsAppOwnerStorage,
    prepareStorage = prepareWhatsAppOwnerStorage
  } = {}
) {
  const path = normalizedPath(request);
  if (![WHATSAPP_OWNER_READINESS_PATH, WHATSAPP_OWNER_STORAGE_PREPARE_PATH].includes(path)) {
    return null;
  }

  const actor = await verifyActor(request, env, verifyAdmin);
  if (!actor?.email) return json({ ok: false, error: "Unauthorized" }, 401);

  if (path === WHATSAPP_OWNER_READINESS_PATH) {
    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405, { Allow: "GET" });
    }

    const storage = await inspectStorage(env);
    const config = runtimeConfig(env);
    const enabled = isEnabled(env);
    return json({
      ok: true,
      actor: String(actor.email).trim().toLowerCase(),
      publicExposure: { enabled },
      storage,
      runtime: {
        configured: config.missingBindings.length === 0,
        missingBindings: config.missingBindings
      },
      readyForActivation: storage.ready === true && config.missingBindings.length === 0,
      active: enabled && storage.ready === true && config.missingBindings.length === 0
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  const confirmation = await readConfirmation(request);
  if (!confirmation.ok) {
    return json({ ok: false, error: confirmation.error }, confirmation.status);
  }

  try {
    const result = await prepareStorage(env);
    return json({
      ok: result?.ok === true,
      actor: String(actor.email).trim().toLowerCase(),
      applied: result?.applied === true,
      alreadyReady: result?.alreadyReady === true,
      ready: result?.ready === true,
      actions: Array.isArray(result?.actions) ? result.actions : [],
      blockers: Array.isArray(result?.blockers) ? result.blockers : [],
      before: result?.before || null,
      after: result?.after || null
    }, result?.ok === true ? 200 : 409);
  } catch (error) {
    console.error("[SD.Live] WhatsApp owner storage preparation failed", error);
    return json({
      ok: false,
      applied: false,
      ready: false,
      error: "whatsapp_owner_storage_preparation_failed"
    }, 500);
  }
}
