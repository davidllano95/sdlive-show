import { inspectAssistantStoragePreflight } from "./assistant-storage-preflight.js";

const PREFLIGHT_PATH = "/api/admin/assistant/preflight";

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

export async function handleAssistantAdminPreflight(
  request,
  env,
  {
    verifyAdmin,
    inspectStorage = inspectAssistantStoragePreflight
  } = {}
) {
  if (normalizedPath(request) !== PREFLIGHT_PATH) return null;

  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const admin = typeof verifyAdmin === "function"
    ? await verifyAdmin(request, env)
    : null;

  if (!admin?.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const storage = await inspectStorage(env);
    return json({
      ok: true,
      readOnly: true,
      actor: String(admin.email).toLowerCase(),
      readyForAssistantLeadCapture: Boolean(storage?.readyForAssistantLeadCapture),
      storage
    });
  } catch (error) {
    console.error("[SD.Live] Assistant Admin storage preflight failed", error);
    return json({
      ok: false,
      readOnly: true,
      error: "Could not inspect Assistant storage readiness"
    }, 500);
  }
}
