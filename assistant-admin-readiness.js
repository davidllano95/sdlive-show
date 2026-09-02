import { inspectAssistantRuntimeReadiness } from "./assistant-runtime-readiness.js";

export const ASSISTANT_RUNTIME_READINESS_PATH = "/api/admin/assistant/readiness";

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

export async function handleAssistantRuntimeReadinessApi(
  request,
  env,
  {
    verifyAdmin,
    inspectRuntime = inspectAssistantRuntimeReadiness
  } = {}
) {
  if (normalizedPath(request) !== ASSISTANT_RUNTIME_READINESS_PATH) return null;

  if (request.method !== "GET") {
    return json({
      ok: false,
      readOnly: true,
      error: "Method not allowed"
    }, 405, { Allow: "GET" });
  }

  if (typeof verifyAdmin !== "function") {
    return json({
      ok: false,
      readOnly: true,
      error: "Unauthorized"
    }, 401);
  }

  const actor = await verifyAdmin(request, env).catch(() => null);
  if (!actor?.email) {
    return json({
      ok: false,
      readOnly: true,
      error: "Unauthorized"
    }, 401);
  }

  try {
    const runtime = await inspectRuntime(env);
    return json({
      ok: true,
      readOnly: true,
      actor: String(actor.email).trim().toLowerCase(),
      readyForRuntimeConfiguration: runtime.readyForRuntimeConfiguration === true,
      runtime
    });
  } catch {
    return json({
      ok: false,
      readOnly: true,
      error: "Assistant runtime readiness inspection failed"
    }, 500);
  }
}
