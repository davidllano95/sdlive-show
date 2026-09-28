import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
  bootstrapDocumentsProduction,
  documentsProductionBootstrapPolicy
} from "../documents-production-bootstrap.js";
import { DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION } from "../documents-storage.js";

function preflight(sequenceState = "absent") {
  return {
    ok: true,
    ready: true,
    series: [
      {
        ready: true,
        seriesKey: "samuel:CC",
        issuerId: "samuel-cop",
        docType: "cc",
        intendedNextValue: 21,
        intendedDisplay: "21",
        displayPattern: "{n}",
        sequenceState,
        existingNextValue: sequenceState === "existing" ? 21 : null
      },
      {
        ready: true,
        seriesKey: "samuel:INV",
        issuerId: "samuel-usd",
        docType: "invoice",
        intendedNextValue: 19,
        intendedDisplay: "0019",
        displayPattern: "{n:04}",
        sequenceState,
        existingNextValue: sequenceState === "existing" ? 19 : null
      }
    ]
  };
}

test("production bootstrap requires the exact owner confirmation", async () => {
  await assert.rejects(() => bootstrapDocumentsProduction({}, {
    actorEmail: "sam@sdlive.show",
    confirmation: "wrong",
    preflightFn: async () => preflight(),
    bootstrapFn: async () => ({ applied: true })
  }), /explicit_production_bootstrap_confirmation_required/);
});

test("production bootstrap refuses to write unless the immediate preflight is READY", async () => {
  let writes = 0;
  await assert.rejects(() => bootstrapDocumentsProduction({}, {
    actorEmail: "sam@sdlive.show",
    confirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
    preflightFn: async () => ({ ok: true, ready: false, series: [] }),
    bootstrapFn: async () => { writes += 1; return { applied: true }; }
  }), /production_preflight_not_ready/);
  assert.equal(writes, 0);
});

test("production bootstrap creates the approved CC 21 and INV 0019 configs then verifies postflight", async () => {
  let preflightCalls = 0;
  const calls = [];
  const result = await bootstrapDocumentsProduction({}, {
    actorEmail: "owner@sdlive.show",
    confirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
    now: () => "2026-09-28T04:45:00Z",
    preflightFn: async () => {
      preflightCalls += 1;
      return preflight(preflightCalls === 1 ? "absent" : "existing");
    },
    bootstrapFn: async (_env, options) => {
      calls.push(options);
      return { applied: true, nextValue: options.config.nextValue };
    }
  });

  assert.equal(preflightCalls, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((item) => item.config.seriesKey), ["samuel:CC", "samuel:INV"]);
  assert.deepEqual(calls.map((item) => item.config.issuerId), ["samuel-cop", "samuel-usd"]);
  assert.deepEqual(calls.map((item) => item.config.nextValue), [21, 19]);
  assert.deepEqual(calls.map((item) => item.config.displayPattern), ["{n}", "{n:04}"]);
  assert.equal(calls.every((item) => item.actorEmail === "owner@sdlive.show"), true);
  assert.equal(calls.every((item) => item.confirmation === DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION), true);
  assert.equal(result.ok, true);
  assert.equal(result.bootstrapped, true);
  assert.equal(result.idempotent, false);
  assert.equal(result.preflight.ready, true);
});

test("production bootstrap is idempotent when both exact real sequences already exist", async () => {
  const result = await bootstrapDocumentsProduction({}, {
    actorEmail: "owner@sdlive.show",
    confirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
    preflightFn: async () => preflight("existing"),
    bootstrapFn: async (_env, options) => ({ applied: false, nextValue: options.config.nextValue })
  });
  assert.equal(result.ok, true);
  assert.equal(result.idempotent, true);
});

test("production bootstrap fails closed if the postflight does not observe both exact sequences", async () => {
  let calls = 0;
  await assert.rejects(() => bootstrapDocumentsProduction({}, {
    actorEmail: "owner@sdlive.show",
    confirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION,
    preflightFn: async () => {
      calls += 1;
      return calls === 1 ? preflight("absent") : preflight("absent");
    },
    bootstrapFn: async (_env, options) => ({ applied: true, nextValue: options.config.nextValue })
  }), /production_bootstrap_postflight_failed/);
});

test("production bootstrap policy states the write boundary explicitly", () => {
  const policy = documentsProductionBootstrapPolicy();
  assert.equal(policy.adminOnly, true);
  assert.equal(policy.requiresExplicitOwnerConfirmation, true);
  assert.equal(policy.requiresReadyPreflightImmediatelyBeforeWrite, true);
  assert.equal(policy.writesDatabase, true);
  assert.equal(policy.writesBucket, false);
  assert.equal(policy.emitsDocument, false);
  assert.equal(policy.consumesDocumentNumber, false);
  assert.equal(policy.createsOnlyRealSequenceRows, true);
  assert.equal(policy.confirmation, DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION);
});
