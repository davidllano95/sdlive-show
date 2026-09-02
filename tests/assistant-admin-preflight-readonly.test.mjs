import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_STORAGE_PREFLIGHT_PATH,
  handleAssistantStoragePreflightApi
} from "../assistant-admin-preflight.js";

function request(path = ASSISTANT_STORAGE_PREFLIGHT_PATH, method = "GET") {
  return new Request(`https://sdlive.show${path}`, { method });
}

async function body(response) {
  return response.json();
}

test("non-preflight paths are ignored", async () => {
  const response = await handleAssistantStoragePreflightApi(
    request("/api/admin/leads"),
    {},
    {}
  );
  assert.equal(response, null);
});

test("preflight is GET-only and does not inspect storage for other methods", async () => {
  let inspections = 0;
  const response = await handleAssistantStoragePreflightApi(
    request(ASSISTANT_STORAGE_PREFLIGHT_PATH, "POST"),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => {
        inspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 405);
  assert.equal(inspections, 0);
  assert.equal((await body(response)).readOnly, true);
});

test("unauthenticated callers cannot inspect D1 metadata", async () => {
  let inspections = 0;
  const response = await handleAssistantStoragePreflightApi(
    request(),
    {},
    {
      verifyAdmin: async () => null,
      inspectStorage: async () => {
        inspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 401);
  assert.equal(inspections, 0);
  assert.deepEqual(await body(response), {
    ok: false,
    readOnly: true,
    error: "Unauthorized"
  });
});

test("authenticated preflight returns only readiness report and actor", async () => {
  const storage = {
    ok: true,
    readOnly: true,
    readyForAssistantLeadCapture: false,
    leads: {
      canInsertAssistantLead: false,
      reason: "legacy_type_check_blocks_assistant"
    },
    privacyConsents: {
      canRecordAssistantConsent: false,
      reason: "assistant_source_not_allowed"
    }
  };

  const response = await handleAssistantStoragePreflightApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      inspectStorage: async () => storage
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await body(response), {
    ok: true,
    readOnly: true,
    actor: "sam@sdlive.show",
    readyForAssistantLeadCapture: false,
    storage
  });
});

test("inspection failures return a generic non-schema error", async () => {
  const response = await handleAssistantStoragePreflightApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => {
        throw new Error("private D1 schema detail");
      }
    }
  );

  assert.equal(response.status, 500);
  const data = await body(response);
  assert.equal(data.ok, false);
  assert.equal(data.readOnly, true);
  assert.equal(JSON.stringify(data).includes("private D1 schema detail"), false);
});
