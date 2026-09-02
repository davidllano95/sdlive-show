export const ASSISTANT_IDEMPOTENCY_RESERVATION_TTL_MS = 5 * 60 * 1000;

const schemaPromises = new WeakMap();
const KEY_RE = /^assistant-lead-v1-[a-f0-9]{64}$/;
const REQUEST_RE = /^req_[a-f0-9]{32}$/;
const ERROR_CODE_RE = /^[a-z0-9_]{1,80}$/;
const REQUIRED_COLUMNS = Object.freeze([
  "idempotency_key",
  "effect",
  "status",
  "request_id",
  "lead_id",
  "attempts",
  "reserved_at",
  "updated_at",
  "completed_at",
  "error_code"
]);

function dbFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    const error = new Error("CMS_DB is unavailable");
    error.code = "IDEMPOTENCY_STORAGE_NOT_CONFIGURED";
    throw error;
  }
  return db;
}

function iso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid idempotency timestamp");
  return date.toISOString();
}

function validKey(value) {
  const key = String(value || "").trim();
  if (!KEY_RE.test(key)) throw new Error("Invalid Assistant idempotency key");
  return key;
}

function validRequestId(value) {
  const requestId = String(value || "").trim();
  if (!REQUEST_RE.test(requestId)) throw new Error("Invalid Assistant requestId");
  return requestId;
}

function validLeadId(value) {
  const leadId = Number(value);
  if (!Number.isInteger(leadId) || leadId < 1) throw new Error("Invalid leadId");
  return leadId;
}

function safeErrorCode(value) {
  const code = String(value || "").trim().toLowerCase();
  return ERROR_CODE_RE.test(code) ? code : "operation_failed";
}

function checkContainsAll(tableSql, columnName, values) {
  const sql = String(tableSql || "").toLowerCase();
  const match = sql.match(new RegExp(`check\\s*\\(([^)]*\\b${columnName}\\b[^)]*)\\)`, "i"));
  if (!match) return true;
  const expression = match[1].toLowerCase();
  return values.every((value) => expression.includes(`'${value}'`));
}

export function analyzeAssistantIdempotencyStorageCompatibility({
  columns,
  tableSql,
  indexSql
} = {}) {
  const rows = Array.isArray(columns) ? columns : [];
  const names = new Set(rows.map((row) => String(row?.name || "").trim()).filter(Boolean));
  const missingColumns = REQUIRED_COLUMNS.filter((name) => !names.has(name));
  const sql = String(tableSql || "").trim();
  const tableExists = Boolean(sql);
  const primaryKeyReady = rows.some((row) =>
    String(row?.name || "") === "idempotency_key" && Number(row?.pk || 0) > 0
  );
  const effectConstraintReady = tableExists && checkContainsAll(sql, "effect", ["lead_create"]);
  const statusConstraintReady = tableExists && checkContainsAll(sql, "status", [
    "reserved",
    "completed",
    "failed"
  ]);
  const statusIndexReady = /create\s+index/i.test(String(indexSql || ""));

  let reason = "compatible";
  if (!tableExists) reason = "table_missing";
  else if (missingColumns.length) reason = "required_columns_missing";
  else if (!primaryKeyReady) reason = "idempotency_key_primary_key_missing";
  else if (!effectConstraintReady) reason = "effect_constraint_incompatible";
  else if (!statusConstraintReady) reason = "status_constraint_incompatible";
  else if (!statusIndexReady) reason = "status_index_missing";

  return {
    ok: true,
    ready: reason === "compatible",
    reason,
    missingColumns,
    primaryKeyReady,
    effectConstraintReady,
    statusConstraintReady,
    statusIndexReady
  };
}

/** Strictly read-only inspection of the Assistant idempotency table. */
export async function inspectAssistantIdempotencyStorageCompatibility(env) {
  const db = dbFromEnv(env);
  const [tableInfo, tableRow, indexRow] = await Promise.all([
    db.prepare("PRAGMA table_info(assistant_effect_reservations)").all(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'assistant_effect_reservations'
      LIMIT 1
    `).first(),
    db.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'index'
        AND name = 'idx_assistant_effect_reservations_status_updated'
      LIMIT 1
    `).first()
  ]);

  return analyzeAssistantIdempotencyStorageCompatibility({
    columns: tableInfo?.results,
    tableSql: tableRow?.sql,
    indexSql: indexRow?.sql
  });
}

