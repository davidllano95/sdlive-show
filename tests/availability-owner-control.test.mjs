import test from "node:test";
import assert from "node:assert/strict";

import { executeAvailabilityOwnerCommand } from "../availability-owner-control.js";

function response(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function state(overrides = {}) {
  return {
    ok: true,
    profile: { defaultTimezone: "America/Bogota" },
    override: { mode: "auto", expiresAt: null },
    effective: {
      status: "available",
      source: "weekly-schedule",
      timeZone: "America/Bogota"
    },
    ...overrides
  };
}

test("owner command executor reads active timezone then uses canonical Availability PUT", async () => {
  const calls = [];
  const handler = async (request, env, options) => {
    const actor = await options.verifyAdmin(request, env);
    calls.push({
      method: request.method,
      actor: actor.email,
      body: request.method === "PUT" ? await request.json() : null
    });

    if (request.method === "GET") return response(state());
    return response(state({
      saved: true,
      action: "override",
      override: {
        mode: "away",
        expiresAt: "2026-09-02T00:00:00.000Z"
      },
      effective: {
        status: "away",
        source: "manual-override",
        timeZone: "America/Bogota"
      }
    }));
  };

  const result = await executeAvailabilityOwnerCommand({}, "away 2h", {
    actorEmail: "owner@sdlive.show",
    now: new Date("2026-09-01T22:00:00.000Z"),
    availabilityHandler: handler
  });

  assert.equal(result.ok, true);
  assert.equal(result.type, "override");
  assert.match(result.reply, /AWAY applied until/);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body, {
    action: "override",
    mode: "away",
    durationMinutes: 120
  });
  assert.equal(calls[0].actor, "owner@sdlive.show");
  assert.equal(calls[1].actor, "owner@sdlive.show");
});

test("status command is read-only and supports Spanish", async () => {
  let putCount = 0;
  const handler = async (request) => {
    if (request.method === "PUT") putCount += 1;
    return response(state());
  };

  const result = await executeAvailabilityOwnerCommand({}, "estado", {
    actorEmail: "owner@sdlive.show",
    availabilityHandler: handler
  });

  assert.equal(result.ok, true);
  assert.equal(result.type, "status");
  assert.equal(result.language, "es");
  assert.match(result.reply, /AVAILABLE/);
  assert.match(result.reply, /America\/Bogota/);
  assert.equal(putCount, 0);
});

test("invalid command returns help without writing Availability", async () => {
  let putCount = 0;
  const handler = async (request) => {
    if (request.method === "PUT") putCount += 1;
    return response(state());
  };

  const result = await executeAvailabilityOwnerCommand({}, "away", {
    actorEmail: "owner@sdlive.show",
    availabilityHandler: handler
  });

  assert.equal(result.ok, false);
  assert.equal(result.type, "invalid");
  assert.match(result.reply, /away 2h/);
  assert.equal(putCount, 0);
});

test("owner command refuses to synthesize an actor identity", async () => {
  await assert.rejects(
    () => executeAvailabilityOwnerCommand({}, "status", {
      availabilityHandler: async () => response(state())
    }),
    /actor email is missing/
  );
});
