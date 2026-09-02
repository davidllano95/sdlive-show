import test from "node:test";
import assert from "node:assert/strict";

import {
  LeadStorageCompatibilityError,
  analyzeLeadStorageCompatibility,
  createLeadCoreRecord,
  inspectLeadStorageCompatibility
} from "../lead-core-create.js";

const BASE_COLUMNS = [
  { name: "id", type: "INTEGER", notnull: 0, pk: 1 },
  { name: "type", type: "TEXT", notnull: 1, pk: 0 },
  { name: "status", type: "TEXT", notnull: 1, pk: 0 },
  { name: "name", type: "TEXT", notnull: 1, pk: 0 },
  { name: "email", type: "TEXT", notnull: 0, pk: 0 },
  { name: "message", type: "TEXT", notnull: 0, pk: 0 },
  { name: "language", type: "TEXT", notnull: 0, pk: 0 },
  { name: "market", type: "TEXT", notnull: 0, pk: 0 },
  { name: "source_url", type: "TEXT", notnull: 0, pk: 0 },
  { name: "referrer", type: "TEXT", notnull: 0, pk: 0 },
  { name: "utm_source", type: "TEXT", notnull: 0, pk: 0 },
  { name: "utm_medium", type: "TEXT", notnull: 0, pk: 0 },
  { name: "utm_campaign", type: "TEXT", notnull: 0, pk: 0 },
  { name: "source", type: "TEXT", notnull: 0, pk: 0 },
  { name: "service_category", type: "TEXT", notnull: 0, pk: 0 },
  { name: "preferred_contact_channel", type: "TEXT", notnull: 0, pk: 0 },
  { name: "contact_phone", type: "TEXT", notnull: 0, pk: 0 },
  { name: "contact_whatsapp", type: "TEXT", notnull: 0, pk: 0 },
  { name: "contact_other", type: "TEXT", notnull: 0, pk: 0 },
  { name: "project_date", type: "TEXT", notnull: 0, pk: 0 },
  { name: "project_city", type: "TEXT", notnull: 0, pk: 0 },
  { name: "project_venue", type: "TEXT", notnull: 0, pk: 0 },
  { name: "details_json", type: "TEXT", notnull: 0, pk: 0 },
  { name: "updated_at", type: "TEXT", notnull: 0, pk: 0 }
];

function permissiveSql() {
  return `
    CREATE TABLE leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('new','contacted','quoted','confirmed','lost')),
      name TEXT NOT NULL,
      email TEXT,
      message TEXT,
      language TEXT,
      market TEXT
    )
  `;
}

function assistantAwareSql() {
  return `
    CREATE TABLE leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('contact','rental','assistant')),
      status TEXT NOT NULL CHECK (status IN ('new','contacted','quoted','confirmed','lost')),
      name TEXT NOT NULL,
      email TEXT,
      message TEXT,
      language TEXT,
      market TEXT
    )
  `;
}

function restrictiveSql() {
  return `
    CREATE TABLE leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('contact','rental')),
      status TEXT NOT NULL CHECK (status IN ('new','contacted','quoted','confirmed','lost')),
      name TEXT NOT NULL,
      email TEXT,
      message TEXT,
      language TEXT,
      market TEXT
    )
  `;
}

function assistantLead(overrides = {}) {
  return {
    source: "assistant",
    status: "new",
    serviceCategory: "theatre",
    language: "es",
    market: "colombia",
    name: "QA Assistant Lead",
    contact: {
      whatsapp: "+57 300 000 0000",
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Teatro QA"
    },
    summary: "Necesita diseño de sonido para una obra.",
    details: {
      equipment: ["console"],
      schedule: "evening"
    },
    attribution: {
      sourceUrl: "https://sdlive.show/es-co/",
      utmSource: "assistant"
    },
    ...overrides
  };
}

function preflightDb({ sql = permissiveSql(), columns = BASE_COLUMNS } = {}) {
  return {
    prepare(statement) {
      if (/PRAGMA table_info\(leads\)/i.test(statement)) {
        return { all: async () => ({ results: columns }) };
      }
      if (/FROM sqlite_master/i.test(statement)) {
        return { first: async () => ({ sql }) };
      }
      throw new Error(`Unexpected preflight SQL: ${statement}`);
    }
  };
}

test("permissive legacy type column allows assistant after canonical columns exist", () => {
  const result = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: BASE_COLUMNS,
    tableSql: permissiveSql()
  });

  assert.equal(result.canInsert, true);
  assert.equal(result.reason, "compatible");
  assert.equal(result.typeConstrained, false);
});

test("explicit legacy type CHECK must include assistant", () => {
  const blocked = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: BASE_COLUMNS,
    tableSql: restrictiveSql()
  });

  assert.equal(blocked.canInsert, false);
  assert.equal(blocked.reason, "legacy_type_check_not_proven");

  const allowed = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: BASE_COLUMNS,
    tableSql: assistantAwareSql()
  });

  assert.equal(allowed.canInsert, true);
  assert.equal(allowed.typeConstrained, true);
});

