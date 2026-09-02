import { inspectAssistantStoragePreflight } from "./assistant-storage-preflight.js";

const PRIVACY_BACKUP = "assistant_storage_backup_privacy_consents";
const SEQUENCE_BACKUP = "assistant_storage_backup_sequences";
const MIGRATION_GUARD = "assistant_storage_migration_guard";
const PRIVACY_INDEX = "idx_privacy_consents_lead_source";
const IDEMPOTENCY_TABLE = "assistant_effect_reservations";
const IDEMPOTENCY_INDEX = "idx_assistant_effect_reservations_status_updated";

const TEMP_OBJECTS = Object.freeze([
  PRIVACY_BACKUP,
  SEQUENCE_BACKUP,
  MIGRATION_GUARD
]);

const PRIVACY_COLUMNS = Object.freeze([
  "id",
  "lead_id",
  "source",
  "privacy_consent_at",
  "privacy_policy_version",
  "authorization_method"
]);

const PRIVACY_COLUMNS_SQL = PRIVACY_COLUMNS.join(", ");

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function normalizeSql(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/;$/, "")
    .toLowerCase();
}

function exactLegacyPrivacySchema(sql) {
  const normalized = normalizeSql(sql);
  const required = [
    "create table privacy_consents",
    "id integer primary key autoincrement",
    "lead_id integer not null",
    "source text not null",
    "privacy_consent_at text not null default current_timestamp",
    "privacy_policy_version text not null",
    "authorization_method text not null",
    "foreign key (lead_id) references leads(id) on delete cascade"
  ];
  if (!required.every((fragment) => normalized.includes(fragment))) return false;
  const sourceCheck = normalized.match(/check\s*\(([^)]*\bsource\b[^)]*)\)/i);
  if (!sourceCheck) return false;
  const expression = sourceCheck[1];
  return expression.includes("'contact'") &&
    expression.includes("'rental'") &&
    !expression.includes("'assistant'");
}

function canonicalPrivacyIndex(sql) {
  const normalized = normalizeSql(sql);
  return normalized.includes("create unique index") &&
    normalized.includes(PRIVACY_INDEX) &&
    normalized.includes("privacy_consents") &&
    normalized.includes("lead_id") &&
    normalized.includes("source");
}

function exactPrivacyRelatedObjects(objects) {
  const names = (Array.isArray(objects) ? objects : [])
    .map((item) => String(item?.name || ""))
    .filter(Boolean)
    .sort();
  const expected = [PRIVACY_INDEX, "privacy_consents"].sort();
  return names.length === expected.length &&
    names.every((name, index) => name === expected[index]);
}

function findSchemaObject(objects, name) {
  return (Array.isArray(objects) ? objects : []).find(
    (item) => String(item?.name || "") === name
  ) || null;
}

async function temporaryObjectsPresent(db) {
  const placeholders = TEMP_OBJECTS.map(() => "?").join(", ");
  const result = await db
    .prepare(`SELECT name FROM sqlite_master WHERE name IN (${placeholders}) ORDER BY name`)
    .bind(...TEMP_OBJECTS)
    .all();
  return (Array.isArray(result?.results) ? result.results : [])
    .map((row) => String(row?.name || ""))
    .filter(Boolean);
}

async function foreignKeyViolationCount(db) {
  const result = await db.prepare("PRAGMA foreign_key_check").all();
  return Array.isArray(result?.results) ? result.results.length : 0;
}

async function countPrivacyRows(db) {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM privacy_consents").first();
  return Number(row?.count) || 0;
}

