import {
  inspectExactAssistantLeadsMigration,
  migrateAssistantLeadsExact
} from "./assistant-leads-schema-migration.js";

export const ASSISTANT_LEADS_MIGRATION_PATH = "/api/admin/assistant/leads-migrate";
export const ASSISTANT_LEADS_MIGRATION_CONFIRMATION = "MIGRATE_ASSISTANT_LEADS_V1";

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

  if (String(body.confirmation || "") !== ASSISTANT_LEADS_MIGRATION_CONFIRMATION) {
    return { ok: false, status: 409, error: "explicit_confirmation_required" };
  }

  return { ok: true };
}

function publicMigrationReport(report = {}) {
  return {
    ok: report.ok === true,
    readOnly: report.readOnly === true,
    alreadyApplied: report.alreadyApplied === true,
    canApply: report.canApply === true,
    blockers: Array.isArray(report.blockers) ? report.blockers : [],
    counts: report.counts || null,
    foreignKeyViolations: Number(report.foreignKeyViolations) || 0,
    temporaryObjects: Array.isArray(report.temporaryObjects) ? report.temporaryObjects : [],
    plannedChange: report.plannedChange || null
  };
}

export async function handleAssistantLeadsMigrationApi(
  request,
  env,
  {
    verifyAdmin,
    inspect = inspectExactAssistantLeadsMigration,
    migrate = migrateAssistantLeadsExact
  } = {}
) {
  if (normalizedPath(request) !== ASSISTANT_LEADS_MIGRATION_PATH) return null;

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, {
      Allow: "GET, POST"
    });
  }

  if (typeof verifyAdmin !== "function") {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const actor = await verifyAdmin(request, env).catch(() => null);
  if (!actor?.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (request.method === "GET") {
    try {
      const report = await inspect(env);
      return json({
        ...publicMigrationReport(report),
        actor: String(actor.email).trim().toLowerCase()
      });
    } catch {
      return json({
        ok: false,
        readOnly: true,
        error: "assistant_leads_migration_inspection_failed"
      }, 500);
    }
  }

  const confirmation = await readConfirmation(request);
  if (!confirmation.ok) {
    return json({ ok: false, error: confirmation.error }, confirmation.status);
  }

  try {
    const result = await migrate(env);
    const status = result.ok ? 200 : 409;
    return json({
      ok: result.ok === true,
      actor: String(actor.email).trim().toLowerCase(),
      applied: result.applied === true,
      alreadyApplied: result.alreadyApplied === true,
      leadsReady: result.leadsReady === true || result.after?.leads?.canInsertAssistantLead === true,
      blockers: Array.isArray(result.blockers) ? result.blockers : [],
      before: result.before ? publicMigrationReport(result.before) : null,
      afterLeads: result.after?.leads || null
    }, status);
  } catch {
    return json({
      ok: false,
      applied: false,
      error: "assistant_leads_migration_failed"
    }, 500);
  }
}
