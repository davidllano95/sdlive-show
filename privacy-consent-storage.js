export const PRIVACY_CONSENT_SOURCES = Object.freeze([
  "contact",
  "rental",
  "assistant"
]);

export const PRIVACY_POLICY_VERSION = "2026-08-19";
export const WEBSITE_PRIVACY_AUTHORIZATION_METHOD = "website_confirmation_modal";

const schemaPromises = new WeakMap();
const MIGRATION_TABLE = "privacy_consents__assistant_migration";

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function normalizeSource(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!PRIVACY_CONSENT_SOURCES.includes(source)) {
    throw new Error("Privacy consent source is invalid");
  }
  return source;
}

function createTableSql(tableName = "privacy_consents") {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('contact', 'rental', 'assistant')),
      privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      privacy_policy_version TEXT NOT NULL,
      authorization_method TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `;
}

function createIndexSql() {
  return `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_consents_lead_source
    ON privacy_consents (lead_id, source)
  `;
}

export function privacyConsentSchemaSupportsAssistant(tableSql) {
  const sql = String(tableSql || "").toLowerCase();
  if (!sql) return false;

  const sourceCheck = sql.match(/check\s*\(([^)]*\bsource\b[^)]*)\)/i);
  if (!sourceCheck) return true;
  return sourceCheck[1].includes("'assistant'") || sourceCheck[1].includes('"assistant"');
}

async function readPrivacyConsentTableSql(db) {
  const row = await db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'privacy_consents'
    LIMIT 1
  `).first();

  return String(row?.sql || "");
}

async function rebuildLegacyPrivacyConsentTable(db) {
  if (typeof db.batch !== "function") {
    throw new Error("CMS_DB batch support is required for privacy consent migration");
  }

  await db.batch([
    db.prepare(`DROP TABLE IF EXISTS ${MIGRATION_TABLE}`),
    db.prepare(createTableSql(MIGRATION_TABLE)),
    db.prepare(`
      INSERT INTO ${MIGRATION_TABLE} (
        id,
        lead_id,
        source,
        privacy_consent_at,
        privacy_policy_version,
        authorization_method
      )
      SELECT
        id,
        lead_id,
        source,
        privacy_consent_at,
        privacy_policy_version,
        authorization_method
      FROM privacy_consents
    `),
    db.prepare("DROP TABLE privacy_consents"),
    db.prepare(`ALTER TABLE ${MIGRATION_TABLE} RENAME TO privacy_consents`),
    db.prepare(createIndexSql())
  ]);
}

/**
 * Ensure the single canonical privacy-consent table accepts Assistant records.
 *
 * Existing Contact/Rental rows are preserved byte-for-byte at the SQL-column
 * level during the legacy CHECK-constraint rebuild. SQLite cannot alter a
 * CHECK constraint in place, so the migration deliberately rebuilds the same
 * table name rather than introducing a second consent source of truth.
 */
export async function ensurePrivacyConsentStorageSchema(env) {
  const db = databaseFromEnv(env);
  if (schemaPromises.has(db)) return schemaPromises.get(db);

  const promise = (async () => {
    await db.prepare(createTableSql()).run();

    let tableSql = await readPrivacyConsentTableSql(db);
    if (!tableSql) {
      throw new Error("privacy_consents schema could not be inspected");
    }

    let migrated = false;
    if (!privacyConsentSchemaSupportsAssistant(tableSql)) {
      await rebuildLegacyPrivacyConsentTable(db);
      migrated = true;
      tableSql = await readPrivacyConsentTableSql(db);

      if (!privacyConsentSchemaSupportsAssistant(tableSql)) {
        throw new Error("privacy_consents migration did not enable Assistant source");
      }
    }

    await db.prepare(createIndexSql()).run();

    return {
      ok: true,
      migrated,
      sources: [...PRIVACY_CONSENT_SOURCES]
    };
  })().catch((error) => {
    schemaPromises.delete(db);
    throw error;
  });

  schemaPromises.set(db, promise);
  return promise;
}

/**
 * Persist one explicit consent against an already-created lead.
 *
 * This helper does not decide whether a UI interaction constitutes consent.
 * The future Assistant route must make that decision before calling it.
 */
export async function recordPrivacyConsent(
  env,
  {
    leadId,
    source,
    policyVersion = PRIVACY_POLICY_VERSION,
    authorizationMethod = WEBSITE_PRIVACY_AUTHORIZATION_METHOD
  }
) {
  const id = Number(leadId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Privacy consent requires a valid lead id");
  }

  const normalizedSource = normalizeSource(source);
  const version = String(policyVersion || "").trim();
  const method = String(authorizationMethod || "").trim();
  if (!version || !method) {
    throw new Error("Privacy consent policy version and authorization method are required");
  }

  await ensurePrivacyConsentStorageSchema(env);
  const db = databaseFromEnv(env);

  await db.prepare(`
    INSERT INTO privacy_consents (
      lead_id,
      source,
      privacy_policy_version,
      authorization_method
    ) VALUES (?, ?, ?, ?)
  `).bind(id, normalizedSource, version, method).run();

  return {
    ok: true,
    leadId: id,
    source: normalizedSource,
    privacyPolicyVersion: version,
    authorizationMethod: method
  };
}
