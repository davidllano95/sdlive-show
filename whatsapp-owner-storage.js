export const WHATSAPP_OWNER_MESSAGES_TABLE = "whatsapp_owner_messages";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS whatsapp_owner_messages (
    message_id TEXT PRIMARY KEY,
    from_number TEXT NOT NULL,
    command_text TEXT,
    command_status TEXT NOT NULL DEFAULT 'received' CHECK (command_status IN ('received', 'processed')),
    response_text TEXT,
    reply_status TEXT NOT NULL DEFAULT 'pending' CHECK (reply_status IN ('pending', 'sent')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    replied_at TEXT
  )
`;

function databaseFromEnv(env) {
  const db = env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error("CMS_DB binding is missing");
  }
  return db;
}

export async function inspectWhatsAppOwnerStorage(env) {
  let db;
  try {
    db = databaseFromEnv(env);
  } catch {
    return {
      ready: false,
      bindingReady: false,
      tableReady: false,
      blockers: ["cms_db_missing"]
    };
  }

  try {
    await db.prepare(`
      SELECT
        message_id,
        from_number,
        command_text,
        command_status,
        response_text,
        reply_status,
        created_at,
        processed_at,
        replied_at
      FROM whatsapp_owner_messages
      LIMIT 0
    `).all();

    return {
      ready: true,
      bindingReady: true,
      tableReady: true,
      blockers: []
    };
  } catch {
    return {
      ready: false,
      bindingReady: true,
      tableReady: false,
      blockers: ["whatsapp_owner_messages_missing_or_invalid"]
    };
  }
}

/**
 * Explicit schema preparation. This function is only mounted behind the
 * authenticated Admin API. Public webhook traffic must never call it.
 */
export async function prepareWhatsAppOwnerStorage(env) {
  const before = await inspectWhatsAppOwnerStorage(env);
  if (before.ready) {
    return {
      ok: true,
      applied: false,
      alreadyReady: true,
      ready: true,
      actions: [],
      blockers: [],
      before,
      after: before
    };
  }

  const db = databaseFromEnv(env);
  await db.prepare(CREATE_TABLE_SQL).run();
  const after = await inspectWhatsAppOwnerStorage(env);

  return {
    ok: after.ready,
    applied: after.ready,
    alreadyReady: false,
    ready: after.ready,
    actions: after.ready ? ["created_whatsapp_owner_messages"] : [],
    blockers: after.blockers,
    before,
    after
  };
}

/**
 * Runtime idempotency store. Deliberately contains no DDL. If preparation has
 * not been completed, D1 throws and the webhook fails closed/retryable.
 */
export function createD1OwnerMessageStore(env) {
  const db = databaseFromEnv(env);

  return {
    async claim(message) {
      const result = await db.prepare(`
        INSERT OR IGNORE INTO whatsapp_owner_messages (
          message_id,
          from_number,
          command_text
        ) VALUES (?, ?, ?)
      `).bind(message.id, message.from, message.text || null).run();

      const row = await db.prepare(`
        SELECT
          message_id,
          from_number,
          command_text,
          command_status,
          response_text,
          reply_status,
          created_at,
          processed_at,
          replied_at
        FROM whatsapp_owner_messages
        WHERE message_id = ?
        LIMIT 1
      `).bind(message.id).first();

      return {
        isNew: Number(result?.meta?.changes || 0) > 0,
        row
      };
    },

    async markProcessed(messageId, responseText) {
      await db.prepare(`
        UPDATE whatsapp_owner_messages
        SET
          command_status = 'processed',
          response_text = ?,
          processed_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).bind(responseText, messageId).run();
    },

    async markReplied(messageId) {
      await db.prepare(`
        UPDATE whatsapp_owner_messages
        SET
          reply_status = 'sent',
          replied_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).bind(messageId).run();
    }
  };
}
