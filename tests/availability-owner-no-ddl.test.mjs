import test from "node:test";
import assert from "node:assert/strict";

import { availabilityEnvWithoutPublicDdl } from "../availability-owner-control.js";

test("Availability owner runtime masks DDL but delegates normal D1 statements", async () => {
  const statements = [];
  const realDb = {
    marker: "real-db",
    prepare(sql) {
      statements.push(String(sql).trim());
      return {
        bind() { return this; },
        async run() { return { success: true, meta: { changes: 1 } }; },
        async all() { return { results: [{ ok: 1 }] }; },
        async first() { return { ok: 1 }; }
      };
    }
  };

  const runtimeEnv = availabilityEnvWithoutPublicDdl({ CMS_DB: realDb, OTHER: "kept" });
  assert.equal(runtimeEnv.OTHER, "kept");

  const ddl = await runtimeEnv.CMS_DB.prepare("CREATE TABLE should_not_run (id INTEGER)").run();
  assert.equal(ddl.meta.changes, 0);
  assert.equal(statements.length, 0);

  const query = await runtimeEnv.CMS_DB.prepare("SELECT 1").first();
  assert.equal(query.ok, 1);
  assert.deepEqual(statements, ["SELECT 1"]);
});
