import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeAssistantIdempotencyStorage,
  analyzeAssistantLeadStorage,
  analyzeAssistantPrivacyStorage,
  inspectAssistantStoragePreflight
} from "../assistant-storage-preflight.js";

const LEAD_COLUMNS = [
  ["id", 1, 1],
  ["type", 1, 0],
  ["status", 1, 0],
  ["name", 1, 0],
  ["email", 0, 0],
  ["message", 0, 0],
  ["language", 0, 0],
  ["market", 0, 0],
  ["source", 0, 0],
  ["service_category", 0, 0],
  ["preferred_contact_channel", 0, 0],
  ["contact_phone", 0, 0],
  ["contact_whatsapp", 0, 0],
  ["contact_other", 0, 0],
  ["project_date", 0, 0],
  ["project_city", 0, 0],
  ["project_venue", 0, 0],
  ["details_json", 0, 0],
  ["updated_at", 0, 0]
].map(([name, notnull, pk]) => ({ name, notnull, pk }));

const PRIVACY_COLUMNS = [
  "id",
  "lead_id",
  "source",
  "privacy_consent_at",
  "privacy_policy_version",
  "authorization_method"
].map((name) => ({ name, notnull: name === "id" ? 0 : 1, pk: name === "id" ? 1 : 0 }));

const IDEMPOTENCY_COLUMNS = [
  ["idempotency_key", 0, 1],
  ["effect", 1, 0],
  ["status", 1, 0],
  ["request_id", 1, 0],
  ["lead_id", 0, 0],
  ["attempts", 1, 0],
  ["reserved_at", 1, 0],
  ["updated_at", 1, 0],
  ["completed_at", 0, 0],
  ["error_code", 0, 0]
].map(([name, notnull, pk]) => ({ name, notnull, pk }));

const LEAD_SQL = `
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('contact', 'rental', 'assistant')),
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'lost')),
    name TEXT NOT NULL,
    email TEXT,
    message TEXT,
    language TEXT,
    market TEXT,
    source TEXT,
    service_category TEXT,
    preferred_contact_channel TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    contact_other TEXT,
    project_date TEXT,
    project_city TEXT,
    project_venue TEXT,
    details_json TEXT,
    updated_at TEXT
  )
`;

const PRIVACY_SQL = `
  CREATE TABLE privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('contact', 'rental', 'assistant')),
    privacy_consent_at TEXT NOT NULL,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL
  )
`;

const PRIVACY_INDEX_SQL = `
  CREATE UNIQUE INDEX idx_privacy_consents_lead_source
  ON privacy_consents (lead_id, source)
`;

const IDEMPOTENCY_SQL = `
  CREATE TABLE assistant_effect_reservations (
    idempotency_key TEXT PRIMARY KEY,
    effect TEXT NOT NULL CHECK (effect IN ('lead_create')),
    status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'failed')),
    request_id TEXT NOT NULL,
    lead_id INTEGER,
    attempts INTEGER NOT NULL DEFAULT 1,
    reserved_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    error_code TEXT
  )
`;

const IDEMPOTENCY_INDEX_SQL = `
  CREATE INDEX idx_assistant_effect_reservations_status_updated
  ON assistant_effect_reservations(status, updated_at)
`;

test("compatible Lead schema permits Assistant and non-email contact channels", () => {
  const result = analyzeAssistantLeadStorage({
    columns: LEAD_COLUMNS,
    tableSql: LEAD_SQL
  });

  assert.equal(result.canInsertAssistantLead, true);
  assert.equal(result.reason, "compatible");
  assert.equal(result.legacyEmailRequired, false);
  assert.equal(result.supportsNonEmailContact, true);
});

test("legacy type CHECK and required email both fail closed", () => {
  const blockedType = analyzeAssistantLeadStorage({
    columns: LEAD_COLUMNS,
    tableSql: LEAD_SQL.replace(", 'assistant'", "")
  });
  assert.equal(blockedType.canInsertAssistantLead, false);
  assert.equal(blockedType.reason, "legacy_type_check_blocks_assistant");

  const emailRequiredColumns = LEAD_COLUMNS.map((row) =>
    row.name === "email" ? { ...row, notnull: 1 } : row
  );
  const emailRequired = analyzeAssistantLeadStorage({
    columns: emailRequiredColumns,
    tableSql: LEAD_SQL
  });
  assert.equal(emailRequired.canInsertAssistantLead, false);
  assert.equal(emailRequired.reason, "legacy_email_required");
  assert.equal(emailRequired.supportsNonEmailContact, false);
});

test("privacy storage requires Assistant source and canonical unique index", () => {
  const compatible = analyzeAssistantPrivacyStorage({
    columns: PRIVACY_COLUMNS,
    tableSql: PRIVACY_SQL,
    canonicalIndexSql: PRIVACY_INDEX_SQL
  });
  assert.equal(compatible.canRecordAssistantConsent, true);
  assert.equal(compatible.reason, "compatible");

  const blockedSource = analyzeAssistantPrivacyStorage({
    columns: PRIVACY_COLUMNS,
    tableSql: PRIVACY_SQL.replace(", 'assistant'", ""),
    canonicalIndexSql: PRIVACY_INDEX_SQL
  });
  assert.equal(blockedSource.canRecordAssistantConsent, false);
  assert.equal(blockedSource.reason, "assistant_source_not_allowed");

  const missingIndex = analyzeAssistantPrivacyStorage({
    columns: PRIVACY_COLUMNS,
    tableSql: PRIVACY_SQL,
    canonicalIndexSql: null
  });
  assert.equal(missingIndex.canRecordAssistantConsent, false);
  assert.equal(missingIndex.reason, "canonical_unique_index_missing");
});

