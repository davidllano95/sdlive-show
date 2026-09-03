import test from "node:test";
import assert from "node:assert/strict";

import {
  createD1OwnerMessageStore,
  inspectWhatsAppOwnerStorage,
  prepareWhatsAppOwnerStorage
} from "../whatsapp-owner-storage.js";

function preparationDb() {
  let created = false;
  const statements = [];
  return {
    statements,
    prepare(sql) {
      const normalized = String(sql).replace(/\s+/g, " ").trim();
      statements.push(normalized);
      return {
        async all() {
          if (!created && /FROM whatsapp_owner_messages/i.test(normalized)) {
            throw new Error("no such table");
          }
          return { results: [] };
        },
        async run() {
          if (/^CREATE TABLE IF NOT EXISTS whatsapp_owner_messages/i.test(normalized)) {
            created = true;
          }
          return { success: true, meta: { changes: 0 } };
        }
      };
    }
  };
}

test("storage inspection is read-only and preparation performs explicit DDL", async () => {
  const db = preparationDb();
  const before = await inspectWhatsAppOwnerStorage({ CMS_DB: db });
  assert.equal(before.ready, false);
  assert.equal(db.statements.some((sql) => /^CREATE TABLE/i.test(sql)), false);

  const prepared = await prepareWhatsAppOwnerStorage({ CMS_DB: db });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.ready, true);
  assert.equal(prepared.applied, true);
  assert.equal(db.statements.some((sql) => /^CREATE TABLE IF NOT EXISTS whatsapp_owner_messages/i.test(sql)), true);

  const second = await prepareWhatsAppOwnerStorage({ CMS_DB: db });
  assert.equal(second.ok, true);
  assert.equal(second.alreadyReady, true);
  assert.equal(second.applied, false);
});

test("runtime idempotency store never attempts schema creation", async () => {
  const statements = [];
  const row = {
    message_id: "wamid.1",
    from_number: "573001112233",
    command_text: "status",
    command_status: "received",
    response_text: null,
    reply_status: "pending"
  };
  const db = {
    prepare(sql) {
      const normalized = String(sql).replace(/\s+/g, " ").trim();
      statements.push(normalized);
      return {
        bind() {
          return {
            async run() { return { meta: { changes: 1 } }; },
            async first() { return row; }
          };
        }
      };
    }
  };

  const store = createD1OwnerMessageStore({ CMS_DB: db });
  const claimed = await store.claim({ id: "wamid.1", from: "573001112233", text: "status" });
  assert.equal(claimed.isNew, true);
  assert.equal(claimed.row.message_id, "wamid.1");
  assert.equal(statements.some((sql) => /CREATE\s+TABLE/i.test(sql)), false);
});

test("storage inspection fails closed when CMS_DB is unavailable", async () => {
  const result = await inspectWhatsAppOwnerStorage({});
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["cms_db_missing"]);
});
