import test from "node:test";
import assert from "node:assert/strict";

import { createLeadCoreRecord } from "../lead-core-create.js";

const compatibility = {
  ok: true,
  source: "assistant",
  canInsert: true,
  reason: "compatible",
  legacyEmailRequired: false,
  columns: [
    "id",
    "type",
    "status",
    "name",
    "email",
    "message",
    "language",
    "market",
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
  ]
};

function lead(status) {
  return {
    source: "assistant",
    status,
    serviceCategory: "live",
    language: "es",
    market: "colombia",
    name: "Pipeline QA",
    contact: {
      email: "qa@example.com",
      preferredChannel: "email"
    },
    summary: "Assistant pipeline policy QA"
  };
}

test("Assistant direct creation refuses a pre-advanced pipeline status", async () => {
  let writes = 0;
  const env = {
    CMS_DB: {
      prepare() {
        writes += 1;
        throw new Error("Assistant must not write a pre-advanced lead");
      }
    }
  };

  await assert.rejects(
    () => createLeadCoreRecord(env, lead("quoted"), {
      preflight: async () => compatibility
    }),
    /must start in New status/
  );

  assert.equal(writes, 0);
});