test("idempotency storage requires the exact reservation contract", () => {
  const compatible = analyzeAssistantIdempotencyStorage({
    columns: IDEMPOTENCY_COLUMNS,
    tableSql: IDEMPOTENCY_SQL,
    statusIndexSql: IDEMPOTENCY_INDEX_SQL
  });
  assert.equal(compatible.ready, true);
  assert.equal(compatible.reason, "compatible");
  assert.equal(compatible.primaryKeyReady, true);

  const missingTable = analyzeAssistantIdempotencyStorage({
    columns: [],
    tableSql: null,
    statusIndexSql: null
  });
  assert.equal(missingTable.ready, false);
  assert.equal(missingTable.reason, "table_missing");

  const blockedStatus = analyzeAssistantIdempotencyStorage({
    columns: IDEMPOTENCY_COLUMNS,
    tableSql: IDEMPOTENCY_SQL.replace(", 'failed'", ""),
    statusIndexSql: IDEMPOTENCY_INDEX_SQL
  });
  assert.equal(blockedStatus.ready, false);
  assert.equal(blockedStatus.reason, "status_constraint_incompatible");

  const missingIndex = analyzeAssistantIdempotencyStorage({
    columns: IDEMPOTENCY_COLUMNS,
    tableSql: IDEMPOTENCY_SQL,
    statusIndexSql: null
  });
  assert.equal(missingIndex.ready, false);
  assert.equal(missingIndex.reason, "status_index_missing");
});

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
  }
  all() {
    return this.db.read(this.sql, "all");
  }
  first() {
    return this.db.read(this.sql, "first");
  }
}

class ReadOnlyFakeD1 {
  constructor() {
    this.statements = [];
  }
  prepare(sql) {
    const normalized = String(sql).replace(/\s+/g, " ").trim();
    this.statements.push(normalized);
    return new FakeStatement(this, normalized);
  }
  async read(sql, mode) {
    if (/^PRAGMA table_info\(leads\)$/i.test(sql)) {
      return { results: LEAD_COLUMNS };
    }
    if (/^PRAGMA table_info\(privacy_consents\)$/i.test(sql)) {
      return { results: PRIVACY_COLUMNS };
    }
    if (/^PRAGMA table_info\(assistant_effect_reservations\)$/i.test(sql)) {
      return { results: IDEMPOTENCY_COLUMNS };
    }
    if (sql.includes("type = 'table'") && sql.includes("name = 'leads'")) {
      return { sql: LEAD_SQL };
    }
    if (sql.includes("type = 'table'") && sql.includes("name = 'privacy_consents'")) {
      return { sql: PRIVACY_SQL };
    }
    if (sql.includes("type = 'index'") && sql.includes("idx_privacy_consents_lead_source")) {
      return { sql: PRIVACY_INDEX_SQL };
    }
    if (sql.includes("type = 'table'") && sql.includes("name = 'assistant_effect_reservations'")) {
      return { sql: IDEMPOTENCY_SQL };
    }
    if (sql.includes("type = 'index'") && sql.includes("idx_assistant_effect_reservations_status_updated")) {
      return { sql: IDEMPOTENCY_INDEX_SQL };
    }
    throw new Error(`Unhandled ${mode} read: ${sql}`);
  }
}

test("physical preflight performs metadata reads only", async () => {
  const db = new ReadOnlyFakeD1();
  const result = await inspectAssistantStoragePreflight({ CMS_DB: db });

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.readyForAssistantLeadCapture, true);
  assert.equal(result.idempotency.ready, true);
  assert.equal(db.statements.length, 8);

  for (const statement of db.statements) {
    assert.match(statement, /^(PRAGMA|SELECT)\b/i, statement);
    assert.doesNotMatch(
      statement,
      /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i,
      statement
    );
  }
});

test("missing idempotency storage keeps the complete preflight fail-closed", async () => {
  class MissingIdempotencyD1 extends ReadOnlyFakeD1 {
    async read(sql, mode) {
      if (/^PRAGMA table_info\(assistant_effect_reservations\)$/i.test(sql)) {
        return { results: [] };
      }
      if (sql.includes("type = 'table'") && sql.includes("name = 'assistant_effect_reservations'")) {
        return null;
      }
      if (sql.includes("type = 'index'") && sql.includes("idx_assistant_effect_reservations_status_updated")) {
        return null;
      }
      return super.read(sql, mode);
    }
  }

  const result = await inspectAssistantStoragePreflight({ CMS_DB: new MissingIdempotencyD1() });
  assert.equal(result.readyForAssistantLeadCapture, false);
  assert.equal(result.idempotency.ready, false);
  assert.equal(result.idempotency.reason, "table_missing");
});
