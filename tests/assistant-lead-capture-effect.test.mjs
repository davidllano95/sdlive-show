import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantLeadCapturePolicy,
  captureAssistantLeadEffect
} from "../assistant-lead-capture-effect.js";
import {
  ASSISTANT_CONSENT_METHOD,
  ASSISTANT_PRIVACY_POLICY_VERSION
} from "../assistant-consent-contract.js";

const NOW = new Date("2026-09-02T00:30:00.000Z");
const SESSION_ID = `asst_${"a".repeat(32)}`;
const REQUEST_1 = `req_${"1".repeat(32)}`;
const REQUEST_2 = `req_${"2".repeat(32)}`;

const COMPATIBILITY = {
  ok: true,
  source: "assistant",
  canInsert: true,
  reason: "compatible",
  legacyEmailRequired: false,
  columns: [
    "id", "type", "status", "name", "email", "message", "language", "market",
    "source_url", "referrer", "utm_source", "utm_medium", "utm_campaign",
    "source", "service_category", "preferred_contact_channel", "contact_phone",
    "contact_whatsapp", "contact_other", "project_date", "project_city",
    "project_venue", "details_json", "updated_at"
  ]
};

function evidence() {
  return {
    source: "assistant",
    granted: true,
    language: "es",
    privacyPolicyVersion: ASSISTANT_PRIVACY_POLICY_VERSION,
    authorizationMethod: ASSISTANT_CONSENT_METHOD,
    grantedAt: "2026-09-02T00:25:00.000Z"
  };
}

function leadDraft() {
  return {
    serviceCategory: "theatre",
    language: "es",
    market: "colombia",
    name: "Cliente QA",
    contact: {
      email: null,
      phone: null,
      whatsapp: "+57 300 000 0000",
      other: null,
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-10",
      city: "Bogotá",
      venue: "Teatro QA"
    },
    summary: "Diseño de sonido para una obra.",
    details: {
      equipment: ["QLab playback"],
      schedule: "Ensayo 14:00"
    }
  };
}

class FakeStatement {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
    this.args = args;
  }
  bind(...args) { return new FakeStatement(this.db, this.sql, args); }
  run() { return this.db.run(this); }
  first() { return this.db.first(this); }
  all() { return this.db.all(this); }
}

class FakeD1 {
  constructor() {
    this.reservations = new Map();
    this.leads = [];
    this.consents = [];
    this.nextLeadId = 77;
    this.batchCalls = 0;
    this.failNextCaptureBatch = false;
  }

  prepare(sql) { return new FakeStatement(this, sql); }

  async all(statement) {
    if (/PRAGMA table_info\(leads\)/i.test(statement.sql)) return { results: [] };
    throw new Error(`Unhandled all: ${statement.sql}`);
  }

  async first(statement) {
    if (statement.sql.includes("FROM assistant_effect_reservations")) {
      const row = this.reservations.get(statement.args[0]);
      return row ? { ...row } : null;
    }
    throw new Error(`Unhandled first: ${statement.sql}`);
  }

  async run(statement) {
    const { sql, args } = statement;
    if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
      return { meta: { changes: 0 } };
    }

    if (sql.startsWith("INSERT OR IGNORE INTO assistant_effect_reservations")) {
      const [key, requestId, reservedAt, updatedAt] = args;
      if (this.reservations.has(key)) return { meta: { changes: 0 } };
      this.reservations.set(key, {
        idempotency_key: key,
        effect: "lead_create",
        status: "reserved",
        request_id: requestId,
        lead_id: null,
        attempts: 1,
        reserved_at: reservedAt,
        updated_at: updatedAt,
        completed_at: null,
        error_code: null
      });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("attempts = attempts + 1") && sql.includes("status = 'failed'")) {
      const [requestId, reservedAt, updatedAt, key] = args;
      const row = this.reservations.get(key);
      if (!row || row.status !== "failed") return { meta: { changes: 0 } };
      Object.assign(row, {
        status: "reserved",
        request_id: requestId,
        attempts: row.attempts + 1,
        reserved_at: reservedAt,
        updated_at: updatedAt,
        completed_at: null,
        error_code: null
      });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("status = 'failed'") && sql.includes("error_code = ?")) {
      const [updatedAt, errorCode, key] = args;
      const row = this.reservations.get(key);
      if (!row || row.status !== "reserved") return { meta: { changes: 0 } };
      Object.assign(row, { status: "failed", updated_at: updatedAt, error_code: errorCode });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("attempts = attempts + 1") && sql.includes("AND reserved_at = ?")) {
      return { meta: { changes: 0 } };
    }