async function readPrivacySchema(db) {
  const result = await db.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE tbl_name = 'privacy_consents'
      AND sql IS NOT NULL
    ORDER BY type, name
  `).all();
  return Array.isArray(result?.results) ? result.results : [];
}

export function planAssistantStoragePreparation(preflight = {}) {
  if (preflight?.readyForAssistantLeadCapture === true) {
    return { ready: true, canApply: true, actions: [], blockers: [] };
  }

  const blockers = [];
  const actions = [];
  const leads = preflight?.leads || {};
  const privacy = preflight?.privacyConsents || {};
  const idempotency = preflight?.idempotency || {};

  if (leads.canInsertAssistantLead !== true || leads.reason !== "compatible") {
    blockers.push({ area: "leads", reason: leads.reason || "leads_not_compatible" });
  }

  if (privacy.canRecordAssistantConsent !== true) {
    if (privacy.reason === "assistant_source_not_allowed") {
      actions.push("privacy_consents");
    } else {
      blockers.push({
        area: "privacy_consents",
        reason: privacy.reason || "unexpected_privacy_state"
      });
    }
  }

  if (idempotency.ready !== true) {
    if (idempotency.reason === "table_missing") {
      actions.push("assistant_idempotency");
    } else {
      blockers.push({
        area: "assistant_effect_reservations",
        reason: idempotency.reason || "unexpected_idempotency_state"
      });
    }
  }

  return {
    ready: false,
    canApply: blockers.length === 0 &&
      actions.length === 2 &&
      actions.includes("privacy_consents") &&
      actions.includes("assistant_idempotency"),
    actions,
    blockers
  };
}

export async function inspectAssistantStoragePreparationReadiness(
  env,
  { inspect = inspectAssistantStoragePreflight } = {}
) {
  const db = databaseFromEnv(env);
  const [preflight, privacyObjects, tempObjects, fkViolations, privacyCount] = await Promise.all([
    inspect(env),
    readPrivacySchema(db),
    temporaryObjectsPresent(db),
    foreignKeyViolationCount(db),
    countPrivacyRows(db)
  ]);

  const plan = planAssistantStoragePreparation(preflight);
  const blockers = [...plan.blockers];

  if (!plan.ready) {
    const privacyTable = findSchemaObject(privacyObjects, "privacy_consents");
    const privacyIndex = findSchemaObject(privacyObjects, PRIVACY_INDEX);
    if (!exactPrivacyRelatedObjects(privacyObjects)) {
      blockers.push({ area: "privacy_consents", reason: "unexpected_related_schema" });
    }
    if (!exactLegacyPrivacySchema(privacyTable?.sql)) {
      blockers.push({ area: "privacy_consents", reason: "unexpected_physical_schema" });
    }
    if (!canonicalPrivacyIndex(privacyIndex?.sql)) {
      blockers.push({ area: "privacy_consents", reason: "unexpected_canonical_index" });
    }
  }
  if (tempObjects.length) {
    blockers.push({ area: "storage", reason: "migration_temp_objects_present" });
  }
  if (fkViolations > 0) {
    blockers.push({ area: "storage", reason: "foreign_key_violations_present" });
  }

  return {
    ok: true,
    readOnly: true,
    ready: plan.ready,
    canApply: plan.ready || (plan.canApply && blockers.length === 0),
    actions: plan.actions,
    blockers,
    counts: { privacyConsents: privacyCount },
    foreignKeyViolations: fkViolations,
    temporaryObjects: tempObjects,
    preflight
  };
}

function privacyBackupTableSql() {
  return `CREATE TABLE ${PRIVACY_BACKUP} (
    id INTEGER,
    lead_id INTEGER,
    source TEXT,
    privacy_consent_at TEXT,
    privacy_policy_version TEXT,
    authorization_method TEXT
  )`;
}

function targetPrivacyTableSql() {
  return `CREATE TABLE privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('contact', 'rental', 'assistant')),
    privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )`;
}

function idempotencyTableSql() {
  return `CREATE TABLE ${IDEMPOTENCY_TABLE} (
    idempotency_key TEXT PRIMARY KEY,
    effect TEXT NOT NULL CHECK (effect IN ('lead_create')),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'failed')),
    request_id TEXT NOT NULL,
    lead_id INTEGER,
    attempts INTEGER NOT NULL DEFAULT 1,
    reserved_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    error_code TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
  )`;
}

function equalityGuardSql() {
  return `INSERT INTO ${MIGRATION_GUARD} (ok)
    SELECT CASE WHEN
      (SELECT COUNT(*) FROM ${PRIVACY_BACKUP}) = (SELECT COUNT(*) FROM privacy_consents)
      AND NOT EXISTS (
        SELECT ${PRIVACY_COLUMNS_SQL} FROM ${PRIVACY_BACKUP}
        EXCEPT
        SELECT ${PRIVACY_COLUMNS_SQL} FROM privacy_consents
      )
      AND NOT EXISTS (
        SELECT ${PRIVACY_COLUMNS_SQL} FROM privacy_consents
        EXCEPT
        SELECT ${PRIVACY_COLUMNS_SQL} FROM ${PRIVACY_BACKUP}
      )
    THEN 1 ELSE 0 END`;
}

export function assistantStoragePreparationSql() {
  return [
    privacyBackupTableSql(),
    `INSERT INTO ${PRIVACY_BACKUP} (${PRIVACY_COLUMNS_SQL})
      SELECT ${PRIVACY_COLUMNS_SQL} FROM privacy_consents`,
    `CREATE TABLE ${SEQUENCE_BACKUP} (name TEXT PRIMARY KEY, seq INTEGER)`,
    `INSERT INTO ${SEQUENCE_BACKUP} (name, seq)
      SELECT name, seq FROM sqlite_sequence
      WHERE name = 'privacy_consents'`,
    "DROP TABLE privacy_consents",
    targetPrivacyTableSql(),
    `INSERT INTO privacy_consents (${PRIVACY_COLUMNS_SQL})
      SELECT ${PRIVACY_COLUMNS_SQL} FROM ${PRIVACY_BACKUP}`,
    `CREATE UNIQUE INDEX ${PRIVACY_INDEX}
      ON privacy_consents (lead_id, source)`,
    `UPDATE sqlite_sequence
      SET seq = MAX(seq, COALESCE((SELECT seq FROM ${SEQUENCE_BACKUP} WHERE name = 'privacy_consents'), seq))
      WHERE name = 'privacy_consents'`,
    `INSERT INTO sqlite_sequence (name, seq)
      SELECT 'privacy_consents', seq FROM ${SEQUENCE_BACKUP}
      WHERE name = 'privacy_consents'
        AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'privacy_consents')`,
    idempotencyTableSql(),
    `CREATE INDEX ${IDEMPOTENCY_INDEX}
      ON ${IDEMPOTENCY_TABLE}(status, updated_at)`,
    `CREATE TABLE ${MIGRATION_GUARD} (ok INTEGER NOT NULL CHECK (ok = 1))`,
    equalityGuardSql(),
    `DROP TABLE ${MIGRATION_GUARD}`,
    `DROP TABLE ${PRIVACY_BACKUP}`,
    `DROP TABLE ${SEQUENCE_BACKUP}`
  ].map((statement) => statement.trim());
}

function compactReadiness(report) {
  if (!report || typeof report !== "object") return null;
  return {
    ok: report.ok === true,
    readOnly: report.readOnly === true,
    ready: report.ready === true,
    canApply: report.canApply === true,
    actions: Array.isArray(report.actions) ? report.actions : [],
    blockers: Array.isArray(report.blockers) ? report.blockers : [],
    counts: report.counts || null,
    foreignKeyViolations: Number(report.foreignKeyViolations || 0),
    temporaryObjects: Array.isArray(report.temporaryObjects) ? report.temporaryObjects : []
  };
}

export async function prepareAssistantStorage(
  env,
  {
    inspectReadiness = inspectAssistantStoragePreparationReadiness,
    inspectStorage = inspectAssistantStoragePreflight
  } = {}
) {
  const db = databaseFromEnv(env);
  if (typeof db.batch !== "function") {
    throw new Error("CMS_DB batch support is required");
  }

  const before = await inspectReadiness(env);
  if (before.ready) {
    return {
      ok: true,
      applied: false,
      alreadyReady: true,
      ready: true,
      actions: [],
      before: compactReadiness(before),
      after: compactReadiness(before),
      preflight: before.preflight
    };
  }
  if (!before.canApply) {
    return {
      ok: false,
      applied: false,
      alreadyReady: false,
      ready: false,
      actions: before.actions || [],
      blockers: before.blockers || [],
      before: compactReadiness(before)
    };
  }

  const statements = assistantStoragePreparationSql().map((sql) => db.prepare(sql));
  await db.batch(statements);

  const after = await inspectReadiness(env);
  const storage = await inspectStorage(env);
  const ready = after.ready === true &&
    after.foreignKeyViolations === 0 &&
    Array.isArray(after.temporaryObjects) &&
    after.temporaryObjects.length === 0 &&
    storage?.readyForAssistantLeadCapture === true;

  return {
    ok: ready,
    applied: true,
    alreadyReady: false,
    ready,
    actions: before.actions || [],
    before: compactReadiness(before),
    after: compactReadiness(after),
    preflight: storage
  };
}

export function assistantStoragePreparationPolicy() {
  return Object.freeze({
    publicRuntimeMayCall: false,
    adminOnly: true,
    requiresExplicitConfirmation: true,
    canModifyLeads: false,
    canPreparePrivacyConsents: true,
    canPrepareAssistantIdempotency: true,
    refusesUnknownExistingSchemas: true
  });
}
