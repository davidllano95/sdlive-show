import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
  bootstrapDocumentSequence,
  finalizeDocument
} from "../documents-storage.js";
import { SAMUEL_SEQUENCE_BOOTSTRAP } from "../documents-kinds.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fakeDb(initial = {}) {
  const state = {
    documents: clone(initial.documents || []),
    sequences: clone(initial.sequences || []),
    events: [],
    sources: []
  };

  function stmt(sql, params = []) {
    return {
      sql: String(sql),
      params,
      bind(...values) { return stmt(sql, values); },
      async first() {
        if (/WHERE id = \? LIMIT 1/.test(sql)) return clone(state.documents.find((row) => row.id === params[0]) || null);
        if (/WHERE finalize_key = \? LIMIT 1/.test(sql)) return clone(state.documents.find((row) => row.finalize_key === params[0]) || null);
        if (/FROM doc_sequences[\s\S]*WHERE series_key = \?/.test(sql)) return clone(state.sequences.find((row) => row.series_key === params[0]) || null);
        if (/SELECT MAX\(number\) AS max_number/.test(sql)) {
          const nums = state.documents.filter((row) => row.series_key === params[0] && row.number != null).map((row) => Number(row.number));
          return { max_number: nums.length ? Math.max(...nums) : null };
        }
        throw new Error(`Unexpected first SQL: ${sql}`);
      }
    };
  }

  return {
    state,
    prepare(sql) { return stmt(sql); },
    async batch(statements) {
      const before = clone(state);
      let changes = 0;
      try {
        for (const statement of statements) {
          const sql = statement.sql;
          const p = statement.params;
          if (/^UPDATE doc_sequences/.test(sql.trim())) {
            if (/SET next_value = next_value \+ 1/.test(sql)) {
              const row = state.sequences.find((item) => item.series_key === p[1] && Number(item.next_value) === Number(p[2]));
              changes = row ? 1 : 0;
              if (row) { row.next_value += 1; row.updated_at = p[0]; }
            } else {
              const row = state.sequences.find((item) => item.series_key === p[4] && Number(item.next_value) === Number(p[5]));
              changes = row ? 1 : 0;
              if (row) {
                row.next_value = p[0]; row.bootstrapped_at = p[1]; row.bootstrap_note = p[2]; row.updated_at = p[3];
              }
            }
            continue;
          }
          if (/^INSERT INTO doc_sequences/.test(sql.trim())) {
            if (state.sequences.some((row) => row.series_key === p[0])) throw new Error("UNIQUE constraint failed: doc_sequences.series_key");
            state.sequences.push({
              series_key: p[0], issuer_id: p[1], doc_type: p[2], next_value: p[3], display_pattern: p[4],
              is_test: 0, bootstrapped_at: p[5], bootstrap_note: p[6], updated_at: p[7]
            });
            changes = 1;
            continue;
          }
          if (/^UPDATE doc_documents[\s\S]*SET status = 'finalized'/.test(sql.trim())) {
            const row = state.documents.find((item) => item.id === p[16]);
            const seq = state.sequences.find((item) => item.series_key === p[18]);
            const eligible = row && row.status === "draft" && Number(row.draft_rev) === Number(p[17]) && seq && Number(seq.next_value) === Number(p[19]);
            changes = eligible ? 1 : 0;
            if (eligible) {
              if (state.documents.some((item) => item.id !== row.id && item.series_key === p[0] && Number(item.number) === Number(p[1]))) {
                throw new Error("UNIQUE constraint failed: doc_documents.series_key, doc_documents.number");
              }
              Object.assign(row, {
                status: "finalized", series_key: p[0], number: p[1], display_number: p[2], client_name: p[3],
                client_tax_id: p[4], project_label: p[5], po_numbers: p[6], total_minor: p[7], issue_date: p[8],
                issue_year: p[9], snapshot_json: p[10], snapshot_sha256: p[11], template_version: p[12], finalize_key: p[13],
                pdf_status: "pending", updated_at: p[14], finalized_at: p[15]
              });
            }
            continue;
          }
          if (/^INSERT INTO doc_document_events/.test(sql.trim())) {
            if (/CASE WHEN changes\(\) = 1/.test(sql) && changes !== 1) throw new Error("NOT NULL constraint failed: doc_document_events.event");
            state.events.push({ sql, params: clone(p) });
            changes = 1;
            continue;
          }
          if (/^INSERT INTO doc_document_sources/.test(sql.trim())) {
            state.sources.push({ document_id: p[0], line_id: p[1], source_system: p[2], source_ref: p[3], observed_json: p[4] });
            changes = 1;
            continue;
          }
          if (/^UPDATE doc_documents[\s\S]*SET superseded_by_id/.test(sql.trim())) {
            const row = state.documents.find((item) => item.id === p[2] && ["finalized", "void"].includes(item.status) && !item.superseded_by_id);
            changes = row ? 1 : 0;
            if (row) { row.superseded_by_id = p[0]; row.updated_at = p[1]; }
            continue;
          }
          throw new Error(`Unexpected batch SQL: ${sql}`);
        }
        return statements.map(() => ({ success: true }));
      } catch (error) {
        state.documents = before.documents;
        state.sequences = before.sequences;
        state.events = before.events;
        state.sources = before.sources;
        throw error;
      }
    }
  };
}

