import test from "node:test";
import assert from "node:assert/strict";

import {
  handleWhatsAppOwnerAdminApi,
  WHATSAPP_OWNER_STORAGE_CONFIRMATION
} from "../whatsapp-owner-admin.js";

function config(overrides = {}) {
  return {
    WHATSAPP_OWNER_CONTROL_ENABLED: "false",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-secret",
    WHATSAPP_APP_SECRET: "app-secret",
    WHATSAPP_PHONE_NUMBER_ID: "123456789",
    WHATSAPP_ACCESS_TOKEN: "token-secret",
    WHATSAPP_OWNER_NUMBER: "+57 300 111 2233",
    WHATSAPP_OWNER_ACTOR_EMAIL: "owner@sdlive.show",
    WHATSAPP_GRAPH_API_VERSION: "v26.0",
    ...overrides
  };
}

const verifyAdmin = async () => ({ email: "sam@sdlive.show" });

test("readiness is Admin-only and reports booleans/names without secret values", async () => {
  const request = new Request("https://sdlive.show/api/admin/whatsapp-owner/readiness");
  const response = await handleWhatsAppOwnerAdminApi(request, config(), {
    verifyAdmin,
    inspectStorage: async () => ({ ready: true, bindingReady: true, tableReady: true, blockers: [] })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.readyForActivation, true);
  assert.equal(body.active, false);
  assert.equal(body.publicExposure.enabled, false);
  assert.deepEqual(body.runtime.missingBindings, []);
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /verify-secret|app-secret|token-secret|573001112233/);
});

test("readiness identifies missing configuration without echoing values", async () => {
  const request = new Request("https://sdlive.show/api/admin/whatsapp-owner/readiness");
  const response = await handleWhatsAppOwnerAdminApi(request, config({
    WHATSAPP_ACCESS_TOKEN: "",
    WHATSAPP_OWNER_ACTOR_EMAIL: ""
  }), {
    verifyAdmin,
    inspectStorage: async () => ({ ready: false, bindingReady: true, tableReady: false, blockers: ["whatsapp_owner_messages_missing_or_invalid"] })
  });
  const body = await response.json();
  assert.equal(body.readyForActivation, false);
  assert.deepEqual(body.runtime.missingBindings.sort(), [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_OWNER_ACTOR_EMAIL"
  ]);
});

test("storage preparation requires authenticated Admin and explicit confirmation", async () => {
  const url = "https://sdlive.show/api/admin/whatsapp-owner/storage-prepare";
  const unauthorized = await handleWhatsAppOwnerAdminApi(new Request(url, { method: "POST" }), config(), {
    verifyAdmin: async () => null,
    prepareStorage: async () => { throw new Error("should not run"); }
  });
  assert.equal(unauthorized.status, 401);

  let prepared = 0;
  const invalid = await handleWhatsAppOwnerAdminApi(new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "NO" })
  }), config(), {
    verifyAdmin,
    prepareStorage: async () => { prepared += 1; return { ok: true }; }
  });
  assert.equal(invalid.status, 409);
  assert.equal(prepared, 0);

  const valid = await handleWhatsAppOwnerAdminApi(new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: WHATSAPP_OWNER_STORAGE_CONFIRMATION })
  }), config(), {
    verifyAdmin,
    prepareStorage: async () => {
      prepared += 1;
      return {
        ok: true,
        applied: true,
        ready: true,
        actions: ["created_whatsapp_owner_messages"],
        blockers: [],
        before: { ready: false },
        after: { ready: true }
      };
    }
  });
  assert.equal(valid.status, 200);
  assert.equal(prepared, 1);
  assert.equal((await valid.json()).ready, true);
});