/** Explicit schema preparation helper. Never required by the public capture path. */
export async function ensureAssistantIdempotencyStorage(env) {
  const db = dbFromEnv(env);
  if (schemaPromises.has(db)) return schemaPromises.get(db);

  const promise = (async () => {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS assistant_effect_reservations (
        idempotency_key TEXT PRIMARY KEY,
        effect TEXT NOT NULL CHECK (effect IN ('lead_create')),
        status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'failed')),
        request_id TEXT NOT NULL,
        lead_id INTEGER,
        attempts INTEGER NOT NULL DEFAULT 1,
        reserved_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        error_code TEXT,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_assistant_effect_reservations_status_updated
      ON assistant_effect_reservations(status, updated_at)
    `).run();
  })();

  schemaPromises.set(db, promise);
  try {
    await promise;
  } catch (error) {
    schemaPromises.delete(db);
    throw error;
  }
  return promise;
}

async function maybeEnsureStorage(env, ensureStorage) {
  if (typeof ensureStorage === "function") {
    await ensureStorage(env);
  }
}

async function readReservation(db, key) {
  return db.prepare(`
    SELECT
      idempotency_key,
      effect,
      status,
      request_id,
      lead_id,
      attempts,
      reserved_at,
      updated_at,
      completed_at,
      error_code
    FROM assistant_effect_reservations
    WHERE idempotency_key = ?
    LIMIT 1
  `).bind(key).first();
}

function publicReservation(row, acquired = false) {
  if (!row) return null;
  return {
    key: row.idempotency_key,
    effect: row.effect,
    status: row.status,
    acquired,
    leadId: Number.isInteger(Number(row.lead_id)) && Number(row.lead_id) > 0
      ? Number(row.lead_id)
      : null,
    attempts: Number.isInteger(Number(row.attempts)) ? Number(row.attempts) : null
  };
}

export async function reserveAssistantLeadCreate(
  env,
  {
    key,
    requestId
  },
  {
    now = new Date(),
    staleAfterMs = ASSISTANT_IDEMPOTENCY_RESERVATION_TTL_MS,
    ensureStorage = ensureAssistantIdempotencyStorage
  } = {}
) {
  const db = dbFromEnv(env);
  await maybeEnsureStorage(env, ensureStorage);

  const safeKey = validKey(key);
  const safeRequestId = validRequestId(requestId);
  const nowIso = iso(now);
  const ttl = Number(staleAfterMs);
  if (!Number.isInteger(ttl) || ttl < 60_000 || ttl > 30 * 60_000) {
    throw new Error("Invalid reservation TTL");
  }

  const insert = await db.prepare(`
    INSERT OR IGNORE INTO assistant_effect_reservations (
      idempotency_key,
      effect,
      status,
      request_id,
      attempts,
      reserved_at,
      updated_at
    )
    VALUES (?, 'lead_create', 'reserved', ?, 1, ?, ?)
  `).bind(safeKey, safeRequestId, nowIso, nowIso).run();

  if (Number(insert?.meta?.changes) === 1) {
    const row = await readReservation(db, safeKey);
    return publicReservation(row, true);
  }

  let existing = await readReservation(db, safeKey);
  if (!existing) {
    const error = new Error("Idempotency reservation disappeared");
    error.code = "IDEMPOTENCY_STORAGE_ERROR";
    throw error;
  }

  if (existing.status === "completed") {
    return publicReservation(existing, false);
  }

  if (existing.status === "failed") {
    const retry = await db.prepare(`
      UPDATE assistant_effect_reservations
      SET
        status = 'reserved',
        request_id = ?,
        attempts = attempts + 1,
        reserved_at = ?,
        updated_at = ?,
        completed_at = NULL,
        error_code = NULL
      WHERE idempotency_key = ?
        AND status = 'failed'
    `).bind(safeRequestId, nowIso, nowIso, safeKey).run();

    if (Number(retry?.meta?.changes) === 1) {
      existing = await readReservation(db, safeKey);
      return publicReservation(existing, true);
    }
  }

  existing = await readReservation(db, safeKey);
  if (existing?.status === "completed") return publicReservation(existing, false);

  if (existing?.status === "reserved") {
    const reservedAt = new Date(existing.reserved_at);
    const cutoff = new Date(new Date(nowIso).getTime() - ttl);
    if (!Number.isNaN(reservedAt.getTime()) && reservedAt <= cutoff) {
      const reclaim = await db.prepare(`
        UPDATE assistant_effect_reservations
        SET
          request_id = ?,
          attempts = attempts + 1,
          reserved_at = ?,
          updated_at = ?,
          error_code = NULL
        WHERE idempotency_key = ?
          AND status = 'reserved'
          AND reserved_at = ?
      `).bind(
        safeRequestId,
        nowIso,
        nowIso,
        safeKey,
        existing.reserved_at
      ).run();

      if (Number(reclaim?.meta?.changes) === 1) {
        const reclaimed = await readReservation(db, safeKey);
        return publicReservation(reclaimed, true);
      }
    }
  }

  const current = await readReservation(db, safeKey);
  return publicReservation(current, false);
}

export async function completeAssistantLeadCreate(
  env,
  {
    key,
    leadId
  },
  {
    now = new Date(),
    ensureStorage = ensureAssistantIdempotencyStorage
  } = {}
) {
  const db = dbFromEnv(env);
  await maybeEnsureStorage(env, ensureStorage);

  const safeKey = validKey(key);
  const safeLeadId = validLeadId(leadId);
  const nowIso = iso(now);

  const result = await db.prepare(`
    UPDATE assistant_effect_reservations
    SET
      status = 'completed',
      lead_id = ?,
      completed_at = ?,
      updated_at = ?,
      error_code = NULL
    WHERE idempotency_key = ?
      AND status = 'reserved'
  `).bind(safeLeadId, nowIso, nowIso, safeKey).run();

  if (Number(result?.meta?.changes) === 1) {
    return publicReservation(await readReservation(db, safeKey), false);
  }

  const existing = await readReservation(db, safeKey);
  if (existing?.status === "completed" && Number(existing.lead_id) === safeLeadId) {
    return publicReservation(existing, false);
  }

  const error = new Error("Assistant effect could not be completed");
  error.code = "IDEMPOTENCY_STATE_CONFLICT";
  throw error;
}

export async function failAssistantLeadCreate(
  env,
  {
    key,
    requestId,
    errorCode
  },
  {
    now = new Date(),
    ensureStorage = ensureAssistantIdempotencyStorage
  } = {}
) {
  const db = dbFromEnv(env);
  await maybeEnsureStorage(env, ensureStorage);

  const safeKey = validKey(key);
  const safeRequestId = validRequestId(requestId);
  const nowIso = iso(now);
  const code = safeErrorCode(errorCode);

  await db.prepare(`
    UPDATE assistant_effect_reservations
    SET
      status = 'failed',
      updated_at = ?,
      error_code = ?
    WHERE idempotency_key = ?
      AND status = 'reserved'
      AND request_id = ?
  `).bind(nowIso, code, safeKey, safeRequestId).run();

  return publicReservation(await readReservation(db, safeKey), false);
}

export function assistantIdempotencyStoragePolicy() {
  return Object.freeze({
    table: "assistant_effect_reservations",
    storesRawPii: false,
    storesTranscript: false,
    storesPromptOrModelOutput: false,
    uniqueKeyEnforcedByDatabase: true,
    supportedEffect: "lead_create",
    abandonedReservationTtlMs: ASSISTANT_IDEMPOTENCY_RESERVATION_TTL_MS,
    leadSourceOfTruth: "leads",
    runtimeMayEnsureSchema: false
  });
}
