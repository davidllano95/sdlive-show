import { inspectAssistantStoragePreflight } from "./assistant-storage-preflight.js";
import { inspectAssistantLeadsMigrationPrecheck } from "./assistant-leads-migration-precheck.js";

const BACKUP_LEADS = "assistant_leads_migration_backup_leads";
const BACKUP_PRIVACY = "assistant_leads_migration_backup_privacy_consents";
const BACKUP_RENTAL = "assistant_leads_migration_backup_rental_requests";
const BACKUP_SEQUENCES = "assistant_leads_migration_backup_sequences";
const MIGRATION_GUARD = "assistant_leads_migration_guard";

const TEMP_OBJECTS = Object.freeze([
  BACKUP_LEADS,
  BACKUP_PRIVACY,
  BACKUP_RENTAL,
  BACKUP_SEQUENCES,
  MIGRATION_GUARD
]);

const EXPECTED_LEAD_COLUMNS = Object.freeze([
  "id",
  "type",
  "status",
  "name",
  "email",
  "phone",
  "company",
  "message",
  "language",
  "market",
  "source_url",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "created_at",
  "updated_at",
  "source",
  "service_category",
  "preferred_contact_channel",
  "contact_phone",
  "contact_whatsapp",
  "contact_other",
  "project_date",
  "project_city",
  "project_venue",
  "details_json"
]);

const EXPECTED_RELATED_OBJECTS = Object.freeze([
  "idx_leads_created_at",
  "idx_leads_email",
  "idx_leads_status",
  "idx_leads_type",
  "idx_privacy_consents_lead_source",
  "idx_rental_event_date",
  "idx_rental_lead_id",
  "leads",
  "privacy_consents",
  "rental_requests"
]);

const LEAD_COLUMNS_SQL = EXPECTED_LEAD_COLUMNS.join(", ");
const PRIVACY_COLUMNS_SQL = [
  "id",
  "lead_id",
  "source",
  "privacy_consent_at",
  "privacy_policy_version",
  "authorization_method"
].join(", ");
const RENTAL_COLUMNS_SQL = [
  "id",
  "lead_id",
  "event_type",
  "venue",
  "event_date",
  "rental_days",
  "attendees",
  "items_json",
  "services_json",
  "notes",
  "estimated_total_cop",
  "custom_quote",
  "created_at"
].join(", ");

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

function hasLiteralSet(sql, column, values) {
  const normalized = normalizeSql(sql);
  const checkPattern = new RegExp(`check\\s*\\([^)]*\\b${column}\\b[^)]*\\)`, "i");
  const match = normalized.match(checkPattern);
  if (!match) return false;
  return values.every((value) => match[0].includes(`'${value}'`));
}

function exactColumnShape(columns) {
  if (!Array.isArray(columns) || columns.length !== EXPECTED_LEAD_COLUMNS.length) return false;
  return columns.every((column, index) => String(column?.name || "") === EXPECTED_LEAD_COLUMNS[index]);
}

function exactRelatedObjectShape(items) {
  const names = (Array.isArray(items) ? items : [])
    .map((item) => String(item?.name || ""))
    .filter(Boolean)
    .sort();
  const expected = [...EXPECTED_RELATED_OBJECTS].sort();
  return names.length === expected.length && names.every((name, index) => name === expected[index]);
}

function hasUnexpectedTrigger(items) {
  return (Array.isArray(items) ? items : []).some(
    (item) => String(item?.type || "").toLowerCase() === "trigger"
  );
}

function findSchemaObject(items, name) {
  return (Array.isArray(items) ? items : []).find(
    (item) => String(item?.name || "") === name
  ) || null;
}

