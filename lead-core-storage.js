import { normalizeLeadCoreInput } from "./lead-core.js";

const LEAD_CORE_COLUMNS = Object.freeze([
  ["source", "TEXT"],
  ["service_category", "TEXT"],
  ["preferred_contact_channel", "TEXT"],
  ["contact_phone", "TEXT"],
  ["contact_whatsapp", "TEXT"],
  ["contact_other", "TEXT"],
  ["project_date", "TEXT"],
  ["project_city", "TEXT"],
  ["project_venue", "TEXT"],
  ["details_json", "TEXT"],
  ["updated_at", "TEXT"]
]);

const schemaPromises = new WeakMap();

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

function pragmaColumnNames(result) {
  const rows = Array.isArray(result?.results) ? result.results : [];
  return new Set(
    rows
      .map((row) => String(row?.name || "").trim())
      .filter(Boolean)
  );
}

function isDuplicateColumnError(error) {
  return /duplicate column name/i.test(String(error?.message || error || ""));
}

async function addMissingColumns(db, names) {
  for (const [name, definition] of LEAD_CORE_COLUMNS) {
    if (names.has(name)) continue;

    try {
      await db
        .prepare(`ALTER TABLE leads ADD COLUMN ${name} ${definition}`)
        .run();
    } catch (error) {
      // Separate Worker isolates can race on first-use schema evolution. If
      // another isolate added this exact hard-coded column first, continuing is
      // safe. Any other migration failure must still surface.
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  }
}

async function backfillCanonicalDefaults(db) {
  await db
    .prepare(`
      UPDATE leads
      SET
        source = COALESCE(NULLIF(TRIM(source), ''), type),
        service_category = COALESCE(
          NULLIF(TRIM(service_category), ''),
          CASE
            WHEN COALESCE(NULLIF(TRIM(source), ''), type) = 'rental'
              THEN 'rental'
            ELSE 'other'
          END
        ),
        preferred_contact_channel = COALESCE(
          NULLIF(TRIM(preferred_contact_channel), ''),
          CASE
            WHEN email IS NOT NULL AND TRIM(email) <> '' THEN 'email'
            ELSE NULL
          END
        ),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE
        source IS NULL OR TRIM(source) = '' OR
        service_category IS NULL OR TRIM(service_category) = '' OR
        preferred_contact_channel IS NULL OR TRIM(preferred_contact_channel) = '' OR
        updated_at IS NULL
    `)
    .run();
}

/**
 * Idempotently evolves the existing `leads` table into Lead Core storage.
 *
 * `message` deliberately remains the physical storage for canonical `summary`
 * during this compatibility phase, so no duplicate summary column is created.
 */
export async function ensureLeadCoreStorageSchema(env) {
  const db = databaseFromEnv(env);

  if (schemaPromises.has(db)) {
    return schemaPromises.get(db);
  }

  const promise = (async () => {
    const tableInfo = await db
      .prepare("PRAGMA table_info(leads)")
      .all();

    const names = pragmaColumnNames(tableInfo);
    if (names.size === 0) {
      throw new Error("leads table is missing");
    }

    await addMissingColumns(db, names);
    await backfillCanonicalDefaults(db);

    return {
      ok: true,
      columns: LEAD_CORE_COLUMNS.map(([name]) => name)
    };
  })().catch((error) => {
    schemaPromises.delete(db);
    throw error;
  });

  schemaPromises.set(db, promise);
  return promise;
}

/**
 * Enrich one already-created legacy lead row with canonical Lead Core fields.
 * Existing Contact/Rental columns are not rewritten here.
 */
export async function persistLeadCoreFields(env, leadId, value) {
  const id = Number(leadId);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error("leadId must be a positive integer");
  }

  const lead = normalizeLeadCoreInput(value);
  const detailsJson = JSON.stringify(lead.details);

  await ensureLeadCoreStorageSchema(env);

  const result = await databaseFromEnv(env)
    .prepare(`
      UPDATE leads
      SET
        source = ?,
        service_category = ?,
        preferred_contact_channel = ?,
        contact_phone = ?,
        contact_whatsapp = ?,
        contact_other = ?,
        project_date = ?,
        project_city = ?,
        project_venue = ?,
        details_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      lead.source,
      lead.serviceCategory,
      lead.contact.preferredChannel,
      lead.contact.phone,
      lead.contact.whatsapp,
      lead.contact.other,
      lead.project.date,
      lead.project.city,
      lead.project.venue,
      detailsJson,
      id
    )
    .run();

  return {
    ok: true,
    leadId: id,
    result
  };
}

/**
 * Persist canonical fields only when an established public form handler has
 * already succeeded and returned its real D1 `leadId`.
 *
 * The response is cloned so this enrichment never consumes or rewrites the
 * public response body.
 */
export async function persistLeadCoreFromPublicResponse(env, response, lead) {
  if (!lead || !response?.ok) return false;

  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return false;

  const payload = await response.clone().json().catch(() => null);
  const leadId = Number(payload?.leadId);

  if (!Number.isInteger(leadId) || leadId < 1) {
    return false;
  }

  await persistLeadCoreFields(env, leadId, lead);
  return true;
}
