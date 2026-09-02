import test from "node:test";
import assert from "node:assert/strict";

import { inspectAssistantLeadsMigrationPrecheck } from "../assistant-leads-migration-precheck.js";

const LEADS_SQL = `
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('contact', 'rental')),
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'lost')),
    name TEXT NOT NULL,
    email TEXT NOT NULL
  )
`;

test("Leads migration precheck reads only schema metadata and filters related DDL", async () => {
  const statements = [];
  const env = {
    CMS_DB: {
      prepare(sql) {
        const statement = String(sql).trim();
        statements.push(statement);

        if (/^PRAGMA table_info\(leads\)$/i.test(statement)) {
          return {
            all: async () => ({
              results: [
                { cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 },
                { cid: 1, name: "type", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
                { cid: 2, name: "email", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 }
              ]
            })
          };
        }

        if (/^SELECT type, name, tbl_name, sql\s+FROM sqlite_master/i.test(statement)) {
          return {
            all: async () => ({
              results: [
                { type: "table", name: "leads", tbl_name: "leads", sql: LEADS_SQL },
                {
                  type: "index",
                  name: "idx_leads_status",
                  tbl_name: "leads",
                  sql: "CREATE INDEX idx_leads_status ON leads(status)"
                },
                {
                  type: "table",
                  name: "privacy_consents",
                  tbl_name: "privacy_consents",
                  sql: "CREATE TABLE privacy_consents (lead_id INTEGER REFERENCES leads(id))"
                },
                {
                  type: "table",
                  name: "unrelated",
                  tbl_name: "unrelated",
                  sql: "CREATE TABLE unrelated (id INTEGER PRIMARY KEY)"
                }
              ]
            })
          };
        }

        throw new Error(`Unexpected SQL: ${statement}`);
      }
    }
  };

  const result = await inspectAssistantLeadsMigrationPrecheck(env);

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.tableSql.trim(), LEADS_SQL.trim());
  assert.deepEqual(result.columns.map((column) => column.name), ["id", "type", "email"]);
  assert.deepEqual(result.relatedSchema.map((item) => item.name), [
    "leads",
    "idx_leads_status",
    "privacy_consents"
  ]);

  assert.equal(statements.length, 2);
  for (const statement of statements) {
    assert.match(statement, /^(?:PRAGMA|SELECT)\b/i);
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|REPLACE)\b/i);
  }
});

test("Leads migration precheck requires the D1 binding", async () => {
  await assert.rejects(
    () => inspectAssistantLeadsMigrationPrecheck({}),
    /CMS_DB binding is missing/
  );
});
