import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantLeadsMigrationSql,
  inspectExactAssistantLeadsMigration
} from "../assistant-leads-schema-migration.js";

const LEADS_SQL = `CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('contact', 'rental', 'project')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'lost')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
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

const PRIVACY_SQL = `CREATE TABLE privacy_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('contact', 'rental')),
  privacy_consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  privacy_policy_version TEXT NOT NULL,
  authorization_method TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
)`;

const RENTAL_SQL = `CREATE TABLE rental_requests (
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

const COLUMN_NAMES = [
  "id", "type", "status", "name", "email", "phone", "company", "message",
  "language", "market", "source_url", "referrer", "utm_source", "utm_medium",
  "utm_campaign", "created_at", "updated_at", "source", "service_category",
  "preferred_contact_channel", "contact_phone", "contact_whatsapp", "contact_other",
  "project_date", "project_city", "project_venue", "details_json"
];

function productionPrecheck(extra = []) {
  return {
    ok: true,
    readOnly: true,
    columns: COLUMN_NAMES.map((name, cid) => ({
      cid,
      name,
      type: name === "id" ? "INTEGER" : "TEXT",
      notNull: ["type", "status", "name", "email", "created_at", "updated_at"].includes(name),
      defaultValue: name === "status" ? "'new'" : ["created_at", "updated_at"].includes(name) ? "CURRENT_TIMESTAMP" : null,
      primaryKey: name === "id"
    })),
    tableSql: LEADS_SQL,
    relatedSchema: [
      { type: "index", name: "idx_leads_created_at", table: "leads", sql: "CREATE INDEX idx_leads_created_at ON leads(created_at)" },
      { type: "index", name: "idx_leads_email", table: "leads", sql: "CREATE INDEX idx_leads_email ON leads(email)" },
      { type: "index", name: "idx_leads_status", table: "leads", sql: "CREATE INDEX idx_leads_status ON leads(status)" },
      { type: "index", name: "idx_leads_type", table: "leads", sql: "CREATE INDEX idx_leads_type ON leads(type)" },
      { type: "index", name: "idx_privacy_consents_lead_source", table: "privacy_consents", sql: "CREATE UNIQUE INDEX idx_privacy_consents_lead_source ON privacy_consents (lead_id, source)" },
      { type: "index", name: "idx_rental_event_date", table: "rental_requests", sql: "CREATE INDEX idx_rental_event_date ON rental_requests(event_date)" },
      { type: "index", name: "idx_rental_lead_id", table: "rental_requests", sql: "CREATE INDEX idx_rental_lead_id ON rental_requests(lead_id)" },
      { type: "table", name: "leads", table: "leads", sql: LEADS_SQL },
      { type: "table", name: "privacy_consents", table: "privacy_consents", sql: PRIVACY_SQL },
      { type: "table", name: "rental_requests", table: "rental_requests", sql: RENTAL_SQL },
      ...extra
    ]
  };
}

function storagePreflight() {
  return {
    readyForAssistantLeadCapture: false,
    leads: {
      canInsertAssistantLead: false,
      reason: "legacy_type_check_blocks_assistant",
      legacyEmailRequired: true
    }
  };
}

function fakeDb({ fkRows = [], tempRows = [], counts = {} } = {}) {
  return {
    prepare(sql) {
      const statement = String(sql).trim();
      const api = {
        bind() { return api; },
        async first() {
          const match = statement.match(/^SELECT COUNT\(\*\) AS count FROM (\w+)/i);
          if (match) return { count: counts[match[1]] ?? 0 };
          throw new Error(`Unexpected first SQL: ${statement}`);
        },
        async all() {
          if (/^PRAGMA foreign_key_check$/i.test(statement)) return { results: fkRows };
          if (/^SELECT name FROM sqlite_master WHERE name IN/i.test(statement)) return { results: tempRows };
          throw new Error(`Unexpected all SQL: ${statement}`);
        }
      };
      return api;
    }
  };
}

test("production legacy shape is eligible for an exact read-only migration dry-run", async () => {
  const env = { CMS_DB: fakeDb({ counts: { leads: 12, privacy_consents: 10, rental_requests: 4 } }) };
  const report = await inspectExactAssistantLeadsMigration(env, {
    inspectPrecheck: async () => productionPrecheck(),
    inspectStorage: async () => storagePreflight()
  });

  assert.equal(report.ok, true);
  assert.equal(report.readOnly, true);
  assert.equal(report.canApply, true);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.counts, { leads: 12, privacyConsents: 10, rentalRequests: 4 });
  assert.equal(report.foreignKeyViolations, 0);
  assert.deepEqual(report.temporaryObjects, []);
  assert.deepEqual(report.plannedChange.preserveLeadTypes, ["contact", "rental", "project"]);
  assert.equal(report.plannedChange.addLeadType, "assistant");
  assert.equal(report.plannedChange.makeEmailNullable, true);
});

