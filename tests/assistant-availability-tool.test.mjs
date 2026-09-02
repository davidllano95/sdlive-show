import test from "node:test";
import assert from "node:assert/strict";

import { readAssistantAvailability } from "../assistant-availability-tool.js";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("Assistant sees only the public-safe Availability fields", async () => {
  const result = await readAssistantAvailability({}, {
    availabilityHandler: async () => json({
      ok: true,
      status: "away",
      humanAvailable: false,
      humanReachable: false,
      contactMode: "leave_message",
      nextTransition: "2026-09-01T23:00:00.000Z",
      source: "manual-override",
      // These fields simulate accidental internal expansion and must never leak.
      profile: { defaultTimezone: "America/Bogota" },
      travel: { timezone: "Australia/Sydney", active: true },
      override: { actorEmail: "owner@example.com" },
      force: { mode: "force_off" }
    }),
    decorateResponse: async (response) => {
      const data = await response.json();
      return json({
        ...data,
        nextHumanWindow: {
          startsAt: "2026-09-02T12:00:00.000Z",
          labelEn: "Tue, 8:00 AM",
          labelEs: "mar, 8:00 a. m.",
          timeZone: "Australia/Sydney"
        }
      });
    }
  });

  assert.deepEqual(result, {
    ok: true,
    availabilityKnown: true,
    currentStatus: "away",
    humanReachable: false,
    contactMode: "leave_message",
    nextHumanWindow: {
      startsAt: "2026-09-02T12:00:00.000Z",
      labelEn: "Tue, 8:00 AM",
      labelEs: "mar, 8:00 a. m."
    },
    reason: null
  });

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /Australia\/Sydney/);
  assert.doesNotMatch(serialized, /owner@example\.com/);
  assert.doesNotMatch(serialized, /force_off/);
  assert.doesNotMatch(serialized, /manual-override/);
});

test("degraded public fallback cannot be presented as confirmed availability", async () => {
  const result = await readAssistantAvailability({}, {
    availabilityHandler: async () => json({
      ok: true,
      status: "available",
      humanAvailable: true,
      humanReachable: true,
      contactMode: "whatsapp",
      nextTransition: null,
      source: "degraded-compatibility-default",
      degraded: true
    }),
    decorateResponse: async (response) => response
  });

  assert.deepEqual(result, {
    ok: true,
    availabilityKnown: false,
    currentStatus: null,
    humanReachable: null,
    contactMode: "leave_message",
    nextHumanWindow: null,
    reason: "degraded"
  });
});

test("healthy Available and Limited states remain usable without exposing source metadata", async () => {
  for (const [status, reachable, mode] of [
    ["available", true, "whatsapp"],
    ["limited", true, "whatsapp"]
  ]) {
    const result = await readAssistantAvailability({}, {
      availabilityHandler: async () => json({
        ok: true,
        status,
        humanReachable: reachable,
        contactMode: mode,
        source: "admin-force"
      }),
      decorateResponse: async (response) => response
    });

    assert.equal(result.availabilityKnown, true);
    assert.equal(result.currentStatus, status);
    assert.equal(result.humanReachable, reachable);
    assert.equal(result.contactMode, mode);
    assert.equal("source" in result, false);
  }
});

test("invalid or failed public snapshot fails closed", async () => {
  const failed = await readAssistantAvailability({}, {
    availabilityHandler: async () => json({ ok: false }, 503)
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.availabilityKnown, false);

  const invalid = await readAssistantAvailability({}, {
    availabilityHandler: async () => json({ ok: true, status: "mystery" }),
    decorateResponse: async (response) => response
  });
  assert.equal(invalid.ok, true);
  assert.equal(invalid.availabilityKnown, false);
  assert.equal(invalid.reason, "invalid_public_snapshot");
});

test("Availability handler exceptions fail closed and never invent a status", async () => {
  const result = await readAssistantAvailability({}, {
    availabilityHandler: async () => {
      throw new Error("D1 unavailable");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.availabilityKnown, false);
  assert.equal(result.currentStatus, null);
  assert.equal(result.contactMode, "leave_message");
});
