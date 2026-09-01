import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantIdempotencyStoragePolicy,
  completeAssistantLeadCreate,
  ensureAssistantIdempotencyStorage,
  failAssistantLeadCreate,
  reserveAssistantLeadCreate
} from "../assistant-idempotency-storage.js";

const KEY = `assistant-lead-v1-${"a".repeat(64)}`;
const REQUEST_1 = `req_${"1".repeat(32)}`;
const REQUEST_2 = `req_${"2".repeat(32)}`;

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.args = [];
  }
  bind(...args) {
    this.args = args;
    return this;
  }
  run() {
    return this.db.run(this.sql, this.args);
  }
  first() {
    return this.db.first(this.sql, this.args);
  }
}

class FakeD1 {
  constructor() {
    this.rows = new Map();
    this.schemaRuns = 0;
  }
  prepare(sql) {
    return new FakeStatement(this, sql);
  }
  async run(sql, args) {
    if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
      this.schemaRuns += 1;
      return { meta: { changes: 0 } };
    }

    if (sql.startsWith("INSERT OR IGNORE INTO assistant_effect_reservations")) {
      const [key, requestId, reservedAt, updatedAt] = args;
      if (this.rows.has(key)) return { meta: { changes: 0 } };
      this.rows.set(key, {
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

    if (sql.includes("SET status = 'reserved'") && sql.includes("AND status = 'failed'")) {
      const [requestId, reservedAt, updatedAt, key] = args;
      const row = this.rows.get(key);
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

    if (sql.includes("attempts = attempts + 1") && sql.includes("reserved_at = ?") && sql.includes("AND reserved_at = ?")) {
      const [requestId, reservedAt, updatedAt, key, expectedReservedAt] = args;
      const row = this.rows.get(key);
      if (!row || row.status !== "reserved" || row.reserved_at !== expectedReservedAt) {
        return { meta: { changes: 0 } };
      }
      Object.assign(row, {
        request_id: requestId,
        attempts: row.attempts + 1,
        reserved_at: reservedAt,
        updated_at: updatedAt,
        error_code: null
      });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SET status = 'completed'") && sql.includes("AND status = 'reserved'")) {
      const [leadId, completedAt, updatedAt, key] = args;
      const row = this.rows.get(key);
      if (!row || row.status !== "reserved") return { meta: { changes: 0 } };
      Object.assign(row, {
        status: "completed",
        lead_id: leadId,
        completed_at: completedAt,
        updated_at: updatedAt,
        error_code: null
      });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SET status = 'failed'") && sql.includes("AND status = 'reserved'")) {
      const [updatedAt, errorCode, key] = args;
      const row = this.rows.get(key);
      if (!row || row.status !== "reserved") return { meta: { changes: 0 } };
      Object.assign(row, {
        status: "failed",
        updated_at: updatedAt,
        error_code: errorCode
      });
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unhandled SQL: ${sql}`);
  }
  async first(sql, args) {
    if (!sql.includes("FROM assistant_effect_reservations")) {
      throw new Error(`Unhandled SELECT: ${sql}`);
    }
    const row = this.rows.get(args[0]);
    return row ? { ...row } : null;
  }
}

function env(db = new FakeD1()) {
  return { CMS_DB: db };
}

test("storage policy contains no second lead source of truth or raw content", () => {
  assert.deepEqual(assistantIdempotencyStoragePolicy(), {
    table: "assistant_effect_reservations",
    storesRawPii: false,
    storesTranscript: false,
    storesPromptOrModelOutput: false,
    uniqueKeyEnforcedByDatabase: true,
    supportedEffect: "lead_create",
    abandonedReservationTtlMs: 300000,
    leadSourceOfTruth: "leads"
  });
});

test("schema initialization is idempotent per D1 binding", async () => {
  const db = new FakeD1();
  const e = env(db);
  await ensureAssistantIdempotencyStorage(e);
  await ensureAssistantIdempotencyStorage(e);
  assert.equal(db.schemaRuns, 2);
});

test("first caller acquires reservation and concurrent retry does not", async () => {
  const e = env();
  const first = await reserveAssistantLeadCreate(e, {
    key: KEY,
    requestId: REQUEST_1
  }, { now: "2026-09-01T23:00:00.000Z" });

  const second = await reserveAssistantLeadCreate(e, {
    key: KEY,
    requestId: REQUEST_2
  }, { now: "2026-09-01T23:01:00.000Z" });

  assert.equal(first.acquired, true);
  assert.equal(first.status, "reserved");
  assert.equal(second.acquired, false);
  assert.equal(second.status, "reserved");
  assert.equal(second.attempts, 1);
});

test("completed reservation returns the original leadId on retry", async () => {
  const e = env();
  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 }, {
    now: "2026-09-01T23:00:00.000Z"
  });
  const completed = await completeAssistantLeadCreate(e, { key: KEY, leadId: 42 }, {
    now: "2026-09-01T23:00:10.000Z"
  });
  const duplicate = await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_2 }, {
    now: "2026-09-01T23:02:00.000Z"
  });

  assert.equal(completed.status, "completed");
  assert.equal(completed.leadId, 42);
  assert.equal(duplicate.acquired, false);
  assert.equal(duplicate.status, "completed");
  assert.equal(duplicate.leadId, 42);
});

test("failed effect can be retried without changing the unique key", async () => {
  const e = env();
  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 }, {
    now: "2026-09-01T23:00:00.000Z"
  });
  const failed = await failAssistantLeadCreate(e, {
    key: KEY,
    errorCode: "lead_create_failed"
  }, { now: "2026-09-01T23:00:10.000Z" });
  const retry = await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_2 }, {
    now: "2026-09-01T23:01:00.000Z"
  });

  assert.equal(failed.status, "failed");
  assert.equal(retry.acquired, true);
  assert.equal(retry.status, "reserved");
  assert.equal(retry.attempts, 2);
});

test("stale abandoned reservation can be reclaimed but fresh one cannot", async () => {
  const e = env();
  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 }, {
    now: "2026-09-01T23:00:00.000Z"
  });

  const fresh = await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_2 }, {
    now: "2026-09-01T23:04:59.000Z"
  });
  assert.equal(fresh.acquired, false);
  assert.equal(fresh.attempts, 1);

  const stale = await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_2 }, {
    now: "2026-09-01T23:05:01.000Z"
  });
  assert.equal(stale.acquired, true);
  assert.equal(stale.attempts, 2);
});

test("completion is idempotent for the same lead and conflicts for a different lead", async () => {
  const e = env();
  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 });
  await completeAssistantLeadCreate(e, { key: KEY, leadId: 10 });
  const same = await completeAssistantLeadCreate(e, { key: KEY, leadId: 10 });
  assert.equal(same.leadId, 10);

  await assert.rejects(
    () => completeAssistantLeadCreate(e, { key: KEY, leadId: 11 }),
    (error) => error?.code === "IDEMPOTENCY_STATE_CONFLICT"
  );
});

test("invalid key/request/lead identifiers fail before effect execution", async () => {
  const e = env();
  await assert.rejects(
    () => reserveAssistantLeadCreate(e, { key: "bad", requestId: REQUEST_1 }),
    /Invalid Assistant idempotency key/
  );
  await assert.rejects(
    () => reserveAssistantLeadCreate(e, { key: KEY, requestId: "client-id" }),
    /Invalid Assistant requestId/
  );

  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 });
  await assert.rejects(
    () => completeAssistantLeadCreate(e, { key: KEY, leadId: 0 }),
    /Invalid leadId/
  );
});

test("free-form failure text is reduced to a safe fixed error code", async () => {
  const e = env();
  await reserveAssistantLeadCreate(e, { key: KEY, requestId: REQUEST_1 });
  await failAssistantLeadCreate(e, {
    key: KEY,
    errorCode: "client@example.com had a private failure"
  });
  const row = e.CMS_DB.rows.get(KEY);
  assert.equal(row.error_code, "operation_failed");
  assert.equal(JSON.stringify(row).includes("client@example.com"), false);
});