    throw new Error(`Unhandled run: ${sql}`);
  }

  async batch(statements) {
    this.batchCalls += 1;
    if (this.failNextCaptureBatch) {
      this.failNextCaptureBatch = false;
      throw new Error("simulated transactional failure");
    }

    const reservations = new Map(
      [...this.reservations.entries()].map(([key, row]) => [key, { ...row }])
    );
    const leads = this.leads.map((row) => ({ ...row }));
    const consents = this.consents.map((row) => ({ ...row }));
    let leadId = null;
    const results = [];

    try {
      for (const statement of statements) {
        const { sql, args } = statement;
        if (sql.startsWith("INSERT INTO leads")) {
          leadId = this.nextLeadId;
          leads.push({ id: leadId, values: [...args] });
          results.push({ meta: { changes: 1, last_row_id: leadId } });
          continue;
        }

        if (sql.startsWith("UPDATE assistant_effect_reservations")) {
          const [completedAt, updatedAt, key, requestId] = args;
          const row = reservations.get(key);
          const changed = row && row.status === "reserved" && row.request_id === requestId;
          if (changed) {
            Object.assign(row, {
              status: "completed",
              lead_id: leadId,
              completed_at: completedAt,
              updated_at: updatedAt,
              error_code: null
            });
          }
          results.push({ meta: { changes: changed ? 1 : 0 } });
          continue;
        }

        if (sql.startsWith("INSERT INTO privacy_consents")) {
          const [key, requestId, grantedAt, policyVersion, authorizationMethod] = args;
          const row = reservations.get(key);
          if (!row || row.status !== "completed" || row.request_id !== requestId || !row.lead_id) {
            throw new Error("privacy consent lead_id NOT NULL failure");
          }
          consents.push({
            lead_id: row.lead_id,
            source: "assistant",
            privacy_consent_at: grantedAt,
            privacy_policy_version: policyVersion,
            authorization_method: authorizationMethod
          });
          results.push({ meta: { changes: 1 } });
          continue;
        }

        throw new Error(`Unhandled batch SQL: ${sql}`);
      }
    } catch (error) {
      throw error;
    }

    this.reservations = reservations;
    this.leads = leads;
    this.consents = consents;
    this.nextLeadId += 1;
    return results;
  }
}

function options() {
  return {
    now: NOW,
    inspectCompatibility: async () => COMPATIBILITY,
    ensureConsentSchema: async () => ({ ok: true, migrated: false })
  };
}

test("capture policy requires atomic PII + consent persistence in canonical stores", () => {
  assert.deepEqual(assistantLeadCapturePolicy(), {
    leadSourceOfTruth: "leads",
    consentSourceOfTruth: "privacy_consents",
    idempotencyTable: "assistant_effect_reservations",
    atomicPiiAndConsentWrite: true,
    assistantSource: "assistant",
    initialStatus: "new",
    requiresFreshConsent: true,
    supportsCompletedRetry: true,
    storesTranscript: false,
    runtimeSchemaMutations: false
  });
});