function validateKnownLegacySchema(precheck) {
  const blockers = [];
  const columns = Array.isArray(precheck?.columns) ? precheck.columns : [];
  const tableSql = String(precheck?.tableSql || "");
  const related = Array.isArray(precheck?.relatedSchema) ? precheck.relatedSchema : [];

  if (!exactColumnShape(columns)) blockers.push("unexpected_leads_columns");

  const email = columns.find((column) => column?.name === "email");
  if (email?.notNull !== true) blockers.push("legacy_email_not_required");

  if (!hasLiteralSet(tableSql, "type", ["contact", "rental", "project"])) {
    blockers.push("unexpected_legacy_type_check");
  }
  if (normalizeSql(tableSql).includes("'assistant'")) {
    blockers.push("assistant_already_allowed");
  }
  if (!hasLiteralSet(tableSql, "status", ["new", "contacted", "quoted", "confirmed", "lost"])) {
    blockers.push("unexpected_status_check");
  }

  if (hasUnexpectedTrigger(related)) blockers.push("unexpected_trigger_dependency");
  if (!exactRelatedObjectShape(related)) blockers.push("unexpected_related_schema");

  const privacy = findSchemaObject(related, "privacy_consents");
  const privacySql = normalizeSql(privacy?.sql);
  if (
    !privacySql.includes("source text not null") ||
    !hasLiteralSet(privacySql, "source", ["contact", "rental"]) ||
    privacySql.includes("'assistant'") ||
    !privacySql.includes("references leads(id) on delete cascade")
  ) {
    blockers.push("unexpected_privacy_consents_schema");
  }

  const rental = findSchemaObject(related, "rental_requests");
  const rentalSql = normalizeSql(rental?.sql);
  const rentalRequiredFragments = [
    "lead_id integer not null",
    "rental_days integer not null default 1",
    "check (rental_days > 0)",
    "items_json text not null",
    "custom_quote integer not null default 0",
    "check (custom_quote in (0, 1))",
    "references leads(id)",
    "on delete cascade"
  ];
  if (!rentalRequiredFragments.every((fragment) => rentalSql.includes(fragment))) {
    blockers.push("unexpected_rental_requests_schema");
  }

  return [...new Set(blockers)];
}

