import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_LEADS_MIGRATION_DETAIL,
  ASSISTANT_STORAGE_PREFLIGHT_PATH,
  handleAssistantStoragePreflightApi
} from "../assistant-admin-preflight.js";

function request(detail = null) {
  const url = new URL(`https://sdlive.show${ASSISTANT_STORAGE_PREFLIGHT_PATH}`);
  if (detail) url.searchParams.set("detail", detail);
  return new Request(url);
}

test("normal preflight does not run migration metadata probe", async () => {
  let migrationInspections = 0;

  const response = await handleAssistantStoragePreflightApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => ({ readyForAssistantLeadCapture: false }),
      inspectLeadsMigration: async () => {
        migrationInspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(migrationInspections, 0);
  const data = await response.json();
  assert.equal("migrationPrecheck" in data, false);
});

test("authenticated migration detail adds only the explicit read-only probe result", async () => {
  let migrationInspections = 0;
  const migrationPrecheck = {
    ok: true,
    readOnly: true,
    columns: [{ name: "email", notNull: true }],
    tableSql: "CREATE TABLE leads (...) ",
    relatedSchema: []
  };

  const response = await handleAssistantStoragePreflightApi(
    request(ASSISTANT_LEADS_MIGRATION_DETAIL),
    {},
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      inspectStorage: async () => ({
        readyForAssistantLeadCapture: false,
        leads: { reason: "legacy_type_check_blocks_assistant" }
      }),
      inspectLeadsMigration: async () => {
        migrationInspections += 1;
        return migrationPrecheck;
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(migrationInspections, 1);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const data = await response.json();
  assert.equal(data.actor, "sam@sdlive.show");
  assert.deepEqual(data.migrationPrecheck, migrationPrecheck);
});

test("unauthenticated migration detail cannot inspect schema metadata", async () => {
  let storageInspections = 0;
  let migrationInspections = 0;

  const response = await handleAssistantStoragePreflightApi(
    request(ASSISTANT_LEADS_MIGRATION_DETAIL),
    {},
    {
      verifyAdmin: async () => null,
      inspectStorage: async () => {
        storageInspections += 1;
        return {};
      },
      inspectLeadsMigration: async () => {
        migrationInspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 401);
  assert.equal(storageInspections, 0);
  assert.equal(migrationInspections, 0);
});
