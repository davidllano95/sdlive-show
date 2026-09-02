const LEAD_LEGACY_REQUIRED_COLUMNS = Object.freeze([
  "id",
  "type",
  "status",
  "name",
  "email",
  "message",
  "language",
  "market"
]);

const LEAD_CANONICAL_REQUIRED_COLUMNS = Object.freeze([
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

const PRIVACY_REQUIRED_COLUMNS = Object.freeze([
  "id",
  "lead_id",
  "source",
  "privacy_consent_at",
  "privacy_policy_version",
  "authorization_method"
]);

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function columnMap(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = String(row?.name || "").trim();
    if (!name) continue;
    map.set(name, {
      name,
      notNull: Number(row?.notnull || 0) === 1,
      primaryKey: Number(row?.pk || 0) > 0
    });
  }
  return map;
}

function missingColumns(columns, required) {
  return required.filter((name) => !columns.has(name));
}

function relevantChecks(tableSql, columnName) {
  const checks = [];
  const pattern = /CHECK\s*\(([^)]*)\)/gi;
  let match;

  while ((match = pattern.exec(String(tableSql || "")))) {
    const expression = String(match[1] || "");
    if (new RegExp(`\\b${columnName}\\b`, "i").test(expression)) {
      checks.push(expression);
    }
  }

  return checks;
}

function checkAllowsLiteral(tableSql, columnName, value) {
  const checks = relevantChecks(tableSql, columnName);
  if (!checks.length) {
    return { constrained: false, allowed: true };
  }

  const literal = `'${String(value).replaceAll("'", "''")}'`.toLowerCase();
  return {
    constrained: true,
    allowed: checks.every((expression) => expression.toLowerCase().includes(literal))
  };
}

export function analyzeAssistantLeadStorage({ columns: columnRows, tableSql } = {}) {
  const sql = String(tableSql || "").trim();
  const columns = columnMap(columnRows);
  const missingLegacy = missingColumns(columns, LEAD_LEGACY_REQUIRED_COLUMNS);
  const missingCanonical = missingColumns(columns, LEAD_CANONICAL_REQUIRED_COLUMNS);

  if (!sql) {
    return {
      ok: true,
      canInsertAssistantLead: false,
      reason: "table_missing",
      missingLegacy,
      missingCanonical,
      legacyEmailRequired: false,
      supportsNonEmailContact: false
    };
  }

  if (missingLegacy.length || missingCanonical.length) {
    return {
      ok: true,
      canInsertAssistantLead: false,
      reason: "required_columns_missing",
      missingLegacy,
      missingCanonical,
      legacyEmailRequired: Boolean(columns.get("email")?.notNull),
      supportsNonEmailContact: !Boolean(columns.get("email")?.notNull)
    };
  }

  const typeCheck = checkAllowsLiteral(sql, "type", "assistant");
  if (!typeCheck.allowed) {
    return {
      ok: true,
      canInsertAssistantLead: false,
      reason: "legacy_type_check_blocks_assistant",
      missingLegacy,
      missingCanonical,
      legacyEmailRequired: Boolean(columns.get("email")?.notNull),
      supportsNonEmailContact: !Boolean(columns.get("email")?.notNull),
      typeConstrained: true
    };
  }

  const statusCheck = checkAllowsLiteral(sql, "status", "new");
  if (!statusCheck.allowed) {
    return {
      ok: true,
      canInsertAssistantLead: false,
      reason: "legacy_status_check_blocks_new",
      missingLegacy,
      missingCanonical,
      legacyEmailRequired: Boolean(columns.get("email")?.notNull),
      supportsNonEmailContact: !Boolean(columns.get("email")?.notNull),
      typeConstrained: typeCheck.constrained,
      statusConstrained: true
    };
  }

  const legacyEmailRequired = Boolean(columns.get("email")?.notNull);
  if (legacyEmailRequired) {
    return {
      ok: true,
      canInsertAssistantLead: false,
      reason: "legacy_email_required",
      missingLegacy,
      missingCanonical,
      legacyEmailRequired: true,
      supportsNonEmailContact: false,
      typeConstrained: typeCheck.constrained,
      statusConstrained: statusCheck.constrained
    };
  }

  return {
    ok: true,
    canInsertAssistantLead: true,
    reason: "compatible",
    missingLegacy,
    missingCanonical,
    legacyEmailRequired: false,
    supportsNonEmailContact: true,
    typeConstrained: typeCheck.constrained,
    statusConstrained: statusCheck.constrained
  };
}

export function analyzeAssistantPrivacyStorage({
  columns: columnRows,
  tableSql,
  canonicalIndexSql
} = {}) {
  const sql = String(tableSql || "").trim();
  const columns = columnMap(columnRows);
  const missing = missingColumns(columns, PRIVACY_REQUIRED_COLUMNS);

  if (!sql) {
    return {
      ok: true,
      canRecordAssistantConsent: false,
      reason: "table_missing",
      missingColumns: missing,
      assistantSourceAllowed: false,
      hasCanonicalUniqueIndex: false
    };
  }

  if (missing.length) {
    return {
      ok: true,
      canRecordAssistantConsent: false,
      reason: "required_columns_missing",
      missingColumns: missing,
      assistantSourceAllowed: false,
      hasCanonicalUniqueIndex: false
    };
  }

  const sourceCheck = checkAllowsLiteral(sql, "source", "assistant");
  const hasCanonicalUniqueIndex = /create\s+unique\s+index/i.test(
    String(canonicalIndexSql || "")
  );

  let reason = "compatible";
  if (!sourceCheck.allowed) reason = "assistant_source_not_allowed";
  else if (!hasCanonicalUniqueIndex) reason = "canonical_unique_index_missing";

  return {
    ok: true,
    canRecordAssistantConsent: reason === "compatible",
    reason,
    missingColumns: missing,
    assistantSourceAllowed: sourceCheck.allowed,
    sourceConstrained: sourceCheck.constrained,
    hasCanonicalUniqueIndex
  };
}

/**
 * Strictly read-only physical-schema inspection for the future Assistant
 * lead-capture path. Only PRAGMA/SELECT metadata reads are issued here.
 */
export async function inspectAssistantStoragePreflight(env) {
  const db = databaseFromEnv(env);

  const [leadInfo, leadSchema, privacyInfo, privacySchema, privacyIndex] = await Promise.all([
    db.prepare("PRAGMA table_info(leads)").all(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'leads'
      LIMIT 1
    `).first(),
    db.prepare("PRAGMA table_info(privacy_consents)").all(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'privacy_consents'
      LIMIT 1
    `).first(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'index'
        AND name = 'idx_privacy_consents_lead_source'
      LIMIT 1
    `).first()
  ]);

  const leads = analyzeAssistantLeadStorage({
    columns: leadInfo?.results,
    tableSql: leadSchema?.sql
  });
  const privacyConsents = analyzeAssistantPrivacyStorage({
    columns: privacyInfo?.results,
    tableSql: privacySchema?.sql,
    canonicalIndexSql: privacyIndex?.sql
  });

  return {
    ok: true,
    readOnly: true,
    readyForAssistantLeadCapture: Boolean(
      leads.canInsertAssistantLead && privacyConsents.canRecordAssistantConsent
    ),
    leads,
    privacyConsents
  };
}
