import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_STORAGE_PREPARATION_CONFIRMATION,
  ASSISTANT_STORAGE_PREPARATION_PATH,
  handleAssistantStoragePreparationApi
} from "../assistant-admin-storage-preparation.js";

function request({ method = "POST", body, headers = {} } = {}) {
  const init = { method, headers };
  if (body !== undefined) init.body = body;
  return new Request(`https://sdlive.show${ASSISTANT_STORAGE_PREPARATION_PATH}`, init);
}

function confirmedRequest() {
  return request({
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION })
  });
}

async function jsonBody(response) {
  return response.json();
}

test("storage preparation endpoint is POST-only and Admin-only", async () => {
  const getResponse = await handleAssistantStoragePreparationApi(
    request({ method: "GET" }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(getResponse.status, 405);
  assert.equal(getResponse.headers.get("Allow"), "POST");

  const unauthenticated = await handleAssistantStoragePreparationApi(
    confirmedRequest(),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(unauthenticated.status, 401);
});

test("storage preparation requires exact one-key JSON confirmation", async () => {
  const noJson = await handleAssistantStoragePreparationApi(
    request({ body: "x" }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(noJson.status, 415);

  const wrong = await handleAssistantStoragePreparationApi(
    request({
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "NO" })
    }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(wrong.status, 409);
  assert.equal((await jsonBody(wrong)).error, "explicit_confirmation_required");

  const extraKey = await handleAssistantStoragePreparationApi(
    request({
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmation: ASSISTANT_STORAGE_PREPARATION_CONFIRMATION,
        extra: true
      })
    }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(extraKey.status, 400);
});

test("clean preparation returns compact verified production result", async () => {
  let prepareCalls = 0;
  const response = await handleAssistantStoragePreparationApi(
    confirmedRequest(),
    {},
    {
      verifyAdmin: async () => ({ email: "SAM@SDLive.Show" }),
      prepare: async () => {
        prepareCalls += 1;
        return {
          ok: true,
          applied: true,
          alreadyReady: false,
          ready: true,
          actions: ["privacy_consents", "assistant_idempotency"],
          before: {
            ready: false,
            canApply: true,
            counts: { privacyConsents: 7 },
            foreignKeyViolations: 0,
            temporaryObjects: []
          },
          after: {
            ready: true,
            canApply: true,
            counts: { privacyConsents: 7 },
            foreignKeyViolations: 0,
            temporaryObjects: []
          },
          preflight: { readyForAssistantLeadCapture: true }
        };
      }
    }
  );

  assert.equal(prepareCalls, 1);
  assert.equal(response.status, 200);
  const body = await jsonBody(response);
  assert.equal(body.ok, true);
  assert.equal(body.actor, "sam@sdlive.show");
  assert.equal(body.applied, true);
  assert.equal(body.ready, true);
  assert.deepEqual(body.actions, ["privacy_consents", "assistant_idempotency"]);
  assert.equal(body.preflight.readyForAssistantLeadCapture, true);
});

test("blocked preparation returns 409 without leaking provider details", async () => {
  const response = await handleAssistantStoragePreparationApi(
    confirmedRequest(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      prepare: async () => ({
        ok: false,
        applied: false,
        ready: false,
        actions: [],
        blockers: [{ area: "privacy_consents", reason: "unexpected_related_schema" }]
      })
    }
  );
  assert.equal(response.status, 409);
  const body = await jsonBody(response);
  assert.equal(body.ok, false);
  assert.deepEqual(body.blockers, [
    { area: "privacy_consents", reason: "unexpected_related_schema" }
  ]);
});

test("exceptions return generic 500", async () => {
  const response = await handleAssistantStoragePreparationApi(
    confirmedRequest(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      prepare: async () => { throw new Error("D1 secret detail"); }
    }
  );
  assert.equal(response.status, 500);
  const body = await jsonBody(response);
  assert.deepEqual(body, {
    ok: false,
    applied: false,
    ready: false,
    error: "assistant_storage_preparation_failed"
  });
  assert.doesNotMatch(JSON.stringify(body), /secret/i);
});
