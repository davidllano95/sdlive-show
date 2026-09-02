import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_LEADS_MIGRATION_READINESS_DETAIL,
  ASSISTANT_STORAGE_PREFLIGHT_PATH,
  handleAssistantStoragePreflightApi
} from "../assistant-admin-preflight.js";

function request(detail = null, method = "GET") {
  const url = new URL(`https://sdlive.show${ASSISTANT_STORAGE_PREFLIGHT_PATH}`);
  if (detail) url.searchParams.set("detail", detail);
  return new Request(url, { method });
}

async function body(response) {
  return response.json();
}

test("exact Leads migration readiness detail stays authenticated and read-only", async () => {
  let readinessInspections = 0;
  let rawSchemaInspections = 0;
  const readiness = {
    ok: true,
    readOnly: true,
    alreadyApplied: false,
    canApply: true,
    blockers: [],
    counts: { leads: 12, privacyConsents: 10, rentalRequests: 4 },
    foreignKeyViolations: 0,
    temporaryObjects: [],
    plannedChange: { addLeadType: "assistant", makeEmailNullable: true }
  };

  const response = await handleAssistantStoragePreflightApi(
    request(ASSISTANT_LEADS_MIGRATION_READINESS_DETAIL),
    {},
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      inspectStorage: async () => ({ readyForAssistantLeadCapture: false }),
      inspectLeadsMigration: async () => {
        rawSchemaInspections += 1;
        return {};
      },
      inspectLeadsMigrationReadiness: async () => {
        readinessInspections += 1;
        return readiness;
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const data = await body(response);
  assert.equal(data.actor, "sam@sdlive.show");
  assert.deepEqual(data.migrationReadiness, readiness);
  assert.equal(readinessInspections, 1);
  assert.equal(rawSchemaInspections, 0);
});

test("normal preflight does not run exact migration readiness", async () => {
  let readinessInspections = 0;
  const response = await handleAssistantStoragePreflightApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => ({ readyForAssistantLeadCapture: false }),
      inspectLeadsMigrationReadiness: async () => {
        readinessInspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(readinessInspections, 0);
  const data = await body(response);
  assert.equal("migrationReadiness" in data, false);
});

test("POST remains forbidden even for the readiness detail", async () => {
  let storageInspections = 0;
  let readinessInspections = 0;
  const response = await handleAssistantStoragePreflightApi(
    request(ASSISTANT_LEADS_MIGRATION_READINESS_DETAIL, "POST"),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => {
        storageInspections += 1;
        return {};
      },
      inspectLeadsMigrationReadiness: async () => {
        readinessInspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 405);
  assert.equal(storageInspections, 0);
  assert.equal(readinessInspections, 0);
  assert.equal((await body(response)).readOnly, true);
});
