import test from "node:test";
import assert from "node:assert/strict";

import { captureAssistantLeadEffect } from "../assistant-lead-capture-effect.js";
import {
  ASSISTANT_CONSENT_METHOD,
  ASSISTANT_PRIVACY_POLICY_VERSION
} from "../assistant-consent-contract.js";

const NOW = new Date("2026-09-02T03:00:00.000Z");
const REQUEST_ID = `req_${"3".repeat(32)}`;
const SESSION_ID = `asst_${"b".repeat(32)}`;
const COMPATIBILITY = {
  ok: true,
  source: "assistant",
  canInsert: true,
  reason: "compatible",
  legacyEmailRequired: false,
  columns: [
    "id", "type", "status", "name", "email", "message", "language", "market",
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
    grantedAt: "2026-09-02T02:58:00.000Z"
  };
}

function leadDraft() {
  return {
    serviceCategory: "live",
    language: "es",
    market: "colombia",
    name: "Cliente Runtime QA",
    contact: {
      email: null,
      phone: null,
      whatsapp: "+57 300 000 0000",
      other: null,
      preferredChannel: "whatsapp"
    },
    project: {
      date: "2026-10-20",
      city: "Bogotá",
      venue: "Venue QA"
    },
    summary: "Solicitud de audio en vivo.",
    details: {
      equipment: [],
      schedule: null
    }
  };
}

class Statement {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.db, this.sql, args);
  }
  run() {
    return this.db.run(this);
  }
  first() {
    return this.db.first(this);
  }
}

class SchemaSafeD1 {
  constructor() {
    this.statements = [];
    this.reservation = null;
    this.leads = [];
    this.consents = [];
  }

  prepare(sql) {
    const normalized = String(sql).replace(/\s+/g, " ").trim();
    this.statements.push(normalized);
    if (/^(CREATE|ALTER|DROP|REPLACE)\b/i.test(normalized)) {
      throw new Error(`runtime DDL forbidden: ${normalized}`);
    }
    return new Statement(this, normalized);
  }

  async run(statement) {
    const { sql, args } = statement;
    if (sql.startsWith("INSERT OR IGNORE INTO assistant_effect_reservations")) {
      const [key, requestId, reservedAt, updatedAt] = args;
      if (this.reservation) return { meta: { changes: 0 } };
      this.reservation = {
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
      };
      return { meta: { changes: 1 } };
    }
    throw new Error(`Unhandled runtime statement: ${sql}`);
  }

  async first(statement) {
    if (statement.sql.includes("FROM assistant_effect_reservations")) {
      return this.reservation ? { ...this.reservation } : null;
    }
    throw new Error(`Unhandled runtime read: ${statement.sql}`);
  }

  async batch(statements) {
    let leadId = 91;
    const results = [];
    for (const statement of statements) {
      const { sql, args } = statement;
      if (sql.startsWith("INSERT INTO leads")) {
        this.leads.push({ id: leadId, values: [...args] });
        results.push({ meta: { changes: 1, last_row_id: leadId } });
        continue;
      }
      if (sql.startsWith("UPDATE assistant_effect_reservations")) {
        const [completedAt, updatedAt, key, requestId] = args;
        const changed = this.reservation &&
          this.reservation.idempotency_key === key &&
          this.reservation.request_id === requestId &&
          this.reservation.status === "reserved";
        if (changed) {
          Object.assign(this.reservation, {
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
        this.consents.push({ values: [...args] });
        results.push({ meta: { changes: 1 } });
        continue;
      }
      throw new Error(`Unhandled runtime batch statement: ${sql}`);
    }
    return results;
  }
}

function readyOptions(overrides = {}) {
  return {
    now: NOW,
    inspectCompatibility: async () => COMPATIBILITY,
    inspectConsentStorage: async () => ({
      canRecordAssistantConsent: true,
      reason: "compatible"
    }),
    inspectIdempotencyStorage: async () => ({
      ready: true,
      reason: "compatible"
    }),
    ...overrides
  };
}

function input() {
  return {
    requestId: REQUEST_ID,
    session: { sessionId: SESSION_ID },
    consentEvidence: evidence(),
    leadDraft: leadDraft()
  };
}

test("default Assistant capture performs data writes without runtime schema DDL", async () => {
  const db = new SchemaSafeD1();
  const result = await captureAssistantLeadEffect({ CMS_DB: db }, input(), readyOptions());

  assert.equal(result.ok, true);
  assert.equal(result.leadId, 91);
  assert.equal(db.leads.length, 1);
  assert.equal(db.consents.length, 1);
  assert.equal(db.reservation.status, "completed");

  for (const sql of db.statements) {
    assert.doesNotMatch(sql, /^(CREATE|ALTER|DROP|REPLACE)\b/i, sql);
  }
});

test("incompatible privacy storage fails before reservation or PII writes", async () => {
  const db = new SchemaSafeD1();

  await assert.rejects(
    () => captureAssistantLeadEffect({ CMS_DB: db }, input(), readyOptions({
      inspectConsentStorage: async () => ({
        canRecordAssistantConsent: false,
        reason: "assistant_source_not_allowed"
      })
    })),
    (error) => error?.code === "PRIVACY_STORAGE_INCOMPATIBLE"
  );

  assert.equal(db.statements.length, 0);
  assert.equal(db.reservation, null);
  assert.equal(db.leads.length, 0);
});

test("missing idempotency storage fails before reservation or PII writes", async () => {
  const db = new SchemaSafeD1();

  await assert.rejects(
    () => captureAssistantLeadEffect({ CMS_DB: db }, input(), readyOptions({
      inspectIdempotencyStorage: async () => ({
        ready: false,
        reason: "table_missing"
      })
    })),
    (error) => error?.code === "IDEMPOTENCY_STORAGE_NOT_READY"
  );

  assert.equal(db.statements.length, 0);
  assert.equal(db.reservation, null);
  assert.equal(db.leads.length, 0);
});