test("missing table SQL or required columns fails closed", () => {
  const noSql = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: BASE_COLUMNS,
    tableSql: null
  });
  assert.equal(noSql.canInsert, false);
  assert.equal(noSql.reason, "schema_sql_unavailable");

  const missingType = analyzeLeadStorageCompatibility({
    source: "assistant",
    columns: BASE_COLUMNS.filter((column) => column.name !== "type"),
    tableSql: permissiveSql()
  });
  assert.equal(missingType.canInsert, false);
  assert.equal(missingType.reason, "required_columns_missing");
  assert.deepEqual(missingType.missingLegacy, ["type"]);
});

test("real preflight path is read-only and analyzes sqlite_master + PRAGMA", async () => {
  const db = preflightDb({ sql: restrictiveSql() });
  let ensured = 0;

  const result = await inspectLeadStorageCompatibility(
    { CMS_DB: db },
    "assistant",
    {
      ensureSchema: async () => { ensured += 1; }
    }
  );

  assert.equal(ensured, 1);
  assert.equal(result.canInsert, false);
  assert.equal(result.reason, "legacy_type_check_not_proven");
});

test("incompatible preflight blocks assistant before any INSERT", async () => {
  let prepared = 0;
  const env = {
    CMS_DB: {
      prepare() {
        prepared += 1;
        throw new Error("No SQL should be prepared after blocked preflight");
      }
    }
  };

  await assert.rejects(
    () => createLeadCoreRecord(env, assistantLead(), {
      preflight: async () => ({
        ok: true,
        source: "assistant",
        canInsert: false,
        reason: "legacy_type_check_not_proven",
        columns: BASE_COLUMNS.map((column) => column.name)
      })
    }),
    (error) => {
      assert.ok(error instanceof LeadStorageCompatibilityError);
      assert.equal(error.code, "LEAD_STORAGE_INCOMPATIBLE");
      return true;
    }
  );

  assert.equal(prepared, 0);
});

test("assistant creation inserts canonical + legacy compatibility fields into the same leads table", async () => {
  const captured = { sql: "", values: [] };
  const env = {
    CMS_DB: {
      prepare(sql) {
        captured.sql = sql;
        return {
          bind(...values) {
            captured.values = values;
            return this;
          },
          async run() {
            return { meta: { last_row_id: 77 } };
          }
        };
      }
    }
  };

  const compatibility = {
    ok: true,
    source: "assistant",
    canInsert: true,
    reason: "compatible",
    legacyEmailRequired: false,
    columns: BASE_COLUMNS.map((column) => column.name)
  };

  const result = await createLeadCoreRecord(env, assistantLead(), {
    preflight: async () => compatibility,
    now: () => new Date("2026-09-01T22:45:00.000Z")
  });

  assert.equal(result.leadId, 77);
  assert.match(captured.sql, /INSERT INTO leads/i);
  assert.doesNotMatch(captured.sql, /CREATE TABLE/i);
  assert.match(captured.sql, /\btype\b/);
  assert.match(captured.sql, /\bsource\b/);
  assert.match(captured.sql, /service_category/);
  assert.match(captured.sql, /contact_whatsapp/);
  assert.match(captured.sql, /project_city/);
  assert.match(captured.sql, /details_json/);
  assert.ok(captured.values.includes("assistant"));
  assert.ok(captured.values.includes("theatre"));
  assert.ok(captured.values.includes("Bogotá"));
  assert.ok(captured.values.includes("2026-09-01T22:45:00.000Z"));
  assert.equal(result.lead.contact.preferredChannel, "whatsapp");
});

test("direct Assistant creation requires a contact channel and summary", async () => {
  const compatibility = {
    ok: true,
    source: "assistant",
    canInsert: true,
    reason: "compatible",
    legacyEmailRequired: false,
    columns: BASE_COLUMNS.map((column) => column.name)
  };

  const env = { CMS_DB: { prepare: () => { throw new Error("should not write"); } } };

  await assert.rejects(
    () => createLeadCoreRecord(env, assistantLead({ contact: {} }), {
      preflight: async () => compatibility
    }),
    /at least one contact channel/
  );

  await assert.rejects(
    () => createLeadCoreRecord(env, assistantLead({ summary: "" }), {
      preflight: async () => compatibility
    }),
    /requires a summary/
  );
});

test("legacy NOT NULL email requirement fails safely for WhatsApp-only Assistant leads", async () => {
  const compatibility = {
    ok: true,
    source: "assistant",
    canInsert: true,
    reason: "compatible",
    legacyEmailRequired: true,
    columns: BASE_COLUMNS.map((column) => column.name)
  };

  const env = { CMS_DB: { prepare: () => { throw new Error("should not write"); } } };

  await assert.rejects(
    () => createLeadCoreRecord(env, assistantLead(), {
      preflight: async () => compatibility
    }),
    /Legacy leads schema requires email/
  );
});
