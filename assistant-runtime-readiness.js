import {
  assistantNotificationConfigFromEnv,
  validateAssistantNotificationConfig
} from "./assistant-notification-contract.js";
import { ASSISTANT_RATE_LIMIT_POLICY } from "./assistant-rate-limit.js";
import { openAIProviderConfig } from "./openai-assistant-provider.js";

const SESSION_KEY_BINDING = "ASSISTANT_SESSION_KEY";
const TURNSTILE_SECRET_BINDING = "TURNSTILE_SECRET_KEY";
const TURNSTILE_SITE_KEY_BINDING = "ASSISTANT_TURNSTILE_SITE_KEY";
const PUBLIC_ENABLED_BINDING = "ASSISTANT_PUBLIC_ENABLED";
const D1_BINDING = "CMS_DB";

function text(value, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function base64UrlByteLength(value) {
  const raw = text(value, 512);
  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - raw.length % 4) % 4);
  try {
    return atob(padded).length;
  } catch {
    return null;
  }
}

function openAIReadiness(env) {
  try {
    openAIProviderConfig(env);
    return { ready: true, missing: [], invalid: [] };
  } catch {
    const missing = [];
    if (!text(env?.OPENAI_API_KEY, 1000)) missing.push("OPENAI_API_KEY");
    if (!text(env?.OPENAI_ASSISTANT_MODEL, 128)) missing.push("OPENAI_ASSISTANT_MODEL");
    return {
      ready: false,
      missing,
      invalid: missing.length ? [] : ["OPENAI_ASSISTANT_MODEL"]
    };
  }
}

function sessionReadiness(env) {
  const raw = text(env?.[SESSION_KEY_BINDING], 512);
  const byteLength = base64UrlByteLength(raw);
  return {
    ready: byteLength === 32,
    missing: raw ? [] : [SESSION_KEY_BINDING],
    invalid: raw && byteLength !== 32 ? [SESSION_KEY_BINDING] : []
  };
}

function turnstileReadiness(env) {
  const secretReady = Boolean(text(env?.[TURNSTILE_SECRET_BINDING], 2000));
  const siteKeyReady = Boolean(text(env?.[TURNSTILE_SITE_KEY_BINDING], 300));
  const missing = [];
  if (!secretReady) missing.push(TURNSTILE_SECRET_BINDING);
  if (!siteKeyReady) missing.push(TURNSTILE_SITE_KEY_BINDING);
  return {
    ready: secretReady && siteKeyReady,
    missing,
    invalid: [],
    browserSiteKeyConfigured: siteKeyReady,
    serverSecretConfigured: secretReady
  };
}

function limiterReadiness(env) {
  const binding = ASSISTANT_RATE_LIMIT_POLICY.binding;
  const present = env?.[binding] !== undefined && env?.[binding] !== null;
  const ready = typeof env?.[binding]?.limit === "function";
  return {
    ready,
    missing: present ? [] : [binding],
    invalid: present && !ready ? [binding] : []
  };
}

function d1Readiness(env) {
  const present = env?.[D1_BINDING] !== undefined && env?.[D1_BINDING] !== null;
  const ready = typeof env?.[D1_BINDING]?.prepare === "function";
  return {
    ready,
    missing: present ? [] : [D1_BINDING],
    invalid: present && !ready ? [D1_BINDING] : [],
    storageSchemaCheckedHere: false
  };
}

function notificationReadiness(env) {
  const config = assistantNotificationConfigFromEnv(env);
  const validation = validateAssistantNotificationConfig(config);
  return {
    ready: validation.ok,
    missing: validation.missing,
    invalid: []
  };
}

function publicExposure(env) {
  return {
    enabled: text(env?.[PUBLIC_ENABLED_BINDING], 16).toLowerCase() === "true",
    binding: PUBLIC_ENABLED_BINDING,
    defaultsToDisabled: true
  };
}

export function inspectAssistantRuntimeReadiness(env = {}) {
  const dependencies = {
    openai: openAIReadiness(env),
    session: sessionReadiness(env),
    turnstile: turnstileReadiness(env),
    rateLimit: limiterReadiness(env),
    d1Binding: d1Readiness(env),
    notification: notificationReadiness(env)
  };
  const exposure = publicExposure(env);

  const missingBindings = [...new Set(
    Object.values(dependencies).flatMap((entry) => entry.missing || [])
  )].sort();
  const invalidBindings = [...new Set(
    Object.values(dependencies).flatMap((entry) => entry.invalid || [])
  )].sort();
  const readyForRuntimeConfiguration = Object.values(dependencies).every((entry) => entry.ready);

  return {
    ok: true,
    readOnly: true,
    networkCalls: false,
    storageMutations: false,
    readyForRuntimeConfiguration,
    readyForPublicEnablement: readyForRuntimeConfiguration && exposure.enabled,
    storagePreflightRequiredSeparately: true,
    publicExposure: exposure,
    missingBindings,
    invalidBindings,
    dependencies
  };
}

export function assistantRuntimeReadinessPolicy() {
  return Object.freeze({
    readOnly: true,
    networkCalls: false,
    storageMutations: false,
    revealsSecretValues: false,
    storagePreflightRequiredSeparately: true,
    publicExposureDefaultsToDisabled: true,
    bindings: Object.freeze([
      "OPENAI_API_KEY",
      "OPENAI_ASSISTANT_MODEL",
      SESSION_KEY_BINDING,
      TURNSTILE_SECRET_BINDING,
      TURNSTILE_SITE_KEY_BINDING,
      ASSISTANT_RATE_LIMIT_POLICY.binding,
      D1_BINDING,
      "RESEND_API_KEY",
      "ASSISTANT_LEAD_NOTIFICATION_FROM",
      "ASSISTANT_LEAD_NOTIFICATION_TO",
      PUBLIC_ENABLED_BINDING
    ])
  });
}
