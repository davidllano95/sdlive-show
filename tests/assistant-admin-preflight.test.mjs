import test from "node:test";
import assert from "node:assert/strict";

import { handleAssistantAdminPreflight } from "../assistant-admin-preflight.js";

function request(method = "GET", path = "/api/admin/assistant/preflight") {
  return new Request(`https://sdlive.show${path}`, { method });
}

test("Assistant Admin preflight ignores unrelated routes", async () => {
  const response = await handleAssistantAdminPreflight(
    request("GET", "/api/admin/leads"),
    {},
    {}
  );
  assert.equal(response, null);
});

test("Assistant Admin preflight is GET-only and requires existing Admin auth", async () => {
  const deniedMethod = await handleAssistantAdminPreflight(
    request("POST"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );
  assert.equal(deniedMethod.status, 405);

  const unauthorized = await handleAssistantAdminPreflight(
    request(),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), {
    ok: false,
    error: "Unauthorized"
  });
});

test("Assistant Admin preflight exposes only readiness metadata from read-only inspector", async () => {
  const calls = [];
  const response = await handleAssistantAdminPreflight(
    request(),
    { CMS_DB: { marker: true } },
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      inspectStorage: async (env) => {
        calls.push(env);
        return {
          ok: true,
          readOnly: true,
          readyForAssistantLeadCapture: false,
          leads: {
            canInsert: false,
            reason: "legacy_type_check_not_proven"
          },
          privacyConsents: {
            canRecordAssistantConsent: true,
            reason: "compatible"
          }
        };
      }
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(calls.length, 1);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.readOnly, true);
  assert.equal(body.actor, "sam@sdlive.show");
  assert.equal(body.readyForAssistantLeadCapture, false);
  assert.equal(body.storage.leads.reason, "legacy_type_check_not_proven");
  assert.equal(JSON.stringify(body).includes("CREATE TABLE"), false);
});

test("Assistant Admin preflight fails closed without leaking internal errors", async () => {
  const response = await handleAssistantAdminPreflight(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectStorage: async () => {
        throw new Error("secret schema detail");
      }
    }
  );

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.readOnly, true);
  assert.equal(JSON.stringify(body).includes("secret schema detail"), false);
});