test("successful capture commits one Lead, completed reservation and exact consent evidence", async () => {
  const db = new FakeD1();
  const result = await captureAssistantLeadEffect({ CMS_DB: db }, {
    requestId: REQUEST_1,
    session: { sessionId: SESSION_ID },
    consentEvidence: evidence(),
    leadDraft: leadDraft()
  }, options());

  assert.equal(result.ok, true);
  assert.equal(result.leadId, 77);
  assert.equal(result.deduplicated, false);
  assert.equal(db.leads.length, 1);
  assert.equal(db.consents.length, 1);
  assert.deepEqual(db.consents[0], {
    lead_id: 77,
    source: "assistant",
    privacy_consent_at: "2026-09-02T00:25:00.000Z",
    privacy_policy_version: ASSISTANT_PRIVACY_POLICY_VERSION,
    authorization_method: ASSISTANT_CONSENT_METHOD
  });

  const reservation = [...db.reservations.values()][0];
  assert.equal(reservation.status, "completed");
  assert.equal(reservation.lead_id, 77);
});

test("completed retry returns the original lead without a second PII batch", async () => {
  const db = new FakeD1();
  const first = await captureAssistantLeadEffect({ CMS_DB: db }, {
    requestId: REQUEST_1,
    session: { sessionId: SESSION_ID },
    consentEvidence: evidence(),
    leadDraft: leadDraft()
  }, options());
  const second = await captureAssistantLeadEffect({ CMS_DB: db }, {
    requestId: REQUEST_2,
    session: { sessionId: SESSION_ID },
    consentEvidence: evidence(),
    leadDraft: leadDraft()
  }, options());

  assert.equal(first.leadId, second.leadId);
  assert.equal(second.deduplicated, true);
  assert.equal(db.leads.length, 1);
  assert.equal(db.consents.length, 1);
  assert.equal(db.batchCalls, 1);
});

test("failed transactional batch leaves no Lead or consent and marks reservation retryable", async () => {
  const db = new FakeD1();
  db.failNextCaptureBatch = true;

  await assert.rejects(
    () => captureAssistantLeadEffect({ CMS_DB: db }, {
      requestId: REQUEST_1,
      session: { sessionId: SESSION_ID },
      consentEvidence: evidence(),
      leadDraft: leadDraft()
    }, options()),
    /simulated transactional failure/
  );

  assert.equal(db.leads.length, 0);
  assert.equal(db.consents.length, 0);
  const reservation = [...db.reservations.values()][0];
  assert.equal(reservation.status, "failed");

  const retry = await captureAssistantLeadEffect({ CMS_DB: db }, {
    requestId: REQUEST_2,
    session: { sessionId: SESSION_ID },
    consentEvidence: evidence(),
    leadDraft: leadDraft()
  }, options());
  assert.equal(retry.leadId, 77);
  assert.equal(db.leads.length, 1);
  assert.equal(db.consents.length, 1);
});

test("missing or stale consent fails before any D1 statement", async () => {
  let prepared = 0;
  const db = {
    prepare() { prepared += 1; throw new Error("must not touch D1"); },
    batch() { throw new Error("must not batch"); }
  };

  await assert.rejects(
    () => captureAssistantLeadEffect({ CMS_DB: db }, {
      requestId: REQUEST_1,
      session: { sessionId: SESSION_ID },
      consentEvidence: null,
      leadDraft: leadDraft()
    }, options()),
    (error) => error?.code === "CONSENT_REQUIRED"
  );
  assert.equal(prepared, 0);
});

test("incompatible physical leads schema blocks before reservation or PII mutation", async () => {
  const db = new FakeD1();
  await assert.rejects(
    () => captureAssistantLeadEffect({ CMS_DB: db }, {
      requestId: REQUEST_1,
      session: { sessionId: SESSION_ID },
      consentEvidence: evidence(),
      leadDraft: leadDraft()
    }, {
      ...options(),
      inspectCompatibility: async () => ({
        canInsert: false,
        reason: "legacy_type_check_not_proven",
        columns: COMPATIBILITY.columns
      })
    }),
    (error) => error?.code === "LEAD_STORAGE_INCOMPATIBLE"
  );

  assert.equal(db.reservations.size, 0);
  assert.equal(db.leads.length, 0);
  assert.equal(db.consents.length, 0);
});
