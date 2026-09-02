import { inspectAssistantStoragePreflight } from "./assistant-storage-preflight.js";
import { inspectAssistantLeadsMigrationPrecheck } from "./assistant-leads-migration-precheck.js";
import { inspectExactAssistantLeadsMigration } from "./assistant-leads-schema-migration.js";

export const ASSISTANT_STORAGE_PREFLIGHT_PATH = "/api/admin/assistant/preflight";
export const ASSISTANT_LEADS_MIGRATION_DETAIL = "leads-migration";
export const ASSISTANT_LEADS_MIGRATION_READINESS_DETAIL = "leads-migration-readiness";

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function handleAssistantStoragePreflightApi(
  request,
  env,
  {
    verifyAdmin,
    inspectStorage = inspectAssistantStoragePreflight,
    inspectLeadsMigration = inspectAssistantLeadsMigrationPrecheck,
    inspectLeadsMigrationReadiness = inspectExactAssistantLeadsMigration
  } = {}
) {
  if (normalizedPath(request) !== ASSISTANT_STORAGE_PREFLIGHT_PATH) return null;

  if (request.method !== "GET") {
    return json({ ok: false, readOnly: true, error: "Method not allowed" }, 405);
  }

  const admin = typeof verifyAdmin === "function"
    ? await verifyAdmin(request, env)
    : null;

  if (!admin?.email) {
    return json({ ok: false, readOnly: true, error: "Unauthorized" }, 401);
  }

  try {
    const storage = await inspectStorage(env);
    const payload = {
      ok: true,
      readOnly: true,
      actor: String(admin.email).toLowerCase(),
      readyForAssistantLeadCapture: Boolean(storage?.readyForAssistantLeadCapture),
      storage
    };

    const detail = new URL(request.url).searchParams.get("detail");
    if (detail === ASSISTANT_LEADS_MIGRATION_DETAIL) {
      payload.migrationPrecheck = await inspectLeadsMigration(env);
    } else if (detail === ASSISTANT_LEADS_MIGRATION_READINESS_DETAIL) {
      payload.migrationReadiness = await inspectLeadsMigrationReadiness(env);
    }

    return json(payload);
  } catch (error) {
    console.error("[SD.Live] Assistant storage preflight failed", error);
    return json({
      ok: false,
      readOnly: true,
      error: "Could not inspect Assistant storage readiness"
    }, 500);
  }
}
