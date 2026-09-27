import test from "node:test";
import assert from "node:assert/strict";

import {
  TEST_SEQUENCE_CONFIRMATION,
  ensureTestDocumentSequences,
  uploadPrivateSignature
} from "../documents-profiles.js";
import { handleDocumentsProfilesApi } from "../documents-admin-profiles-api.js";

function fakeSignatureEnv() {
  const state = { signature: null, activeSignatureId: null, object: null };
  function statement(sql, params = []) {
    return {
      sql: String(sql),
      params,
      bind(...values) { return statement(sql, values); },
      async first() {
        if (/SELECT id, active_signature_id FROM doc_issuer_profiles/.test(sql)) {
          return { id: "test", active_signature_id: state.activeSignatureId };
        }
        if (/SELECT \* FROM doc_signature_assets WHERE id = \?/.test(sql)) return state.signature;
        throw new Error(`Unexpected first SQL: ${sql}`);
      }
    };
  }
  const DOCS_DB = {
    prepare(sql) { return statement(sql); },
    async batch(statements) {
      for (const item of statements) {
        if (/INSERT INTO doc_signature_assets/.test(item.sql)) {
          const [id, issuerId, key, hash, widthPx, heightPx, createdAt] = item.params;
          state.signature = {
            id,
            issuer_id: issuerId,
            r2_key: key,
            content_type: "image/png",
            sha256: hash,
            width_px: widthPx,
            height_px: heightPx,
            created_at: createdAt,
            retired_at: null
          };
        } else if (/UPDATE doc_issuer_profiles SET active_signature_id/.test(item.sql)) {
          state.activeSignatureId = item.params[0];
        }
      }
      return statements.map(() => ({ success: true }));
    }
  };
  const DOCS_BUCKET = {
    async put(key, data, options) { state.object = { key, data, options }; },
    async delete() {}
  };
  return { env: { DOCS_DB, DOCS_BUCKET }, state };
}

function fakeSequenceEnv() {
  const rows = [];
  function statement(sql, params = []) {
    const statementText = String(sql);
    return {
      sql: statementText,
      params,
      bind(...values) { return statement(statementText, values); },
      async first() {
        if (statementText.includes("SELECT * FROM doc_sequences") && statementText.includes("WHERE series_key = ?")) {
          return rows.find((row) => row.series_key === params[0]) || null;
        }
        throw new Error(`Unexpected first SQL: ${statementText}`);
      },
      async all() {
        if (statementText.includes("FROM doc_sequences") && statementText.includes("ORDER BY is_test DESC")) {
          return { results: rows };
        }
        throw new Error(`Unexpected all SQL: ${statementText}`);
      },
      async run() {
        if (statementText.includes("INSERT INTO doc_sequences")) {
          rows.push({
            series_key: params[0], issuer_id: params[1], doc_type: params[2], next_value: params[3],
            display_pattern: params[4], is_test: 1, bootstrapped_at: null, bootstrap_note: null,
            updated_at: params[5]
          });
          return { success: true };
        }
        throw new Error(`Unexpected run SQL: ${statementText}`);
      }
    };
  }
  return { env: { DOCS_DB: { prepare(sql) { return statement(sql); } } }, rows };
}

test("signature upload hashes raw PNG bytes and never returns a bucket key", async () => {
  const { env, state } = fakeSignatureEnv();
  const bytes = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const expectedDigest = await crypto.subtle.digest("SHA-256", bytes);
  const expected = Array.from(new Uint8Array(expectedDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  const result = await uploadPrivateSignature(env, {
    issuerId: "test",
    bytes,
    contentType: "image/png",
    now: () => "2026-09-27T06:00:00Z"
  });

  assert.equal(result.sha256, expected);
  assert.equal(result.private, true);
  assert.equal("r2Key" in result, false);
  assert.equal("url" in result, false);
  assert.equal(state.object.options.httpMetadata.cacheControl, "private, no-store");
  assert.match(state.object.key, /^signatures\/test\/sig-[0-9a-f-]+\.png$/);
  assert.equal(state.object.options.customMetadata.sha256, expected);
});

test("test-sequence ensure can create only test:CC and test:INV", async () => {
  const { env, rows } = fakeSequenceEnv();
  await assert.rejects(
    () => ensureTestDocumentSequences(env, { confirmation: "WRONG" }),
    /explicit_test_sequence_confirmation_required/
  );
  const result = await ensureTestDocumentSequences(env, {
    confirmation: TEST_SEQUENCE_CONFIRMATION,
    now: () => "2026-09-27T06:00:00Z"
  });
  assert.equal(result.ok, true);
  assert.deepEqual(rows.map((row) => row.series_key).sort(), ["test:CC", "test:INV"]);
  assert.equal(rows.some((row) => row.series_key.startsWith("samuel:")), false);
  assert.equal(rows.every((row) => row.is_test === 1), true);
});

test("signature API exposes specific validation errors without touching storage", async () => {
  const response = await handleDocumentsProfilesApi(
    new Request("https://sdlive.show/api/admin/documents/signatures/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { ok: false, error: "multipart_form_required" });
});
