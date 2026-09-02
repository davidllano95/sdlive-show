import {
  LEAD_CORE_SOURCES,
  normalizeLeadCoreInput
} from "./lead-core.js";

const LEGACY_REQUIRED_COLUMNS = Object.freeze([
  "id",
  "type",
  "status",
  "name",
  "email",
  "message",
  "language",
  "market"
]);

const CANONICAL_REQUIRED_COLUMNS = Object.freeze([
  "source",
  "service_category",
  "preferred_contact_channel",
  "contact_phone",
  "contact_whatsapp",
  "contact_other",
  "project_date",
  "project_city",
  "project_venue",
  "details_json",
  "updated_at"
]);

const OPTIONAL_ATTRIBUTION_COLUMNS = Object.freeze([
  "source_url",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign"
]);

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function normalizedSource(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!LEAD_CORE_SOURCES.includes(source)) {
    throw new Error("Lead Core source is invalid");
  }
  return source;
}

function columnMap(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = String(row?.name || "").trim();
    if (!name) continue;
    map.set(name, {
      name,
      type: String(row?.type || "").trim().toUpperCase(),
      notNull: Number(row?.notnull || 0) === 1,
      primaryKey: Number(row?.pk || 0) > 0,
      defaultValue: row?.dflt_value ?? null
    });
  }
  return map;
}

function relevantCheckExpressions(tableSql, columnName) {
  const sql = String(tableSql || "");
  const checks = [];
  const pattern = /CHECK\s*\(([^)]*)\)/gi;
  let match;

  while ((match = pattern.exec(sql))) {
    const expression = String(match[1] || "");
    if (new RegExp(`\\b${columnName}\\b`, "i").test(expression)) {
      checks.push(expression);
    }
  }

  return checks;
}

function sqlStringLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function checksDemonstrablyAllowValue(tableSql, columnName, value) {
  const checks = relevantCheckExpressions(tableSql, columnName);
  if (!checks.length) {
    return {
      constrained: false,
      allowed: true,
      checks: []
    };
  }

  const literal = sqlStringLiteral(value).toLowerCase();
  const allowed = checks.every((expression) =>
    expression.toLowerCase().includes(literal)
  );

  return {
    constrained: true,
    allowed,
    checks
  };
}

function missingColumns(columns, required) {
  return required.filter((name) => !columns.has(name));
}

export function analyzeLeadStorageCompatibility({
  source,
  columns: columnRows,
  tableSql
}) {
  const normalized = normalizedSource(source);
  const columns = columnMap(columnRows);
  const missingLegacy = missingColumns(columns, LEGACY_REQUIRED_COLUMNS);
  const missingCanonical = missingColumns(columns, CANONICAL_REQUIRED_COLUMNS);

  if (!String(tableSql || "").trim()) {
    return {
      ok: true,
      source: normalized,
      canInsert: false,
      reason: "schema_sql_unavailable",
      missingLegacy,
      missingCanonical,
      columns: [...columns.keys()]
    };
  }

  if (missingLegacy.length || missingCanonical.length) {
    return {
      ok: true,
      source: normalized,
      canInsert: false,
      reason: "required_columns_missing",
      missingLegacy,
      missingCanonical,
      columns: [...columns.keys()]
    };
  }

  const typeCheck = checksDemonstrablyAllowValue(tableSql, "type", normalized);
  if (!typeCheck.allowed) {
    return {
      ok: true,
      source: normalized,
      canInsert: false,
      reason: "legacy_type_check_not_proven",
      missingLegacy,
      missingCanonical,
      columns: [...columns.keys()],
      typeConstrained: true
    };
  }

  const statusCheck = checksDemonstrablyAllowValue(tableSql, "status", "new");
  if (!statusCheck.allowed) {
    return {
      ok: true,
      source: normalized,
      canInsert: false,
      reason: "legacy_status_check_not_proven",
      missingLegacy,
      missingCanonical,
      columns: [...columns.keys()],
      typeConstrained: typeCheck.constrained,
      statusConstrained: true
    };
  }

  return {
    ok: true,
    source: normalized,
    canInsert: true,
    reason: "compatible",
    missingLegacy,
    missingCanonical,
    columns: [...columns.keys()],
    typeConstrained: typeCheck.constrained,
    statusConstrained: statusCheck.constrained,
    legacyEmailRequired: Boolean(columns.get("email")?.notNull)
  };
}

/**
 * Strictly read-only inspection of the real D1 `leads` table.
 * It performs only PRAGMA/SELECT metadata reads and never calls schema helpers.
 */
