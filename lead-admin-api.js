import { ensureLeadCoreStorageSchema } from "./lead-core-storage.js";

const MAX_LEADS = 200;
const DEFAULT_LEADS = 100;

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

export function normalizeLeadAdminRow(row) {
  const source = String(row?.source || row?.type || "other").trim() || "other";
  const status = String(row?.status || "new").trim() || "new";

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

export async function handleLeadAdminApi(
  request,
  env,
  {
    verifyAdmin,
    listLeads = listLeadAdminRows
  } = {}
) {
  if (normalizedPath(request) !== "/api/admin/leads") return null;

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
    const url = new URL(request.url);
    const leads = await listLeads(env, {
      limit: safeLimit(url.searchParams.get("limit"))
    });

    return json({
      ok: true,
      readOnly: true,
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
