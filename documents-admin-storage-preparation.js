import {
  inspectDocumentsStoragePreflight,
  prepareDocumentsStorage
} from "./documents-storage-preparation.js";

export const DOCUMENTS_STORAGE_PREFLIGHT_PATH = "/api/admin/documents/storage-preflight";
export const DOCUMENTS_STORAGE_PREPARATION_PATH = "/api/admin/documents/storage-prepare";
export const DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION = "PREPARE_DOCUMENTS_STORAGE";

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

async function verifyRequestAdmin(request, env, verifyAdmin) {
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

  if (String(body.confirmation || "") !== DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION) {
    return { ok: false, status: 409, error: "explicit_confirmation_required" };
  }

  return { ok: true };
}

function unavailableResponse(report = null) {
  return json({
    ok: false,
    error: "documents_storage_unavailable",
    preflight: report
  }, 503);
}

export async function handleDocumentsStorageApi(
  request,
  env,
  {
    verifyAdmin,
    inspect = inspectDocumentsStoragePreflight,
    prepare = prepareDocumentsStorage
  } = {}
) {
  const path = normalizedPath(request);
  if (
    path !== DOCUMENTS_STORAGE_PREFLIGHT_PATH &&
    path !== DOCUMENTS_STORAGE_PREPARATION_PATH
  ) {
    return null;
  }

  const actor = await verifyRequestAdmin(request, env, verifyAdmin);
  if (!actor?.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (path === DOCUMENTS_STORAGE_PREFLIGHT_PATH) {
    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, 405, { Allow: "GET" });
    }

    try {
      const report = await inspect(env);
      if (report?.available !== true) return unavailableResponse(report || null);
      return json({ ...report, actor: String(actor.email).trim().toLowerCase() });
    } catch (error) {
      console.error("[SD.Live] Documents storage preflight failed", error);
      return json({ ok: false, error: "documents_storage_preflight_failed" }, 500);
    }
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, { Allow: "POST" });
  }

  const confirmation = await readConfirmation(request);
  if (!confirmation.ok) {
    return json({ ok: false, error: confirmation.error }, confirmation.status);
  }

  try {
    const result = await prepare(env);
    if (result?.error === "documents_storage_unavailable") {
      return unavailableResponse(result?.before || null);
    }
    const status = result?.ok === true ? 200 : 409;
    return json({
      ok: result?.ok === true,
      actor: String(actor.email).trim().toLowerCase(),
      applied: result?.applied === true,
      alreadyReady: result?.alreadyReady === true,
      ready: result?.ready === true,
      blockers: Array.isArray(result?.blockers) ? result.blockers : [],
      before: result?.before || null,
      after: result?.after || null
    }, status);
  } catch (error) {
    console.error("[SD.Live] Documents storage preparation failed", error);
    return json({
      ok: false,
      applied: false,
      ready: false,
      error: "documents_storage_preparation_failed"
    }, 500);
  }
}
