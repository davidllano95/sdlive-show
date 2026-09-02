import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { assistantPublicWidgetPolicy } from "../assistant-public-widget-edge.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("widget is gated by both the public switch and a valid Turnstile site key", () => {
  assert.deepEqual(assistantPublicWidgetPolicy({}), {
    enabled: false,
    turnstileSiteKeyConfigured: false,
    renders: false,
    launcher: "contact_section",
    persistentFloatingLauncher: false,
    sessionStorage: "memory_only",
    transcriptStorage: "none"
  });

  assert.equal(assistantPublicWidgetPolicy({
    ASSISTANT_PUBLIC_ENABLED: "true",
    ASSISTANT_TURNSTILE_SITE_KEY: "0x4AAAAAA-valid-site-key"
  }).renders, true);

  assert.equal(assistantPublicWidgetPolicy({
    ASSISTANT_PUBLIC_ENABLED: "true",
    ASSISTANT_TURNSTILE_SITE_KEY: "<unsafe>"
  }).renders, false);
});

test("browser runtime parses and never persists conversation or sealed session state", async () => {
  const js = await source("assistant-public-widget.js");
  assert.doesNotThrow(() => new Function(js));
  assert.doesNotMatch(js, /\blocalStorage\b/);
  assert.doesNotMatch(js, /\bsessionStorage\b/);
  assert.doesNotMatch(js, /indexedDB/);
  assert.doesNotMatch(js, /document\.cookie/);
  assert.match(js, /let sessionToken = null/);
  assert.match(js, /let securityToken = ""/);
});

test("browser uses Turnstile for admission and the sealed session token for later operations", async () => {
  const js = await source("assistant-public-widget.js");
  assert.match(js, /if \(sessionToken\) body\.sessionToken = sessionToken/);
  assert.match(js, /if \(securityToken\) body\.turnstileToken = securityToken/);
  assert.match(js, /return Boolean\(sessionToken \|\| securityToken\)/);
  assert.match(js, /appearance:\s*"interaction-only"/);
  assert.match(js, /window\.turnstile\.remove\(widgetId\)/);
  assert.doesNotMatch(js, /\bsessionId\s*:/);
  assert.doesNotMatch(js, /\bslots\s*:/);
  assert.doesNotMatch(js, /\bconsentEvidence\s*:/);
});

test("consent UI is rendered from the server contract and uses explicit product actions", async () => {
  const js = await source("assistant-public-widget.js");
  assert.match(js, /prompt\.copy\.body/);
  assert.match(js, /prompt\.copy\.rights/);
  assert.match(js, /prompt\.policyVersion/);
  assert.match(js, /"authorize"/);
  assert.match(js, /"cancel"/);
  assert.match(js, /consentAction:\s*action/);
  assert.doesNotMatch(js, /privacyPolicyVersion:\s*"2026-/);
});

test("consent stays inside a bounded conversation region instead of competing with outer panel rows", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const css = await source("assistant-public-widget.css");

  assert.match(
    edge,
    /assistant-panel__conversation[\s\S]*assistant-panel__messages[\s\S]*assistant-panel__consent/
  );
  assert.match(css, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto auto;/);
  assert.match(
    css,
    /\.assistant-panel__conversation\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/
  );
  assert.match(
    css,
    /\.assistant-panel__messages\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?overflow-y:\s*auto;/
  );
  assert.match(css, /\.assistant-panel__consent\s*\{[\s\S]*?flex:\s*0 0 auto;/);
});

test("widget has deterministic human fallbacks and exposes no owner phone", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const js = await source("assistant-public-widget.js");
  const combined = `${edge}\n${js}`;

  assert.match(edge, /mailto:hello@sdlive\.show/);
  assert.match(edge, /https:\/\/wa\.me\/samd\.llano95/);
  assert.match(js, /No request was submitted/);
  assert.match(js, /No se envió ninguna solicitud/);
  assert.doesNotMatch(combined, /\+57\s*\d{3}/);
});

test("launcher lives in Contact instead of creating a second persistent floating CTA", async () => {
  const edge = await source("assistant-public-widget-edge.js");
  const css = await source("assistant-public-widget.css");

  assert.match(edge, /\.on\("#contact \.contact-list"/);
  assert.match(edge, /persistentFloatingLauncher:\s*false/);
  const entryRule = css.slice(
    css.indexOf(".assistant-contact-entry"),
    css.indexOf(".assistant-contact-launch {")
  );
  assert.doesNotMatch(entryRule, /position:\s*fixed/);
  assert.match(css, /body\.sdlive-assistant-open \.whatsapp-float/);
});

test("public edge injects widget only after existing Show Day/Availability public runtime", async () => {
  const worker = await source("public-form-rate-limit.js");
  assert.match(
    worker,
    /import \{ applyAssistantPublicWidgetRuntime \} from "\.\/assistant-public-widget-edge\.js"/
  );
  assert.match(worker, /const publicResponse = applyShowDayRuntime\(response\)/);
  assert.match(worker, /return applyAssistantPublicWidgetRuntime\(publicResponse, env\)/);
});

test("CSP already permits the first-party widget and Cloudflare Turnstile", async () => {
  const headers = await source("_headers");
  assert.match(headers, /script-src[^\n]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /connect-src[^\n]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /frame-src[^\n]*https:\/\/challenges\.cloudflare\.com/);
});