export async function inspectLeadStorageCompatibility(
  env,
  source = "assistant"
) {
  const normalized = normalizedSource(source);
  const db = databaseFromEnv(env);
  const [tableInfo, schemaRow] = await Promise.all([
    db.prepare("PRAGMA table_info(leads)").all(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'leads'
      LIMIT 1
    `).first()
  ]);

  return analyzeLeadStorageCompatibility({
    source: normalized,
    columns: tableInfo?.results,
    tableSql: schemaRow?.sql
  });
}

function assertDirectCreateInput(lead, compatibility) {
  const hasContact = Boolean(
    lead.contact.email ||
    lead.contact.phone ||
    lead.contact.whatsapp ||
    lead.contact.other
  );

  if (!hasContact) {
    throw new Error("Lead Core direct creation requires at least one contact channel");
  }

  if (lead.source === "assistant" && lead.status !== "new") {
    throw new Error("Assistant lead creation must start in New status");
  }

  if (lead.source === "assistant" && !lead.summary) {
    throw new Error("Assistant lead creation requires a summary");
  }

  if (compatibility?.legacyEmailRequired && !lead.contact.email) {
    throw new Error(
      "Legacy leads schema requires email; migrate storage before creating a non-email lead"
    );
  }
}

export class LeadStorageCompatibilityError extends Error {
  constructor(compatibility) {
    super(`Lead storage is not compatible: ${compatibility?.reason || "unknown"}`);
    this.name = "LeadStorageCompatibilityError";
    this.code = "LEAD_STORAGE_INCOMPATIBLE";
    this.compatibility = compatibility || null;
  }
}

function pushBound(columns, placeholders, values, name, value) {
  columns.push(name);
  placeholders.push("?");
  values.push(value ?? null);
}

export async function createLeadCoreRecord(
  env,
  value,
  {
    preflight = inspectLeadStorageCompatibility,
    now = () => new Date()
  } = {}
) {
  const lead = normalizeLeadCoreInput(value);
  const compatibility = await preflight(env, lead.source);

  if (!compatibility?.canInsert) {
    throw new LeadStorageCompatibilityError(compatibility);
  }

  assertDirectCreateInput(lead, compatibility);

  const available = new Set(compatibility.columns || []);
  const columns = [];
  const placeholders = [];
  const values = [];

  pushBound(columns, placeholders, values, "type", lead.source);
  pushBound(columns, placeholders, values, "status", lead.status || "new");
  pushBound(columns, placeholders, values, "name", lead.name);
  pushBound(columns, placeholders, values, "email", lead.contact.email);
  pushBound(columns, placeholders, values, "message", lead.summary);
  pushBound(columns, placeholders, values, "language", lead.language);
  pushBound(columns, placeholders, values, "market", lead.market);

  const attribution = {
    source_url: lead.attribution.sourceUrl,
    referrer: lead.attribution.referrer,
    utm_source: lead.attribution.utmSource,
    utm_medium: lead.attribution.utmMedium,
    utm_campaign: lead.attribution.utmCampaign
  };

  for (const name of OPTIONAL_ATTRIBUTION_COLUMNS) {
    if (available.has(name)) {
      pushBound(columns, placeholders, values, name, attribution[name]);
    }
  }

  pushBound(columns, placeholders, values, "source", lead.source);
  pushBound(columns, placeholders, values, "service_category", lead.serviceCategory);
  pushBound(columns, placeholders, values, "preferred_contact_channel", lead.contact.preferredChannel);
  pushBound(columns, placeholders, values, "contact_phone", lead.contact.phone);
  pushBound(columns, placeholders, values, "contact_whatsapp", lead.contact.whatsapp);
  pushBound(columns, placeholders, values, "contact_other", lead.contact.other);
  pushBound(columns, placeholders, values, "project_date", lead.project.date);
  pushBound(columns, placeholders, values, "project_city", lead.project.city);
  pushBound(columns, placeholders, values, "project_venue", lead.project.venue);
  pushBound(columns, placeholders, values, "details_json", JSON.stringify(lead.details));

  const timestamp = now();
  const updatedAt = timestamp instanceof Date
    ? timestamp.toISOString()
    : new Date(timestamp).toISOString();
  pushBound(columns, placeholders, values, "updated_at", updatedAt);

  const db = databaseFromEnv(env);
  const result = await db.prepare(`
    INSERT INTO leads (
      ${columns.join(",\n      ")}
    ) VALUES (
      ${placeholders.join(", ")}
    )
  `).bind(...values).run();

  const leadId = Number(result?.meta?.last_row_id);
  if (!Number.isInteger(leadId) || leadId < 1) {
    throw new Error("Could not create Lead Core record");
  }

  return {
    ok: true,
    leadId,
    lead,
    compatibility
  };
}
