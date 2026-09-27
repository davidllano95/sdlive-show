import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENTS_SCHEMA_OBJECTS,
  DOCUMENTS_SCHEMA_VERSION,
  documentsSchemaDefinitions,
  documentsSchemaPolicy,
  documentsSchemaSql
} from "../documents-schema.js";

test("Documents v1 schema defines the seven canonical tables and immutable guards", () => {
  assert.equal(DOCUMENTS_SCHEMA_VERSION, "documents-v1");
  assert.equal(DOCUMENTS_SCHEMA_OBJECTS.tables.length, 7);
  assert.deepEqual(DOCUMENTS_SCHEMA_OBJECTS.tables, [
    "doc_issuer_profiles",
    "doc_signature_assets",
    "doc_client_profiles",
    "doc_sequences",
    "doc_documents",
    "doc_document_sources",
    "doc_document_events"
  ]);

  const definitions = documentsSchemaDefinitions();
  const names = new Set(definitions.map((item) => item.name));
  for (const group of Object.values(DOCUMENTS_SCHEMA_OBJECTS)) {
    for (const name of group) assert.ok(names.has(name), `missing schema object ${name}`);
  }

  const joined = definitions.map((item) => item.sql).join("\n");
  assert.match(joined, /UNIQUE \(series_key, number\)/);
  assert.match(joined, /issued_documents_are_permanent/);
  assert.match(joined, /finalized_snapshot_is_immutable/);
  assert.match(joined, /invalid_status_transition/);
  assert.match(joined, /events_are_append_only/);
  assert.match(joined, /origin TEXT NOT NULL DEFAULT 'system'/);
  assert.match(joined, /pdf_status TEXT NOT NULL DEFAULT 'none'/);
});

test("storage preparation seeds test sequences only and never real document numbers", () => {
  const joined = documentsSchemaSql().join("\n");
  assert.match(joined, /'test:CC'/);
  assert.match(joined, /'test:INV'/);
  assert.doesNotMatch(joined, /'samuel:CC'/);
  assert.doesNotMatch(joined, /'samuel:INV'/);
  assert.doesNotMatch(joined, /next_value[^\n]*21/i);
  assert.doesNotMatch(joined, /next_value[^\n]*19/i);
});

test("schema policy makes explicit preparation and private dedicated storage mandatory", () => {
  const policy = documentsSchemaPolicy();
  assert.equal(policy.ddlOnPublicTraffic, false);
  assert.equal(policy.explicitPreparationOnly, true);
  assert.equal(policy.seedsOnlyTestSequences, true);
  assert.equal(policy.seedsRealSequences, false);
  assert.equal(policy.usesCmsDb, false);
  assert.equal(policy.usesPublicMediaBucket, false);
});
