import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { documentsDeleteStoragePolicy } from "../documents-storage-delete.js";
import { documentsProfileDeleteStoragePolicy } from "../documents-storage-profile-delete.js";
import { documentsEditorApiPolicy } from "../documents-admin-editor-api.js";
import { documentsProfilesApiPolicy } from "../documents-admin-profiles-api.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("draft deletion is explicitly draft-only and issued deletion remains schema-blocked", () => {
  const policy = documentsDeleteStoragePolicy();
  const apiPolicy = documentsEditorApiPolicy();
  const storage = read("documents-storage-delete.js");
  const schema = read("documents-schema.js");
  const api = read("documents-admin-editor-api.js");

  assert.equal(policy.draftsOnly, true);
  assert.equal(policy.issuedDeleteBlockedBySchemaTrigger, true);
  assert.equal(apiPolicy.draftDeleteOnly, true);
  assert.match(storage, /DELETE FROM doc_documents WHERE id = \? AND status = 'draft'/);
  assert.match(storage, /draft_deleted/);
  assert.match(schema, /CREATE TRIGGER doc_no_delete_issued/);
  assert.match(schema, /WHEN OLD\.status <> 'draft'/);
  assert.match(api, /request\.method === "DELETE"/);
});

test("profile deletion never cascades into documents and refuses referenced profiles", () => {
  const policy = documentsProfileDeleteStoragePolicy();
  const apiPolicy = documentsProfilesApiPolicy();
  const source = read("documents-storage-profile-delete.js");
  const api = read("documents-admin-profiles-api.js");

  assert.equal(policy.issuerDeleteRequiresNoDocuments, true);
  assert.equal(policy.issuerDeleteRequiresNoSequences, true);
  assert.equal(policy.clientDeleteRequiresNoDocuments, true);
  assert.equal(policy.neverDeletesDocumentsImplicitly, true);
  assert.equal(apiPolicy.profileDeleteRequiresUnused, true);
  assert.equal(apiPolicy.profileDeleteNeverDeletesDocuments, true);
  assert.match(source, /issuer_profile_in_use/);
  assert.match(source, /client_profile_in_use/);
  assert.match(source, /DELETE FROM doc_signature_assets/);
  assert.doesNotMatch(source, /DELETE FROM doc_documents/);
  assert.match(api, /deleteIssuerProfileStorage/);
  assert.match(api, /deleteClientProfileStorage/);
});

test("Documents Admin exposes explicit create/delete profile and delete-draft controls", () => {
  const html = read("admin/documents/index.html");
  const management = read("admin/documents/management.js");
  const styles = read("admin/documents/management.css");

  for (const id of ["issuerProfilePicker", "newIssuerProfile", "deleteIssuerProfile", "deleteClientProfile", "deleteDraft"]) {
    assert.match(html, new RegExp(`id=\\"${id}\\"`));
  }
  assert.match(management, /Delete issuer profile/);
  assert.match(management, /Only drafts can be deleted/);
  assert.match(management, /window\.confirm/);
  assert.match(styles, /var\(--danger\)/);
  assert.doesNotMatch(styles, /#dfff69|#88a2ff/i);
});