test("unknown trigger dependency fails closed before any migration write", async () => {
  const env = { CMS_DB: fakeDb() };
  const report = await inspectExactAssistantLeadsMigration(env, {
    inspectPrecheck: async () => productionPrecheck([
      { type: "trigger", name: "trg_leads_unknown", table: "leads", sql: "CREATE TRIGGER trg_leads_unknown AFTER INSERT ON leads BEGIN SELECT 1; END" }
    ]),
    inspectStorage: async () => storagePreflight()
  });

  assert.equal(report.canApply, false);
  assert.ok(report.blockers.includes("unexpected_trigger_dependency"));
  assert.ok(report.blockers.includes("unexpected_related_schema"));
});

test("existing foreign-key violations or stale migration objects fail closed", async () => {
  const env = {
    CMS_DB: fakeDb({
      fkRows: [{ table: "privacy_consents", rowid: 1, parent: "leads", fkid: 0 }],
      tempRows: [{ name: "assistant_leads_migration_backup_leads" }]
    })
  };
  const report = await inspectExactAssistantLeadsMigration(env, {
    inspectPrecheck: async () => productionPrecheck(),
    inspectStorage: async () => storagePreflight()
  });

  assert.equal(report.canApply, false);
  assert.ok(report.blockers.includes("foreign_key_violations_present"));
  assert.ok(report.blockers.includes("migration_temp_objects_present"));
});

test("migration SQL preserves project, makes email nullable, rebuilds children first, and self-verifies", () => {
  const statements = assistantLeadsMigrationSql();
  const joined = statements.join("\n");

  assert.match(joined, /type TEXT NOT NULL CHECK \(type IN \('contact', 'rental', 'project', 'assistant'\)\)/);
  assert.match(joined, /name TEXT NOT NULL,\s*email TEXT,\s*phone TEXT/);
  assert.doesNotMatch(joined, /name TEXT NOT NULL,\s*email TEXT NOT NULL,\s*phone TEXT/);
  assert.match(joined, /source TEXT NOT NULL CHECK \(source IN \('contact', 'rental'\)\)/);
  assert.match(joined, /CREATE UNIQUE INDEX idx_privacy_consents_lead_source/);
  assert.match(joined, /CREATE INDEX idx_rental_event_date/);
  assert.match(joined, /CREATE INDEX idx_rental_lead_id/);
  assert.match(joined, /EXCEPT SELECT/);
  assert.doesNotMatch(joined, /PRAGMA\s+(?:foreign_keys|defer_foreign_keys)/i);

  const dropPrivacy = statements.indexOf("DROP TABLE privacy_consents");
  const dropRental = statements.indexOf("DROP TABLE rental_requests");
  const dropLeads = statements.indexOf("DROP TABLE leads");
  assert.ok(dropPrivacy >= 0 && dropPrivacy < dropLeads);
  assert.ok(dropRental >= 0 && dropRental < dropLeads);

  assert.ok(statements.some((sql) => sql.includes("assistant_leads_migration_backup_sequences")));
  assert.ok(statements.some((sql) => sql.includes("UPDATE sqlite_sequence")));
  assert.equal(statements.at(-1), "DROP TABLE assistant_leads_migration_backup_sequences");
});
