import test from "node:test";
import assert from "node:assert/strict";

import {
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
    if (sql.includes("type = 'table'") && sql.includes("name = 'leads'")) {
      return { sql: LEAD_SQL };
    }
    if (sql.includes("type = 'table'") && sql.includes("name = 'privacy_consents'")) {
      return { sql: PRIVACY_SQL };
    }
    if (sql.includes("type = 'index'") && sql.includes("idx_privacy_consents_lead_source")) {
      return { sql: PRIVACY_INDEX_SQL };
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
  assert.equal(db.statements.length, 5);

  for (const statement of db.statements) {
    assert.match(statement, /^(PRAGMA|SELECT)\b/i, statement);
    assert.doesNotMatch(
      statement,
      /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i,
      statement
    );
  }
});
