import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ensureLeadCoreStorageSchema,
  persistLeadCoreFields,
  persistLeadCoreFromPublicResponse
} from "../lead-core-storage.js";
import { preparePublicLeadRequest } from "../lead-core-public-request.js";

const LEGACY_LEAD_COLUMNS = [
  "id",
  "type",
  "status",
  "name",
  "email",
  "message",
  "language",
  "market",
  "source_url",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign"
];

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = String(sql);
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async all() {
    this.db.calls.push({ kind: "all", sql: this.sql, args: this.args });

    if (/PRAGMA\s+table_info\(leads\)/i.test(this.sql)) {
      return {
        results: [...this.db.columns].map((name, cid) => ({ cid, name }))
      };
    }

    return { results: [] };
  }

  async run() {
    this.db.calls.push({ kind: "run", sql: this.sql, args: this.args });

    const alter = this.sql.match(
      /ALTER\s+TABLE\s+leads\s+ADD\s+COLUMN\s+([a-z_]+)/i
    );

    if (alter) {
      const name = alter[1];
      if (this.db.columns.has(name)) {
        throw new Error(`duplicate column name: ${name}`);
      }
      this.db.columns.add(name);
    }

    return {
      success: true,
      meta: { changes: 1 }
    };
  }
}

class FakeDb {
  constructor(columns = LEGACY_LEAD_COLUMNS) {
    this.columns = new Set(columns);
    this.calls = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function contactLead() {
  return {
    source: "contact",
    status: "new",
    serviceCategory: "theatre",
    language: "es",
    market: "colombia",
    name: "Client",
    contact: {
      email: "client@example.com",
      preferredChannel: "email"
    },
    project: {
      date: "2026-10-15",
      city: "Bogotá",
      venue: "Teatro Mayor"
    },
    summary: "Diseño de sonido",
    details: {
      schedule: "load-in 08:00"
    }
  };
}

test("Lead Core storage evolves the existing leads table in place and only once per binding", async () => {
  const db = new FakeDb();
  const env = { CMS_DB: db };

  await ensureLeadCoreStorageSchema(env);
  await ensureLeadCoreStorageSchema(env);

  for (const column of [
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
  ]) {
    assert.equal(db.columns.has(column), true, `${column} should exist`);
  }

  const alters = db.calls.filter((call) => /ALTER TABLE leads ADD COLUMN/i.test(call.sql));
  assert.equal(alters.length, 11);

  const backfills = db.calls.filter(
    (call) => /UPDATE leads/i.test(call.sql) && /service_category/i.test(call.sql) && !/WHERE id = \?/i.test(call.sql)
  );
  assert.equal(backfills.length, 1);
});

test("Lead Core enrichment updates the same legacy lead row without duplicating summary storage", async () => {
  const db = new FakeDb();

  await persistLeadCoreFields(
    { CMS_DB: db },
    42,
    contactLead()
  );

  const update = db.calls.find(
    (call) => call.kind === "run" && /WHERE id = \?/i.test(call.sql)
  );

  assert.ok(update);
  assert.doesNotMatch(update.sql, /message\s*=/i);
  assert.doesNotMatch(update.sql, /summary\s*=/i);
  assert.deepEqual(update.args, [
    "contact",
    "theatre",
    "email",
    null,
    null,
    null,
    "2026-10-15",
    "Bogotá",
    "Teatro Mayor",
    JSON.stringify({ schedule: "load-in 08:00" }),
    42
  ]);
});

test("successful public form response enriches its real leadId without consuming the response", async () => {
  const db = new FakeDb();
  const response = new Response(
    JSON.stringify({
      ok: true,
      leadId: 73,
      message: "Contact request received"
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" }
    }
  );

  const persisted = await persistLeadCoreFromPublicResponse(
    { CMS_DB: db },
    response,
    contactLead()
  );

  assert.equal(persisted, true);
  assert.equal((await response.json()).leadId, 73);

  const update = db.calls.find(
    (call) => call.kind === "run" && /WHERE id = \?/i.test(call.sql)
  );
  assert.equal(update.args.at(-1), 73);
});

test("failed or non-lead responses do not touch Lead Core storage", async () => {
  const db = new FakeDb();
  const failed = new Response(
    JSON.stringify({ ok: false }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  );

  assert.equal(
    await persistLeadCoreFromPublicResponse(
      { CMS_DB: db },
      failed,
      contactLead()
    ),
    false
  );
  assert.equal(db.calls.length, 0);
});

test("public request preparation carries the same canonical lead used for storage enrichment", async () => {
  const request = new Request("https://sdlive.show/api/rental", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: " Rental Client ",
      email: " RENTAL@EXAMPLE.COM ",
      eventType: "theater",
      venue: " Teatro Mayor ",
      eventDate: "2026-10-15",
      rentalDays: 2,
      attendees: 500,
      items: { wing: 1 },
      services: { engineering: "yes" },
      notes: " Need FOH package ",
      language: "en",
      market: "colombia"
    })
  });

  const prepared = await preparePublicLeadRequest(request);
  const body = await prepared.request.json();

  assert.equal(prepared.lead.source, "rental");
  assert.equal(prepared.lead.serviceCategory, "rental");
  assert.equal(prepared.lead.project.date, "2026-10-15");
  assert.equal(prepared.lead.project.venue, "Teatro Mayor");
  assert.equal(prepared.lead.details.items.wing, 1);
  assert.equal(body.email, "rental@example.com");
});

test("public runtime wires successful Contact/Rental responses into Lead Core storage", async () => {
  const runtime = await readFile(
    new URL("../public-form-rate-limit.js", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /preparePublicLeadRequest/);
  assert.match(runtime, /persistLeadCoreFromPublicResponse/);
  assert.match(runtime, /Lead Core storage enrichment failed/);
  assert.match(runtime, /return response;/);
});
