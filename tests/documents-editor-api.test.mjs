import test from "node:test";
import assert from "node:assert/strict";
import { handleDocumentsEditorApi } from "../documents-admin-editor-api.js";

test("Documents editor ignores non-editor Documents routes", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/settings"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(response, null);
});

test("Documents registry fails closed when dedicated storage is unavailable", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/registry"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "documents_storage_unavailable" });
});

test("Documents draft mutations require JSON", async () => {
  const response = await handleDocumentsEditorApi(
    new Request("https://sdlive.show/api/admin/documents/drafts", { method: "POST", body: "hello" }),
    { DOCS_DB: { prepare() { throw new Error("storage_should_not_be_touched"); } } },
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { ok: false, error: "application_json_required" });
});
