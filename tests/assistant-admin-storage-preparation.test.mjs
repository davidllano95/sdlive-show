import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_STORAGE_PREPARATION_CONFIRMATION,
  ASSISTANT_STORAGE_PREPARATION_PATH,
  handleAssistantStoragePreparationApi
} from "../assistant-admin-storage-preparation.js";

function request({ method = "POST", body, contentType = "application/json" } = {}) {
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  return new Request(`https://sdlive.show${ASSISTANT_STORAGE_PREPARATION_PATH}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function json(response) {
  return response.json();
}

test("storage preparation route ignores unrelated paths", async () => {
  const response = await handleAssistantStoragePreparationApi(
    new Request("https://sdlive.show/api/admin/assistant/other", { method: "POST" }),
    {},
    {}
  );
  assert.equal(response, null);
});

test("storage preparation is POST-only", async () => {
  const response = await handleAssistantStoragePreparationApi(
    request({ method: "GET" }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

test("storage preparation requires authenticated Admin", async () => {
  const response = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION } }),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 401);
  assert.equal((await json(response)).error, "Unauthorized");
});

test("storage preparation requires JSON and exact explicit confirmation", async () => {
  const verifyAdmin = async () => ({ email: "SAM@SDLIVE.SHOW" });

  const wrongType = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION }, contentType: "text/plain" }),
    {},
    { verifyAdmin }
  );
  assert.equal(wrongType.status, 415);
  assert.equal((await json(wrongType)).error, "application_json_required");

  const wrongValue = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: "yes" } }),
    {},
    { verifyAdmin }
  );
  assert.equal(wrongValue.status, 409);
  assert.equal((await json(wrongValue)).error, "explicit_confirmation_required");

  const extraField = await handleAssistantStoragePreparationApi(
    request({ body: {
      confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION,
      force: true
    } }),
    {},
    { verifyAdmin }
  );
  assert.equal(extraField.status, 400);
  assert.equal((await json(extraField)).error, "invalid_confirmation_payload");
});

test("confirmed Admin request returns normalized actor and preparation result", async () => {
  let prepareCalls = 0;
  const response = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION } }),
    { CMS_DB: {} },
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      prepare: async () => {
        prepareCalls += 1;
        return {
          ok: true,
          applied: true,
          ready: true,
          manualMigrationRequired: false,
          actions: ["privacy_consents", "assistant_idempotency"],
          blockers: [],
          after: { readyForAssistantLeadCapture: true }
        };
      }
    }
  );

  assert.equal(response.status, 200);
  const payload = await json(response);
  assert.equal(prepareCalls, 1);
  assert.equal(payload.ok, true);
  assert.equal(payload.actor, "sam@sdlive.show");
  assert.equal(payload.applied, true);
  assert.equal(payload.ready, true);
  assert.deepEqual(payload.actions, ["privacy_consents", "assistant_idempotency"]);
  assert.deepEqual(payload.preflight, { readyForAssistantLeadCapture: true });
});

test("blocked preparation returns 409 and never claims success", async () => {
  const response = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION } }),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      prepare: async () => ({
        ok: false,
        applied: false,
        ready: false,
        manualMigrationRequired: true,
        actions: [],
        blockers: [{ area: "leads", reason: "legacy_email_required" }],
        before: { readyForAssistantLeadCapture: false }
      })
    }
  );

  assert.equal(response.status, 409);
  const payload = await json(response);
  assert.equal(payload.ok, false);
  assert.equal(payload.applied, false);
  assert.equal(payload.manualMigrationRequired, true);
  assert.deepEqual(payload.blockers, [
    { area: "leads", reason: "legacy_email_required" }
  ]);
});

test("unexpected preparation failures are generic and do not expose internals", async () => {
  const response = await handleAssistantStoragePreparationApi(
    request({ body: { confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION } }),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      prepare: async () => {
        throw new Error("D1 secret internal detail");
      }
    }
  );

  assert.equal(response.status, 500);
  const payload = await json(response);
  assert.deepEqual(payload, {
    ok: false,
    applied: false,
    ready: false,
    error: "assistant_storage_preparation_failed"
  });
  assert.equal(JSON.stringify(payload).includes("D1 secret internal detail"), false);
});
