import { analyzeLeadStorageCompatibility } from "./lead-core-create.js";
import { privacyConsentSchemaSupportsAssistant } from "./privacy-consent-storage.js";

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

function columnNames(rows) {
  return new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.name || "").trim())
      .filter(Boolean)
  );
}

function missingColumns(rows, required) {
  const columns = columnNames(rows);
  return required.filter((name) => !columns.has(name));
}

export function analyzePrivacyConsentStorageCompatibility({
  columns,
  tableSql,
  canonicalIndexSql
} = {}) {
  const sql = String(tableSql || "").trim();
  const missing = missingColumns(columns, PRIVACY_REQUIRED_COLUMNS);
  const tableExists = Boolean(sql);
  const assistantSourceAllowed = tableExists && privacyConsentSchemaSupportsAssistant(sql);
  const hasCanonicalUniqueIndex = /unique\s+index/i.test(String(canonicalIndexSql || ""));

  let reason = "compatible";
  if (!tableExists) reason = "table_missing";
  else if (missing.length) reason = "required_columns_missing";
  else if (!assistantSourceAllowed) reason = "assistant_source_not_allowed";
  else if (!hasCanonicalUniqueIndex) reason = "canonical_unique_index_missing";

  return {
    ok: true,
    canRecordAssistantConsent: reason === "compatible",
    reason,
    tableExists,
    missingColumns: missing,
    assistantSourceAllowed,
    hasCanonicalUniqueIndex
  };
}

/**
 * Strictly read-only inspection of the physical D1 schema required by the
 * Assistant lead-capture path. This function intentionally does not call any
 * ensure/migration helper and performs no CREATE/ALTER/INSERT/UPDATE/DELETE.
 */
export async function inspectAssistantStoragePreflight(env) {
  const db = databaseFromEnv(env);

  const [
    leadInfo,
    leadSchema,
    privacyInfo,
    privacySchema,
    privacyIndex
  ] = await Promise.all([
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

  const leads = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: leadInfo?.results,
    tableSql: leadSchema?.sql
  });

  const privacyConsents = analyzePrivacyConsentStorageCompatibility({
    columns: privacyInfo?.results,
    tableSql: privacySchema?.sql,
    canonicalIndexSql: privacyIndex?.sql
  });

  return {
    ok: true,
    readOnly: true,
    readyForAssistantLeadCapture: Boolean(
      leads?.canInsert && privacyConsents.canRecordAssistantConsent
    ),
    leads,
    privacyConsents
  };
}
