import { ensureLeadCoreStorageSchema } from "./lead-core-storage.js";
import { inspectAssistantStoragePreflight } from "./assistant-storage-preflight.js";

const PRIVACY_MIGRATION_TABLE = "privacy_consents__assistant_migration";
const PRIVACY_INDEX = "idx_privacy_consents_lead_source";
const IDEMPOTENCY_TABLE = "assistant_effect_reservations";
const IDEMPOTENCY_INDEX = "idx_assistant_effect_reservations_status_updated";

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function privacyTableSql(tableName = "privacy_consents") {
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

function privacyIndexSql() {
  return `
    CREATE UNIQUE INDEX IF NOT EXISTS ${PRIVACY_INDEX}
    ON privacy_consents (lead_id, source)
  `;
}

function idempotencyTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS ${IDEMPOTENCY_TABLE} (
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
    )
  `;
}

function idempotencyIndexSql() {
  return `
    CREATE INDEX IF NOT EXISTS ${IDEMPOTENCY_INDEX}
    ON ${IDEMPOTENCY_TABLE}(status, updated_at)
  `;
}

function blocker(area, reason) {
  return { area, reason };
}

export function planAssistantStoragePreparation(preflight = {}) {
  if (preflight?.readyForAssistantLeadCapture === true) {
    return {
      ready: true,
      canApply: true,
      actions: [],
      blockers: []
    };
  }

  const actions = [];
  const blockers = [];
  const leads = preflight?.leads || {};
  const privacy = preflight?.privacyConsents || {};
  const idempotency = preflight?.idempotency || {};

  if (leads.canInsertAssistantLead !== true) {
    if (
      leads.reason === "required_columns_missing" &&
      Array.isArray(leads.missingLegacy) &&
      leads.missingLegacy.length === 0 &&
      Array.isArray(leads.missingCanonical) &&
      leads.missingCanonical.length > 0
    ) {
      actions.push("lead_core_columns");
    } else {
      blockers.push(blocker("leads", leads.reason || "unknown_leads_incompatibility"));
    }
  }

  if (privacy.canRecordAssistantConsent !== true) {
    if ([
      "table_missing",
      "assistant_source_not_allowed",
      "canonical_unique_index_missing"
    ].includes(privacy.reason)) {
      actions.push("privacy_consents");
    } else {
      blockers.push(blocker("privacy_consents", privacy.reason || "unknown_privacy_incompatibility"));
    }
  }

  if (idempotency.ready !== true) {
    if (["table_missing", "status_index_missing"].includes(idempotency.reason)) {
      actions.push("assistant_idempotency");
    } else {
      blockers.push(blocker("assistant_effect_reservations", idempotency.reason || "unknown_idempotency_incompatibility"));
    }
  }

  return {
    ready: false,
    canApply: blockers.length === 0,
    actions: [...new Set(actions)],
    blockers
  };
}

async function readPrivacyTableSql(db) {
  const row = await db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'privacy_consents'
    LIMIT 1
  `).first();
  return String(row?.sql || "").toLowerCase();
}

function privacyAllowsAssistant(sql) {
  if (!sql) return true;
  const sourceCheck = sql.match(/check\s*\(([^)]*\bsource\b[^)]*)\)/i);
  if (!sourceCheck) return true;
  return sourceCheck[1].includes("'assistant'") || sourceCheck[1].includes('"assistant"');
}

async function preparePrivacyConsents(db) {
  await db.prepare(privacyTableSql()).run();
  const currentSql = await readPrivacyTableSql(db);

  if (!privacyAllowsAssistant(currentSql)) {
    if (typeof db.batch !== "function") {
      throw new Error("CMS_DB batch support is required for privacy migration");
    }
    await db.batch([
      db.prepare(`DROP TABLE IF EXISTS ${PRIVACY_MIGRATION_TABLE}`),
      db.prepare(privacyTableSql(PRIVACY_MIGRATION_TABLE)),
      db.prepare(`
        INSERT INTO ${PRIVACY_MIGRATION_TABLE} (
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
      db.prepare(`ALTER TABLE ${PRIVACY_MIGRATION_TABLE} RENAME TO privacy_consents`),
      db.prepare(privacyIndexSql())
    ]);
  } else {
    await db.prepare(privacyIndexSql()).run();
  }
}

async function prepareIdempotencyStorage(db) {
  if (typeof db.batch === "function") {
    await db.batch([
      db.prepare(idempotencyTableSql()),
      db.prepare(idempotencyIndexSql())
    ]);
    return;
  }
  await db.prepare(idempotencyTableSql()).run();
  await db.prepare(idempotencyIndexSql()).run();
}

export async function prepareAssistantStorage(
  env,
  {
    inspect = inspectAssistantStoragePreflight,
    ensureLeadCore = ensureLeadCoreStorageSchema
  } = {}
) {
  const db = databaseFromEnv(env);
  const before = await inspect(env);
  const plan = planAssistantStoragePreparation(before);

  if (!plan.canApply) {
    return {
      ok: false,
      applied: false,
      ready: false,
      manualMigrationRequired: true,
      actions: [],
      blockers: plan.blockers,
      before
    };
  }

  if (plan.ready) {
    return {
      ok: true,
      applied: false,
      ready: true,
      manualMigrationRequired: false,
      actions: [],
      blockers: [],
      before,
      after: before
    };
  }

  for (const action of plan.actions) {
    if (action === "lead_core_columns") {
      await ensureLeadCore(env);
    } else if (action === "privacy_consents") {
      await preparePrivacyConsents(db);
    } else if (action === "assistant_idempotency") {
      await prepareIdempotencyStorage(db);
    }
  }

  const after = await inspect(env);
  if (after.readyForAssistantLeadCapture !== true) {
    return {
      ok: false,
      applied: true,
      ready: false,
      manualMigrationRequired: true,
      actions: plan.actions,
      blockers: [blocker("postflight", "storage_not_ready_after_preparation")],
      before,
      after
    };
  }

  return {
    ok: true,
    applied: true,
    ready: true,
    manualMigrationRequired: false,
    actions: plan.actions,
    blockers: [],
    before,
    after
  };
}

export function assistantStoragePreparationPolicy() {
  return Object.freeze({
    publicRuntimeMayCall: false,
    adminOnly: true,
    requiresExplicitConfirmation: true,
    autoRebuildLeads: false,
    canPrepareCanonicalLeadColumns: true,
    canPreparePrivacyConsents: true,
    canPrepareAssistantIdempotency: true,
    refusesUnknownExistingSchemas: true
  });
}