function draftRow() {
  return {
    id: "draft-1",
    kind_id: "cc-co-es",
    doc_type: "cc",
    issuer_id: "test",
    client_id: "client-1",
    status: "draft",
    currency: "COP",
    project_label: "Show",
    draft_rev: 3,
    draft_json: JSON.stringify({
      currency: "COP",
      issueCity: "Bogotá",
      issueDate: "2026-09-27",
      usesCostsDeductions: false,
      lines: [{ id: "l1", description: "Sound design", amountMinor: 45000000 }]
    }),
    finalize_key: null,
    supersedes_id: null
  };
}

function context() {
  return {
    issuer: { id: "test", legalName: "Test Issuer", idNumber: "CC-X" },
    client: { id: "client-1", legalName: "Test Client", taxId: "NIT-X" },
    signatureAsset: { id: "sig-test", sha256: "abc", contentType: "image/png" },
    sources: [{ lineId: "l1", sourceSystem: "registro", sourceRef: "row-1", observed: { grossMinor: 45000000 } }]
  };
}

test("finalize consumes one test number atomically and retry is idempotent", async () => {
  const db = fakeDb({
    documents: [draftRow()],
    sequences: [{ series_key: "test:CC", issuer_id: "test", doc_type: "cc", next_value: 1, display_pattern: "TEST-CC {n}", is_test: 1 }]
  });
  const env = { DOCS_DB: db };
  const options = {
    documentId: "draft-1",
    seriesKey: "test:CC",
    finalizeKey: "finalize-123456",
    actorEmail: "sam@sdlive.show",
    resolveContext: async () => context(),
    now: () => "2026-09-27T05:00:00Z"
  };
  const first = await finalizeDocument(env, options);
  assert.equal(first.finalized, true);
  assert.equal(first.idempotent, false);
  assert.equal(first.number, 1);
  assert.equal(first.displayNumber, "TEST-CC 1");
  assert.equal(db.state.sequences[0].next_value, 2);
  assert.equal(db.state.documents[0].status, "finalized");
  assert.equal(db.state.documents[0].pdf_status, "pending");
  assert.equal(db.state.sources.length, 1);

  const retry = await finalizeDocument(env, options);
  assert.equal(retry.idempotent, true);
  assert.equal(retry.number, 1);
  assert.equal(db.state.sequences[0].next_value, 2);
});

test("same finalized draft rejects a different finalize key", async () => {
  const row = draftRow();
  row.status = "finalized";
  row.finalize_key = "original-finalize";
  row.number = 1;
  row.display_number = "TEST-CC 1";
  row.snapshot_sha256 = "abc";
  const db = fakeDb({ documents: [row], sequences: [] });
  await assert.rejects(() => finalizeDocument({ DOCS_DB: db }, {
    documentId: "draft-1",
    seriesKey: "test:CC",
    finalizeKey: "different-finalize",
    actorEmail: "sam@sdlive.show",
    resolveContext: async () => context()
  }), /document_not_draft/);
});

test("real sequence bootstrap is explicit, audited and never lowers current next value", async () => {
  const db = fakeDb({ documents: [], sequences: [] });
  const env = { DOCS_DB: db };
  const config = SAMUEL_SEQUENCE_BOOTSTRAP["samuel:CC"];
  await assert.rejects(() => bootstrapDocumentSequence(env, {
    config,
    actorEmail: "sam@sdlive.show"
  }), /explicit_sequence_bootstrap_confirmation_required/);

  const created = await bootstrapDocumentSequence(env, {
    config,
    actorEmail: "sam@sdlive.show",
    confirmation: DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
    note: "approved bootstrap",
    now: () => "2026-09-27T05:00:00Z"
  });
  assert.equal(created.applied, true);
  assert.equal(created.nextValue, 21);
  assert.equal(db.state.sequences[0].is_test, 0);
  assert.equal(db.state.events.length, 1);

  const lower = await bootstrapDocumentSequence(env, {
    config: { ...config, nextValue: 20 },
    actorEmail: "sam@sdlive.show",
    confirmation: DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
    now: () => "2026-09-27T05:01:00Z"
  });
  assert.equal(lower.applied, false);
  assert.equal(lower.nextValue, 21);
});
