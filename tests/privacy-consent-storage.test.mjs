import test from "node:test";
import assert from "node:assert/strict";

import {
  PRIVACY_CONSENT_SOURCES,
  ensurePrivacyConsentStorageSchema,
  privacyConsentSchemaSupportsAssistant,
  recordPrivacyConsent
} from "../privacy-consent-storage.js";

const LEGACY_SQL = `
  CREATE TABLE privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('contact', 'rental')),
    privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )
`;

const CURRENT_SQL = `
  CREATE TABLE privacy_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('contact', 'rental', 'assistant')),
    privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_policy_version TEXT NOT NULL,
    authorization_method TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )
`;

function statement(sql, log, bindValues = null) {
  return {
    sql,
    bind(...values) {
      return statement(sql, log, values);
    },
    async run() {
      log.push({ kind: "run", sql, values: bindValues });
      return { success: true };
    },
    async first() {
      log.push({ kind: "first", sql, values: bindValues });
      return null;
    }
  };
}

function migrationDb({ initialSql = LEGACY_SQL } = {}) {
  const log = [];
  let schemaSql = initialSql;

  return {
    log,
    prepare(sql) {
      if (/FROM sqlite_master/i.test(sql)) {
        return {
          async first() {
            log.push({ kind: "first", sql, values: null });
            return { sql: schemaSql };
          }
        };
      }

      return statement(sql, log);
    },
    async batch(statements) {
      log.push({ kind: "batch", statements: statements.map((item) => item.sql) });
      schemaSql = CURRENT_SQL;
      return statements.map(() => ({ success: true }));
    }
  };
}

test("privacy consent source contract includes Assistant without removing Contact or Rental", () => {
  assert.deepEqual(PRIVACY_CONSENT_SOURCES, ["contact", "rental", "assistant"]);
});

test("detects legacy source CHECK and Assistant-aware source CHECK", () => {
  assert.equal(privacyConsentSchemaSupportsAssistant(LEGACY_SQL), false);
  assert.equal(privacyConsentSchemaSupportsAssistant(CURRENT_SQL), true);
  assert.equal(
    privacyConsentSchemaSupportsAssistant("CREATE TABLE privacy_consents (source TEXT NOT NULL)"),
    true
  );
});

test("legacy privacy_consents rebuild preserves every existing data column and canonical table name", async () => {
  const db = migrationDb({ initialSql: LEGACY_SQL });
  const result = await ensurePrivacyConsentStorageSchema({ CMS_DB: db });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);

  const batch = db.log.find((entry) => entry.kind === "batch");
  assert.ok(batch);
  const sql = batch.statements.join("\n");

  assert.match(sql, /privacy_consents__assistant_migration/);
  assert.match(sql, /CHECK \(source IN \('contact', 'rental', 'assistant'\)\)/);
  assert.match(sql, /INSERT INTO privacy_consents__assistant_migration/);
  assert.match(sql, /SELECT\s+id,\s+lead_id,\s+source,\s+privacy_consent_at,\s+privacy_policy_version,\s+authorization_method\s+FROM privacy_consents/s);
  assert.match(sql, /DROP TABLE privacy_consents/);
  assert.match(sql, /ALTER TABLE privacy_consents__assistant_migration RENAME TO privacy_consents/);
  assert.match(sql, /idx_privacy_consents_lead_source/);
});

test("already-compatible privacy_consents schema is idempotent and does not rebuild", async () => {
  const db = migrationDb({ initialSql: CURRENT_SQL });
  const result = await ensurePrivacyConsentStorageSchema({ CMS_DB: db });

  assert.equal(result.ok, true);
  assert.equal(result.migrated, false);
  assert.equal(db.log.some((entry) => entry.kind === "batch"), false);
});

test("recordPrivacyConsent accepts Assistant and writes the existing canonical table", async () => {
  const log = [];
  const db = {
    prepare(sql) {
      if (/FROM sqlite_master/i.test(sql)) {
        return {
          async first() {
            log.push({ kind: "first", sql });
            return { sql: CURRENT_SQL };
          }
        };
      }

      return {
        bind(...values) {
          return {
            async run() {
              log.push({ kind: "bound-run", sql, values });
              return { success: true };
            }
          };
        },
        async run() {
          log.push({ kind: "run", sql, values: null });
          return { success: true };
        }
      };
    },
    async batch() {
      throw new Error("compatible schema must not rebuild");
    }
  };

  const result = await recordPrivacyConsent(
    { CMS_DB: db },
    {
      leadId: 77,
      source: "assistant",
      policyVersion: "2026-08-19",
      authorizationMethod: "assistant_explicit_confirmation"
    }
  );

  assert.equal(result.source, "assistant");
  const insert = log.find((entry) => entry.kind === "bound-run" && /INSERT INTO privacy_consents/i.test(entry.sql));
  assert.ok(insert);
  assert.deepEqual(insert.values, [
    77,
    "assistant",
    "2026-08-19",
    "assistant_explicit_confirmation"
  ]);
});

test("invalid consent source or lead id is rejected before storage mutation", async () => {
  let prepared = 0;
  const env = {
    CMS_DB: {
      prepare() {
        prepared += 1;
        throw new Error("must not reach storage");
      }
    }
  };

  await assert.rejects(
    () => recordPrivacyConsent(env, { leadId: 1, source: "manual" }),
    /source is invalid/
  );
  await assert.rejects(
    () => recordPrivacyConsent(env, { leadId: 0, source: "assistant" }),
    /valid lead id/
  );

  assert.equal(prepared, 0);
});
