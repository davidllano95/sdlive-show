import test from "node:test";
import assert from "node:assert/strict";

import {
  assistantRuntimeReadinessPolicy,
  inspectAssistantRuntimeReadiness
} from "../assistant-runtime-readiness.js";

function base64Url32() {
  return Buffer.alloc(32, 7).toString("base64url");
}

function readyEnv() {
  return {
    OPENAI_API_KEY: "openai-secret-value-that-must-never-leak",
    OPENAI_ASSISTANT_MODEL: "gpt-5-mini",
    ASSISTANT_SESSION_KEY: base64Url32(),
    TURNSTILE_SECRET_KEY: "turnstile-secret-value-that-must-never-leak",
    ASSISTANT_TURNSTILE_SITE_KEY: "0x4AAAAAA-public-browser-site-key",
    ASSISTANT_RATE_LIMITER: {
      async limit() { return { success: true }; }
    },
    CMS_DB: {
      prepare() { throw new Error("readiness must not inspect storage"); }
    },
    RESEND_API_KEY: "resend-secret-value-that-must-never-leak",
    ASSISTANT_LEAD_NOTIFICATION_FROM: "SD.Live Assistant <hello@sdlive.show>",
    ASSISTANT_LEAD_NOTIFICATION_TO: "hello@sdlive.show"
  };
}

test("runtime readiness reports all configured dependencies without touching network or D1", () => {
  const env = readyEnv();
  const result = inspectAssistantRuntimeReadiness(env);

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.networkCalls, false);
  assert.equal(result.storageMutations, false);
  assert.equal(result.readyForRuntimeConfiguration, true);
  assert.equal(result.storagePreflightRequiredSeparately, true);
  assert.deepEqual(result.missingBindings, []);
  assert.deepEqual(result.invalidBindings, []);
  assert.equal(Object.values(result.dependencies).every((entry) => entry.ready), true);
  assert.equal(result.dependencies.turnstile.browserSiteKeyConfigured, true);
  assert.equal(result.dependencies.turnstile.serverSecretConfigured, true);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(env.OPENAI_API_KEY), false);
  assert.equal(serialized.includes(env.TURNSTILE_SECRET_KEY), false);
  assert.equal(serialized.includes(env.RESEND_API_KEY), false);
  assert.equal(serialized.includes(env.ASSISTANT_SESSION_KEY), false);
  assert.equal(serialized.includes(env.ASSISTANT_TURNSTILE_SITE_KEY), false);
});

test("missing runtime bindings are named without revealing values", () => {
  const result = inspectAssistantRuntimeReadiness({});

  assert.equal(result.readyForRuntimeConfiguration, false);
  assert.deepEqual(result.invalidBindings, []);
  assert.deepEqual(result.missingBindings, [
    "ASSISTANT_LEAD_NOTIFICATION_FROM",
    "ASSISTANT_LEAD_NOTIFICATION_TO",
    "ASSISTANT_RATE_LIMITER",
    "ASSISTANT_SESSION_KEY",
    "ASSISTANT_TURNSTILE_SITE_KEY",
    "CMS_DB",
    "OPENAI_API_KEY",
    "OPENAI_ASSISTANT_MODEL",
    "RESEND_API_KEY",
    "TURNSTILE_SECRET_KEY"
  ]);
});

test("present but malformed session/model/bindings are reported as invalid, not missing", () => {
  const env = readyEnv();
  env.OPENAI_ASSISTANT_MODEL = "invalid model with spaces";
  env.ASSISTANT_SESSION_KEY = "not-32-bytes";
  env.ASSISTANT_RATE_LIMITER = {};
  env.CMS_DB = {};

  const result = inspectAssistantRuntimeReadiness(env);
  assert.equal(result.readyForRuntimeConfiguration, false);
  assert.deepEqual(result.missingBindings, []);
  assert.deepEqual(result.invalidBindings, [
    "ASSISTANT_RATE_LIMITER",
    "ASSISTANT_SESSION_KEY",
    "CMS_DB",
    "OPENAI_ASSISTANT_MODEL"
  ]);
});

test("readiness policy explicitly forbids secret disclosure and runtime effects", () => {
  assert.deepEqual(assistantRuntimeReadinessPolicy(), {
    readOnly: true,
    networkCalls: false,
    storageMutations: false,
    revealsSecretValues: false,
    storagePreflightRequiredSeparately: true,
    bindings: [
      "OPENAI_API_KEY",
      "OPENAI_ASSISTANT_MODEL",
      "ASSISTANT_SESSION_KEY",
      "TURNSTILE_SECRET_KEY",
      "ASSISTANT_TURNSTILE_SITE_KEY",
      "ASSISTANT_RATE_LIMITER",
      "CMS_DB",
      "RESEND_API_KEY",
      "ASSISTANT_LEAD_NOTIFICATION_FROM",
      "ASSISTANT_LEAD_NOTIFICATION_TO"
    ]
  });
});
