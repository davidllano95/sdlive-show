import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzePrivacyConsentStorageCompatibility,
  inspectAssistantStoragePreflight
} from "../assistant-storage-preflight.js";

const LEAD_COLUMNS = [
  "id",
  "type",
  "status",
  "name",
  "email",
  "message",
  "language",
  "market",
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
].map((name) => ({ name, notnull: name === "email" ? 0 : 0, pk: name === "id" ? 1 : 0 }));

const PRIVACY_COLUMNS = [
  "id",
  "lead_id",
  "source",
  "privacy_consent_at",
  "privacy_policy_version",
  "authorization_method"
].map((name) => ({ name }));

const LEADS_SQL = `
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL
  )
`;

const PRIVACY_INDEX_SQL = `
  CREATE UNIQUE INDEX idx_privacy_consents_lead_source
  ON privacy_consents (lead_id, source)
`;

function mockEnv({ privacySql = PRIVACY_SQL } = {}) {
  const statements = [];

  const db = {
    prepare(sql) {
      statements.push(String(sql));
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      return {
        async all() {
          if (normalized === "pragma table_info(leads)") {
            return { results: LEAD_COLUMNS };
          }
          if (normalized === "pragma table_info(privacy_consents)") {
            return { results: PRIVACY_COLUMNS };
          }
          throw new Error(`Unexpected all(): ${normalized}`);
        },
        async first() {
          if (normalized.includes("name = 'leads'")) {
            return { sql: LEADS_SQL };
          }
          if (normalized.includes("name = 'privacy_consents'")) {
            return { sql: privacySql };
          }
          if (normalized.includes("name = 'idx_privacy_consents_lead_source'")) {
            return { sql: PRIVACY_INDEX_SQL };
          }
          throw new Error(`Unexpected first(): ${normalized}`);
        }
      };
    }
  };

  return { env: { CMS_DB: db }, statements };
}

test("privacy consent compatibility requires Assistant source, canonical columns, and unique index", () => {
  const compatible = analyzePrivacyConsentStorageCompatibility({
    columns: PRIVACY_COLUMNS,
    tableSql: PRIVACY_SQL,
    canonicalIndexSql: PRIVACY_INDEX_SQL
  });

  assert.equal(compatible.canRecordAssistantConsent, true);
  assert.equal(compatible.reason, "compatible");

  const legacy = analyzePrivacyConsentStorageCompatibility({
    columns: PRIVACY_COLUMNS,
    tableSql: PRIVACY_SQL.replace(", 'assistant'", ""),
    canonicalIndexSql: PRIVACY_INDEX_SQL
  });

  assert.equal(legacy.canRecordAssistantConsent, false);
  assert.equal(legacy.reason, "assistant_source_not_allowed");
});

test("Assistant storage preflight is strictly read-only and reports compatible physical D1", async () => {
  const { env, statements } = mockEnv();
  const result = await inspectAssistantStoragePreflight(env);

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.readyForAssistantLeadCapture, true);
  assert.equal(result.leads.canInsert, true);
  assert.equal(result.privacyConsents.canRecordAssistantConsent, true);

  for (const sql of statements) {
    assert.doesNotMatch(
      sql,
      /\b(?:create|alter|insert|update|delete|drop|replace)\b/i,
      `preflight must remain read-only: ${sql}`
    );
  }
});

test("Assistant storage preflight blocks a legacy privacy CHECK without mutating it", async () => {
  const legacyPrivacySql = PRIVACY_SQL.replace(", 'assistant'", "");
  const { env, statements } = mockEnv({ privacySql: legacyPrivacySql });
  const result = await inspectAssistantStoragePreflight(env);

  assert.equal(result.readyForAssistantLeadCapture, false);
  assert.equal(result.leads.canInsert, true);
  assert.equal(result.privacyConsents.canRecordAssistantConsent, false);
  assert.equal(result.privacyConsents.reason, "assistant_source_not_allowed");

  assert.equal(
    statements.some((sql) => /\b(?:create|alter|insert|update|delete|drop|replace)\b/i.test(sql)),
    false
  );
});
