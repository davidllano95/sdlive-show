import { ensureLeadCoreStorageSchema } from "./lead-core-storage.js";

const MAX_LEADS = 200;
const DEFAULT_LEADS = 100;
const VALID_LEAD_STATUSES = Object.freeze([
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "lost"
]);
const VALID_LEAD_STATUS_SET = new Set(VALID_LEAD_STATUSES);

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

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function columnNames(result) {
  return new Set(
    (Array.isArray(result?.results) ? result.results : [])
      .map((row) => String(row?.name || "").trim())
      .filter(Boolean)
  );
}

function safeLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LEADS;
  return Math.min(MAX_LEADS, parsed);
}

function optionalColumn(columns, name) {
  return columns.has(name)
    ? name
    : `NULL AS ${name}`;
}

function parseDetails(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function normalizeLeadStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return VALID_LEAD_STATUS_SET.has(status) ? status : null;
}

export function normalizeLeadAdminRow(row) {
  const source = String(row?.source || row?.type || "other").trim() || "other";
  const status = normalizeLeadStatus(row?.status) || "new";

  return {
    id: Number(row?.id) || 0,
    source,
    status,
    serviceCategory: String(row?.service_category || (source === "rental" ? "rental" : "other")),
    name: String(row?.name || ""),
    email: row?.email ? String(row.email) : null,
    summary: row?.message ? String(row.message) : null,
    language: row?.language ? String(row.language) : null,
    market: row?.market ? String(row.market) : null,
    preferredContactChannel: row?.preferred_contact_channel
      ? String(row.preferred_contact_channel)
      : null,
    contact: {
      phone: row?.contact_phone ? String(row.contact_phone) : null,
      whatsapp: row?.contact_whatsapp ? String(row.contact_whatsapp) : null,
      other: row?.contact_other ? String(row.contact_other) : null
    },
    project: {
      date: row?.project_date ? String(row.project_date) : null,
      city: row?.project_city ? String(row.project_city) : null,
      venue: row?.project_venue ? String(row.project_venue) : null
    },
    details: parseDetails(row?.details_json),
    attribution: {
      sourceUrl: row?.source_url ? String(row.source_url) : null,
      referrer: row?.referrer ? String(row.referrer) : null,
      utmSource: row?.utm_source ? String(row.utm_source) : null,
      utmMedium: row?.utm_medium ? String(row.utm_medium) : null,
      utmCampaign: row?.utm_campaign ? String(row.utm_campaign) : null
    },
    createdAt: row?.created_at ? String(row.created_at) : null,
    updatedAt: row?.updated_at ? String(row.updated_at) : null
  };
}

export async function listLeadAdminRows(env, { limit = DEFAULT_LEADS } = {}) {
  await ensureLeadCoreStorageSchema(env);

  const db = databaseFromEnv(env);
  const info = await db.prepare("PRAGMA table_info(leads)").all();
  const columns = columnNames(info);

  if (!columns.has("id")) {
    throw new Error("leads table is missing id");
  }

  const statement = db.prepare(`
    SELECT
      id,
      ${optionalColumn(columns, "type")},
      ${optionalColumn(columns, "source")},
      ${optionalColumn(columns, "status")},
      ${optionalColumn(columns, "service_category")},
      ${optionalColumn(columns, "name")},
      ${optionalColumn(columns, "email")},
      ${optionalColumn(columns, "message")},
      ${optionalColumn(columns, "language")},
      ${optionalColumn(columns, "market")},
      ${optionalColumn(columns, "preferred_contact_channel")},
      ${optionalColumn(columns, "contact_phone")},
      ${optionalColumn(columns, "contact_whatsapp")},
      ${optionalColumn(columns, "contact_other")},
      ${optionalColumn(columns, "project_date")},
      ${optionalColumn(columns, "project_city")},
      ${optionalColumn(columns, "project_venue")},
      ${optionalColumn(columns, "details_json")},
      ${optionalColumn(columns, "source_url")},
      ${optionalColumn(columns, "referrer")},
      ${optionalColumn(columns, "utm_source")},
      ${optionalColumn(columns, "utm_medium")},
      ${optionalColumn(columns, "utm_campaign")},
      ${optionalColumn(columns, "created_at")},
      ${optionalColumn(columns, "updated_at")}
    FROM leads
    ORDER BY id DESC
    LIMIT ?
  `);

  const result = await statement.bind(safeLimit(limit)).all();
  return (Array.isArray(result?.results) ? result.results : [])
    .map(normalizeLeadAdminRow);
}

