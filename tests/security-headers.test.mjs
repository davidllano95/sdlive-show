import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  BASELINE_SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY
} from "../security-headers.js";

test("baseline CSP allows required SD.Live integrations without unsafe-eval", () => {
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/www\.googletagmanager\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/fonts\.googleapis\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/fonts\.gstatic\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/challenges\.cloudflare\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/static\.cloudflareinsights\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /https:\/\/media\.sdlive\.show/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /'unsafe-eval'/);
});

test("static asset headers stay in parity with the Worker SSR contract", async () => {
  const staticHeaders = await readFile(new URL("../_headers", import.meta.url), "utf8");

  for (const [name, value] of Object.entries(BASELINE_SECURITY_HEADERS)) {
    assert.match(staticHeaders, new RegExp(`^\\s*${name}: ${value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "m"));
  }
});

test("SSR Home applies the shared security-header contract", async () => {
  const workerEntry = await readFile(new URL("../worker-entry.js", import.meta.url), "utf8");
  assert.match(workerEntry, /applyBaselineSecurityHeaders\(headers\)/);
});