async function safeCount(db, table) {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
  return Number(row?.count) || 0;
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

export async function inspectExactAssistantLeadsMigration(
  env,
  {
    inspectPrecheck = inspectAssistantLeadsMigrationPrecheck,
    inspectStorage = inspectAssistantStoragePreflight
  } = {}
) {
  const db = databaseFromEnv(env);
  const [precheck, storage, tempObjects, fkViolations, leadsCount, privacyCount, rentalCount] = await Promise.all([
    inspectPrecheck(env),
    inspectStorage(env),
    temporaryObjectsPresent(db),
    foreignKeyViolationCount(db),
    safeCount(db, "leads"),
    safeCount(db, "privacy_consents"),
    safeCount(db, "rental_requests")
  ]);

  const alreadyApplied = storage?.leads?.canInsertAssistantLead === true;
  const blockers = alreadyApplied ? [] : validateKnownLegacySchema(precheck);

  if (!alreadyApplied && storage?.leads?.reason !== "legacy_type_check_blocks_assistant") {
    blockers.push("production_preflight_changed");
  }
  if (!alreadyApplied && storage?.leads?.legacyEmailRequired !== true) {
    blockers.push("legacy_email_preflight_changed");
  }
  if (tempObjects.length) blockers.push("migration_temp_objects_present");
  if (fkViolations > 0) blockers.push("foreign_key_violations_present");

  return {
    ok: true,
    readOnly: true,
    alreadyApplied,
    canApply: alreadyApplied || blockers.length === 0,
    blockers: [...new Set(blockers)],
    counts: {
      leads: leadsCount,
      privacyConsents: privacyCount,
      rentalRequests: rentalCount
    },
    foreignKeyViolations: fkViolations,
    temporaryObjects: tempObjects,
    plannedChange: {
      preserveLeadTypes: ["contact", "rental", "project"],
      addLeadType: "assistant",
      makeEmailNullable: true,
      preserveStatuses: ["new", "contacted", "quoted", "confirmed", "lost"],
      preservePrivacyConsentConstraint: ["contact", "rental"],
      preserveChildren: ["privacy_consents", "rental_requests"],
      preserveIndexes: [
        "idx_leads_created_at",
        "idx_leads_email",
        "idx_leads_status",
        "idx_leads_type",
        "idx_privacy_consents_lead_source",
        "idx_rental_event_date",
        "idx_rental_lead_id"
      ]
    }
  };
}

function leadsBackupTableSql() {
  return `CREATE TABLE ${BACKUP_LEADS} (
    id INTEGER,
    type TEXT,
    status TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    message TEXT,
    language TEXT,
    market TEXT,
    source_url TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TEXT,
    updated_at TEXT,
    source TEXT,
    service_category TEXT,
    preferred_contact_channel TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    contact_other TEXT,
    project_date TEXT,
    project_city TEXT,
    project_venue TEXT,
    details_json TEXT
  )`;
}

function privacyBackupTableSql() {
  return `CREATE TABLE ${BACKUP_PRIVACY} (
    id INTEGER,
    lead_id INTEGER,
    source TEXT,
    privacy_consent_at TEXT,
    privacy_policy_version TEXT,
    authorization_method TEXT
  )`;
}

function rentalBackupTableSql() {
  return `CREATE TABLE ${BACKUP_RENTAL} (
    id INTEGER,
    lead_id INTEGER,
    event_type TEXT,
    venue TEXT,
    event_date TEXT,
    rental_days INTEGER,
    attendees INTEGER,
    items_json TEXT,
    services_json TEXT,
    notes TEXT,
    estimated_total_cop INTEGER,
    custom_quote INTEGER,
    created_at TEXT
  )`;
}

function targetLeadsTableSql() {
  return `CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('contact', 'rental', 'project', 'assistant')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'lost')),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    message TEXT,
    language TEXT,
    market TEXT,
    source_url TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    service_category TEXT,
    preferred_contact_channel TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    contact_other TEXT,
    project_date TEXT,
    project_city TEXT,
    project_venue TEXT,
    details_json TEXT
  )`;
}

function legacyPrivacyTableSql() {
  return `CREATE TABLE privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('contact', 'rental')),
    privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )`;
}

function rentalTableSql() {
  return `CREATE TABLE rental_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    event_type TEXT,
    venue TEXT,
    event_date TEXT,
    rental_days INTEGER NOT NULL DEFAULT 1 CHECK (rental_days > 0),
    attendees INTEGER,
    items_json TEXT NOT NULL,
    services_json TEXT,
    notes TEXT,
    estimated_total_cop INTEGER,
    custom_quote INTEGER NOT NULL DEFAULT 0 CHECK (custom_quote IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )`;
}

function equalityGuardSql(backupTable, liveTable, columns) {
  return `INSERT INTO ${MIGRATION_GUARD} (ok)
    SELECT CASE WHEN
      (SELECT COUNT(*) FROM ${backupTable}) = (SELECT COUNT(*) FROM ${liveTable})
      AND NOT EXISTS (SELECT ${columns} FROM ${backupTable} EXCEPT SELECT ${columns} FROM ${liveTable})
      AND NOT EXISTS (SELECT ${columns} FROM ${liveTable} EXCEPT SELECT ${columns} FROM ${backupTable})
    THEN 1 ELSE 0 END`;
}

export function assistantLeadsMigrationSql() {
  const sql = [
    leadsBackupTableSql(),
    `INSERT INTO ${BACKUP_LEADS} (${LEAD_COLUMNS_SQL}) SELECT ${LEAD_COLUMNS_SQL} FROM leads`,
    privacyBackupTableSql(),
    `INSERT INTO ${BACKUP_PRIVACY} (${PRIVACY_COLUMNS_SQL}) SELECT ${PRIVACY_COLUMNS_SQL} FROM privacy_consents`,
    rentalBackupTableSql(),
    `INSERT INTO ${BACKUP_RENTAL} (${RENTAL_COLUMNS_SQL}) SELECT ${RENTAL_COLUMNS_SQL} FROM rental_requests`,
    `CREATE TABLE ${BACKUP_SEQUENCES} (name TEXT PRIMARY KEY, seq INTEGER)`,
    `INSERT INTO ${BACKUP_SEQUENCES} (name, seq)
      SELECT name, seq FROM sqlite_sequence
      WHERE name IN ('leads', 'privacy_consents', 'rental_requests')`,
    "DROP TABLE privacy_consents",
    "DROP TABLE rental_requests",
    "DROP TABLE leads",
    targetLeadsTableSql(),
    `INSERT INTO leads (${LEAD_COLUMNS_SQL}) SELECT ${LEAD_COLUMNS_SQL} FROM ${BACKUP_LEADS}`,
    legacyPrivacyTableSql(),
    `INSERT INTO privacy_consents (${PRIVACY_COLUMNS_SQL}) SELECT ${PRIVACY_COLUMNS_SQL} FROM ${BACKUP_PRIVACY}`,
    rentalTableSql(),
    `INSERT INTO rental_requests (${RENTAL_COLUMNS_SQL}) SELECT ${RENTAL_COLUMNS_SQL} FROM ${BACKUP_RENTAL}`,
    "CREATE INDEX idx_leads_created_at ON leads(created_at)",
    "CREATE INDEX idx_leads_email ON leads(email)",
    "CREATE INDEX idx_leads_status ON leads(status)",
    "CREATE INDEX idx_leads_type ON leads(type)",
    "CREATE UNIQUE INDEX idx_privacy_consents_lead_source ON privacy_consents (lead_id, source)",
    "CREATE INDEX idx_rental_event_date ON rental_requests(event_date)",
    "CREATE INDEX idx_rental_lead_id ON rental_requests(lead_id)",
    `UPDATE sqlite_sequence
      SET seq = MAX(seq, COALESCE((SELECT seq FROM ${BACKUP_SEQUENCES} WHERE name = 'leads'), seq))
      WHERE name = 'leads'`,
    `INSERT INTO sqlite_sequence (name, seq)
      SELECT 'leads', seq FROM ${BACKUP_SEQUENCES}
      WHERE name = 'leads' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'leads')`,
    `UPDATE sqlite_sequence
      SET seq = MAX(seq, COALESCE((SELECT seq FROM ${BACKUP_SEQUENCES} WHERE name = 'privacy_consents'), seq))
      WHERE name = 'privacy_consents'`,
    `INSERT INTO sqlite_sequence (name, seq)
      SELECT 'privacy_consents', seq FROM ${BACKUP_SEQUENCES}
      WHERE name = 'privacy_consents' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'privacy_consents')`,
    `UPDATE sqlite_sequence
      SET seq = MAX(seq, COALESCE((SELECT seq FROM ${BACKUP_SEQUENCES} WHERE name = 'rental_requests'), seq))
      WHERE name = 'rental_requests'`,
    `INSERT INTO sqlite_sequence (name, seq)
      SELECT 'rental_requests', seq FROM ${BACKUP_SEQUENCES}
      WHERE name = 'rental_requests' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'rental_requests')`,
    `CREATE TABLE ${MIGRATION_GUARD} (ok INTEGER NOT NULL CHECK (ok = 1))`,
    equalityGuardSql(BACKUP_LEADS, "leads", LEAD_COLUMNS_SQL),
    equalityGuardSql(BACKUP_PRIVACY, "privacy_consents", PRIVACY_COLUMNS_SQL),
    equalityGuardSql(BACKUP_RENTAL, "rental_requests", RENTAL_COLUMNS_SQL),
    `DROP TABLE ${MIGRATION_GUARD}`,
    `DROP TABLE ${BACKUP_LEADS}`,
    `DROP TABLE ${BACKUP_PRIVACY}`,
    `DROP TABLE ${BACKUP_RENTAL}`,
    `DROP TABLE ${BACKUP_SEQUENCES}`
  ];

  return sql.map((statement) => statement.trim());
}

export async function migrateAssistantLeadsExact(
  env,
  {
    inspect = inspectExactAssistantLeadsMigration,
    inspectStorage = inspectAssistantStoragePreflight
  } = {}
) {
  const db = databaseFromEnv(env);
  if (typeof db.batch !== "function") {
    throw new Error("CMS_DB batch support is required");
  }

  const before = await inspect(env);
  if (before.alreadyApplied) {
    return {
      ok: true,
      applied: false,
      alreadyApplied: true,
      before,
      after: await inspectStorage(env)
    };
  }
  if (!before.canApply) {
    return {
      ok: false,
      applied: false,
      alreadyApplied: false,
      blockers: before.blockers,
      before
    };
  }

  const statements = assistantLeadsMigrationSql().map((sql) => db.prepare(sql));
  await db.batch(statements);

  const after = await inspectStorage(env);
  const leadsReady = after?.leads?.canInsertAssistantLead === true;

  return {
    ok: leadsReady,
    applied: true,
    alreadyApplied: false,
    leadsReady,
    before,
    after
  };
}
