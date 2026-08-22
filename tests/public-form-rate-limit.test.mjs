import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  enforcePublicFormRateLimit,
  publicFormRateLimitConfig,
  publicFormRateLimitKey
} from "../public-form-rate-limit.js";

function request(path, { method = "POST", ip = "203.0.113.10" } = {}) {
  return new Request(`https://sdlive.show${path}`, {
    method,
    headers: ip ? { "CF-Connecting-IP": ip } : {}
  });
}

test("only public Contact and Rental POST submissions are rate limited", () => {
  assert.equal(
    publicFormRateLimitConfig(request("/api/contact"))?.binding,
    "CONTACT_FORM_RATE_LIMITER"
  );
  assert.equal(
    publicFormRateLimitConfig(request("/api/rental/"))?.binding,
    "RENTAL_FORM_RATE_LIMITER"
  );
  assert.equal(publicFormRateLimitConfig(request("/api/contact", { method: "GET" })), null);
  assert.equal(publicFormRateLimitConfig(request("/api/admin/whoami")), null);
});

test("rate-limit key uses Cloudflare client IP with a deterministic fallback", () => {
  assert.equal(publicFormRateLimitKey(request("/api/contact")), "203.0.113.10");
  assert.equal(publicFormRateLimitKey(request("/api/contact", { ip: "" })), "unknown-client");
});

test("exceeded public form limit returns 429 before downstream form processing", async () => {
  const calls = [];
  const response = await enforcePublicFormRateLimit(
    request("/api/contact"),
    {
      CONTACT_FORM_RATE_LIMITER: {
        async limit(input) {
          calls.push(input);
          return { success: false };
        }
      }
    }
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(calls, [{ key: "203.0.113.10" }]);
  assert.match(await response.text(), /Too many requests/);
});

test("allowed request continues and missing production binding fails closed", async () => {
  const allowed = await enforcePublicFormRateLimit(
    request("/api/rental"),
    {
      RENTAL_FORM_RATE_LIMITER: {
        async limit() {
          return { success: true };
        }
      }
    }
  );

  assert.equal(allowed, null);

  const missing = await enforcePublicFormRateLimit(request("/api/rental"), {});
  assert.equal(missing.status, 503);
  assert.equal(missing.headers.get("Retry-After"), "60");
});

test("wrangler keeps independent 10-per-minute bindings for Contact and Rental", async () => {
  const wrangler = JSON.parse(
    (await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"))
      .replace(/^\s*\/\/.*$/gm, "")
  );

  assert.equal(wrangler.main, "./public-form-rate-limit.js");
  assert.equal(wrangler.ratelimits.length, 2);

  const byName = Object.fromEntries(
    wrangler.ratelimits.map((entry) => [entry.name, entry])
  );

  for (const name of ["CONTACT_FORM_RATE_LIMITER", "RENTAL_FORM_RATE_LIMITER"]) {
    assert.equal(byName[name].simple.limit, 10);
    assert.equal(byName[name].simple.period, 60);
  }

  assert.notEqual(
    byName.CONTACT_FORM_RATE_LIMITER.namespace_id,
    byName.RENTAL_FORM_RATE_LIMITER.namespace_id
  );
});