async function ensureLeadStatusHistorySchema(env) {
  const db = databaseFromEnv(env);

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS lead_status_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_lead_status_events_lead_id
    ON lead_status_events (lead_id, created_at DESC)
  `).run();
}

export async function updateLeadAdminStatus(
  env,
  {
    leadId,
    status,
    actorEmail
  } = {}
) {
  const id = Number(leadId);
  const nextStatus = normalizeLeadStatus(status);
  const actor = String(actorEmail || "").trim();

  if (!Number.isInteger(id) || id < 1) {
    throw new Error("leadId must be a positive integer");
  }
  if (!nextStatus) {
    throw new Error("Invalid lead status");
  }
  if (!actor) {
    throw new Error("actorEmail is required");
  }

  await ensureLeadCoreStorageSchema(env);
  await ensureLeadStatusHistorySchema(env);

  const db = databaseFromEnv(env);
  const currentResult = await db
    .prepare("SELECT id, status FROM leads WHERE id = ? LIMIT 1")
    .bind(id)
    .all();
  const currentRow = Array.isArray(currentResult?.results)
    ? currentResult.results[0]
    : null;

  if (!currentRow) {
    return { found: false, changed: false, leadId: id };
  }

  const previousStatus = normalizeLeadStatus(currentRow.status) || "new";
  if (previousStatus === nextStatus) {
    return {
      found: true,
      changed: false,
      leadId: id,
      previousStatus,
      status: nextStatus
    };
  }

  const updateStatement = db
    .prepare(`
      UPDATE leads
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(nextStatus, id);

  const eventStatement = db
    .prepare(`
      INSERT INTO lead_status_events (
        lead_id,
        from_status,
        to_status,
        actor_email
      ) VALUES (?, ?, ?, ?)
    `)
    .bind(id, previousStatus, nextStatus, actor);

  if (typeof db.batch === "function") {
    await db.batch([updateStatement, eventStatement]);
  } else {
    await updateStatement.run();
    await eventStatement.run();
  }

  return {
    found: true,
    changed: true,
    leadId: id,
    previousStatus,
    status: nextStatus
  };
}

async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body
      : null;
  } catch {
    return null;
  }
}

export async function handleLeadAdminApi(
  request,
  env,
  {
    verifyAdmin,
    listLeads = listLeadAdminRows,
    updateStatus = updateLeadAdminStatus
  } = {}
) {
  if (normalizedPath(request) !== "/api/admin/leads") return null;

  if (request.method !== "GET" && request.method !== "PATCH") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const admin = typeof verifyAdmin === "function"
    ? await verifyAdmin(request, env)
    : null;

  if (!admin?.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  if (request.method === "PATCH") {
    const body = await readJsonBody(request);
    const leadId = Number(body?.leadId);
    const status = normalizeLeadStatus(body?.status);

    if (!Number.isInteger(leadId) || leadId < 1 || !status) {
      return json({
        ok: false,
        error: "A valid leadId and status are required"
      }, 400);
    }

    try {
      const result = await updateStatus(env, {
        leadId,
        status,
        actorEmail: admin.email
      });

      if (!result?.found) {
        return json({ ok: false, error: "Lead not found" }, 404);
      }

      return json({
        ok: true,
        actor: admin.email,
        leadId,
        status: result.status,
        previousStatus: result.previousStatus,
        changed: Boolean(result.changed)
      });
    } catch (error) {
      console.error("[SD.Live] Lead Admin status update failed", error);
      return json({
        ok: false,
        error: "Could not update lead status"
      }, 500);
    }
  }

  try {
    const url = new URL(request.url);
    const leads = await listLeads(env, {
      limit: safeLimit(url.searchParams.get("limit"))
    });

    return json({
      ok: true,
      readOnly: false,
      capabilities: {
        updateStatus: true
      },
      actor: admin.email,
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error("[SD.Live] Lead Admin read failed", error);
    return json({
      ok: false,
      error: "Could not load leads"
    }, 500);
  }
}
