import { prepareAssistantStorage } from "./assistant-storage-preparation.js";

export const ASSISTANT_STORAGE_PREPARATION_PATH = "/api/admin/assistant/storage-prepare";
export const ASSISTANT_STORAGE_PREPARATION_CONFIRMATION = "PREPARE_ASSISTANT_STORAGE";

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

  if (String(body.confirmation || "") !== ASSISTANT_STORAGE_PREPARATION_CONFIRMATION) {
    return { ok: false, status: 409, error: "explicit_confirmation_required" };
  }

  return { ok: true };
}

export async function handleAssistantStoragePreparationApi(
  request,
  env,
  { verifyAdmin, prepare = prepareAssistantStorage } = {}
) {
  if (normalizedPath(request) !== ASSISTANT_STORAGE_PREPARATION_PATH) return null;

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  if (typeof verifyAdmin !== "function") {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const actor = await verifyAdmin(request, env).catch(() => null);
  if (!actor?.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const confirmation = await readConfirmation(request);
  if (!confirmation.ok) {
    return json({ ok: false, error: confirmation.error }, confirmation.status);
  }

  try {
    const result = await prepare(env);
    const status = result?.ok === true ? 200 : 409;
    return json({
      ok: result?.ok === true,
      actor: String(actor.email).trim().toLowerCase(),
      applied: result?.applied === true,
      alreadyReady: result?.alreadyReady === true,
      ready: result?.ready === true,
      actions: Array.isArray(result?.actions) ? result.actions : [],
      blockers: Array.isArray(result?.blockers) ? result.blockers : [],
      before: result?.before || null,
      after: result?.after || null,
      preflight: result?.preflight || null
    }, status);
  } catch (error) {
    console.error("[SD.Live] Assistant storage preparation failed", error);
    return json({
      ok: false,
      applied: false,
      ready: false,
      error: "assistant_storage_preparation_failed"
    }, 500);
  }
}
