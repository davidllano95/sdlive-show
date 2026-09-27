import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENTS_STORAGE_PREFLIGHT_PATH,
  DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION,
  DOCUMENTS_STORAGE_PREPARATION_PATH,
  handleDocumentsStorageApi
} from "../documents-admin-storage-preparation.js";

const verifyAdmin = async () => ({ email: "SAM@SDLIVE.SHOW" });

async function body(response) {
  return response.json();
}

test("Documents storage API ignores unrelated paths", async () => {
  const response = await handleDocumentsStorageApi(
    new Request("https://sdlive.show/api/admin/other"),
    {},
    { verifyAdmin }
  );
  assert.equal(response, null);
});

test("storage routes require authenticated Admin before exposing readiness", async () => {
  const response = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREFLIGHT_PATH}`),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await body(response), { ok: false, error: "Unauthorized" });
});

test("preflight is GET-only and missing storage fails closed with 503", async () => {
  const method = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREFLIGHT_PATH}`, { method: "POST" }),
    {},
    { verifyAdmin }
  );
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET");

  const unavailable = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREFLIGHT_PATH}`),
    {},
    {
      verifyAdmin,
      inspect: async () => ({
        ok: false,
        available: false,
        ready: false,
        blockers: [{ area: "DOCS_DB", reason: "binding_unavailable" }]
      })
    }
  );
  assert.equal(unavailable.status, 503);
  const payload = await body(unavailable);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "documents_storage_unavailable");
});

test("read-only preflight returns readiness and normalized actor", async () => {
  const response = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREFLIGHT_PATH}`),
    {},
    {
      verifyAdmin,
      inspect: async () => ({
        ok: true,
        readOnly: true,
        available: true,
        ready: false,
        canPrepare: true,
        blockers: []
      })
    }
  );
  assert.equal(response.status, 200);
  const payload = await body(response);
  assert.equal(payload.actor, "sam@sdlive.show");
  assert.equal(payload.readOnly, true);
  assert.equal(payload.canPrepare, true);
});

test("preparation is POST JSON-only with one exact confirmation key", async () => {
  const wrongMethod = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`),
    {},
    { verifyAdmin }
  );
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "POST");

  const wrongType = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      body: JSON.stringify({ confirmation: DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION })
    }),
    {},
    { verifyAdmin }
  );
  assert.equal(wrongType.status, 415);

  const extraKey = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirmation: DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION,
        extra: true
      })
    }),
    {},
    { verifyAdmin }
  );
  assert.equal(extraKey.status, 400);

  const wrongPhrase = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DO_IT" })
    }),
    {},
    { verifyAdmin }
  );
  assert.equal(wrongPhrase.status, 409);
});

test("confirmed preparation returns success or bounded blocker without broadening writes", async () => {
  let prepareCalls = 0;
  const success = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION })
    }),
    {},
    {
      verifyAdmin,
      prepare: async () => {
        prepareCalls += 1;
        return {
          ok: true,
          applied: true,
          alreadyReady: false,
          ready: true,
          blockers: [],
          before: { ready: false },
          after: { ready: true }
        };
      }
    }
  );
  assert.equal(success.status, 200);
  assert.equal(prepareCalls, 1);
  const successBody = await body(success);
  assert.equal(successBody.applied, true);
  assert.equal(successBody.ready, true);

  const blocked = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION })
    }),
    {},
    {
      verifyAdmin,
      prepare: async () => ({
        ok: false,
        applied: false,
        ready: false,
        blockers: [{ area: "DOCS_DB", reason: "unexpected_documents_schema" }]
      })
    }
  );
  assert.equal(blocked.status, 409);
  const blockedBody = await body(blocked);
  assert.equal(blockedBody.ok, false);
  assert.equal(blockedBody.blockers[0].reason, "unexpected_documents_schema");
});

test("preparation reports missing dedicated storage as 503", async () => {
  const response = await handleDocumentsStorageApi(
    new Request(`https://sdlive.show${DOCUMENTS_STORAGE_PREPARATION_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: DOCUMENTS_STORAGE_PREPARATION_CONFIRMATION })
    }),
    {},
    {
      verifyAdmin,
      prepare: async () => ({
        ok: false,
        error: "documents_storage_unavailable",
        before: { available: false }
      })
    }
  );
  assert.equal(response.status, 503);
  const payload = await body(response);
  assert.equal(payload.error, "documents_storage_unavailable");
});
