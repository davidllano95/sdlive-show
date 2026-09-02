import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_RUNTIME_READINESS_PATH,
  handleAssistantRuntimeReadinessApi
} from "../assistant-admin-readiness.js";

function request(path = ASSISTANT_RUNTIME_READINESS_PATH, method = "GET") {
  return new Request(`https://sdlive.show${path}`, { method });
}

async function body(response) {
  return response.json();
}

test("non-readiness paths are ignored", async () => {
  const response = await handleAssistantRuntimeReadinessApi(
    request("/api/admin/leads"),
    {},
    {}
  );
  assert.equal(response, null);
});

test("runtime readiness is GET-only and never inspects on unsupported methods", async () => {
  let inspections = 0;
  const response = await handleAssistantRuntimeReadinessApi(
    request(ASSISTANT_RUNTIME_READINESS_PATH, "POST"),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectRuntime: async () => {
        inspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
  assert.equal(inspections, 0);
});

test("unauthenticated callers cannot inspect runtime configuration", async () => {
  let inspections = 0;
  const response = await handleAssistantRuntimeReadinessApi(
    request(),
    {},
    {
      verifyAdmin: async () => null,
      inspectRuntime: async () => {
        inspections += 1;
        return {};
      }
    }
  );

  assert.equal(response.status, 401);
  assert.equal(inspections, 0);
  assert.deepEqual(await body(response), {
    ok: false,
    readOnly: true,
    error: "Unauthorized"
  });
});

test("authenticated readiness returns only safe diagnostic structure", async () => {
  const runtime = {
    ok: true,
    readOnly: true,
    networkCalls: false,
    storageMutations: false,
    readyForRuntimeConfiguration: false,
    storagePreflightRequiredSeparately: true,
    missingBindings: ["OPENAI_API_KEY"],
    invalidBindings: [],
    dependencies: {
      openai: { ready: false, missing: ["OPENAI_API_KEY"], invalid: [] }
    }
  };

  const response = await handleAssistantRuntimeReadinessApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "SAM@SDLIVE.SHOW" }),
      inspectRuntime: async () => runtime
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await body(response), {
    ok: true,
    readOnly: true,
    actor: "sam@sdlive.show",
    readyForRuntimeConfiguration: false,
    runtime
  });
});

test("readiness inspection failures never echo exception details", async () => {
  const response = await handleAssistantRuntimeReadinessApi(
    request(),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      inspectRuntime: async () => {
        throw new Error("OPENAI_API_KEY=private-secret-value");
      }
    }
  );

  assert.equal(response.status, 500);
  const data = await body(response);
  assert.equal(data.error, "Assistant runtime readiness inspection failed");
  assert.equal(JSON.stringify(data).includes("private-secret-value"), false);
});
