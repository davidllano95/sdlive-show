import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_LEADS_MIGRATION_CONFIRMATION,
  ASSISTANT_LEADS_MIGRATION_PATH,
  handleAssistantLeadsMigrationApi
} from "../assistant-admin-leads-migration.js";

function request({ method = "POST", confirmation = ASSISTANT_LEADS_MIGRATION_CONFIRMATION, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };
  if (method === "POST") {
    options.headers["content-type"] ||= "application/json";
    options.body = JSON.stringify({ confirmation });
  }
  return new Request(`https://sdlive.show${ASSISTANT_LEADS_MIGRATION_PATH}`, options);
}

function readiness(overrides = {}) {
  return {
    ok: true,
    readOnly: true,
    alreadyApplied: true,
    canApply: true,
    blockers: [],
    counts: { leads: 25, privacyConsents: 7, rentalRequests: 11 },
    foreignKeyViolations: 0,
    temporaryObjects: [],
    ...overrides
  };
}

const verifyAdmin = async () => ({ email: "SAM@SDLive.Show" });

test("Leads migration endpoint is POST-only", async () => {
  let called = false;
  const response = await handleAssistantLeadsMigrationApi(request({ method: "GET" }), {}, {
    verifyAdmin,
    migrate: async () => { called = true; }
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.equal(called, false);
});

test("Leads migration endpoint requires authenticated Admin", async () => {
  let called = false;
  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin: async () => null,
    migrate: async () => { called = true; }
  });

  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("Leads migration endpoint requires JSON and the exact confirmation literal", async () => {
  let called = false;
  const wrongType = new Request(`https://sdlive.show${ASSISTANT_LEADS_MIGRATION_PATH}`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "no"
  });
  const typeResponse = await handleAssistantLeadsMigrationApi(wrongType, {}, {
    verifyAdmin,
    migrate: async () => { called = true; }
  });
  assert.equal(typeResponse.status, 415);

  const confirmationResponse = await handleAssistantLeadsMigrationApi(
    request({ confirmation: "MIGRATE_ASSISTANT_LEADS_SCHEMA" }),
    {},
    { verifyAdmin, migrate: async () => { called = true; } }
  );
  assert.equal(confirmationResponse.status, 409);
  assert.equal(called, false);
});

test("blocked migration returns 409 without claiming a write", async () => {
  const before = readiness({ alreadyApplied: false, canApply: false, blockers: ["unexpected_related_schema"] });
  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin,
    migrate: async () => ({
      ok: false,
      applied: false,
      alreadyApplied: false,
      blockers: before.blockers,
      before
    })
  });

  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(body.ok, false);
  assert.equal(body.applied, false);
  assert.deepEqual(body.blockers, ["unexpected_related_schema"]);
  assert.equal(body.before.canApply, false);
});

test("successful migration is accepted only after independent post-verification", async () => {
  const before = readiness({ alreadyApplied: false, canApply: true });
  const after = readiness();
  let inspected = 0;

  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin,
    migrate: async () => ({
      ok: true,
      applied: true,
      alreadyApplied: false,
      leadsReady: true,
      before
    }),
    inspectReadiness: async () => {
      inspected += 1;
      return after;
    }
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.actor, "sam@sdlive.show");
  assert.equal(body.applied, true);
  assert.equal(body.postMigrationVerified, true);
  assert.equal(body.after.foreignKeyViolations, 0);
  assert.equal(inspected, 1);
});

test("post-verification failure is surfaced after a completed write and must not claim PASS", async () => {
  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin,
    migrate: async () => ({
      ok: true,
      applied: true,
      alreadyApplied: false,
      leadsReady: true,
      before: readiness({ alreadyApplied: false })
    }),
    inspectReadiness: async () => readiness({
      alreadyApplied: true,
      canApply: false,
      blockers: ["foreign_key_violations_present"],
      foreignKeyViolations: 1
    })
  });

  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.applied, true);
  assert.equal(body.postMigrationVerified, false);
  assert.equal(body.after.foreignKeyViolations, 1);
});

test("already-applied schema is safely idempotent with explicit confirmation", async () => {
  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin,
    migrate: async () => ({
      ok: true,
      applied: false,
      alreadyApplied: true,
      before: readiness()
    }),
    inspectReadiness: async () => readiness()
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.applied, false);
  assert.equal(body.alreadyApplied, true);
  assert.equal(body.postMigrationVerified, true);
});

test("migration exceptions return a generic 500 without leaking D1 details", async () => {
  const response = await handleAssistantLeadsMigrationApi(request(), {}, {
    verifyAdmin,
    migrate: async () => { throw new Error("secret D1 failure details"); }
  });

  const body = await response.json();
  const serialized = JSON.stringify(body);
  assert.equal(response.status, 500);
  assert.equal(body.error, "assistant_leads_schema_migration_failed");
  assert.doesNotMatch(serialized, /secret D1 failure details/);
});
