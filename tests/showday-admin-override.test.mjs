import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeShowDayOverrideInput,
  resolveShowDayStatus
} from "../site-schedule-store-v2.js";

const router = await readFile(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../showday-runtime.js", import.meta.url), "utf8");
const store = await readFile(new URL("../site-schedule-store-v2.js", import.meta.url), "utf8");

test("Show Day QA override validates modes and requires a Force On location", () => {
  assert.equal(normalizeShowDayOverrideInput({ mode: "bogus" }, "2026-08-24").ok, false);
  assert.equal(normalizeShowDayOverrideInput({ mode: "force_on" }, "2026-08-24").ok, false);

  const forcedOn = normalizeShowDayOverrideInput(
    { mode: "force_on", location: "QA · Bogotá" },
    "2026-08-24"
  );
  assert.deepEqual(forcedOn, {
    ok: true,
    errors: {},
    value: {
      mode: "force_on",
      location: "QA · Bogotá",
      expiresOn: "2026-08-24"
    }
  });

  const automatic = normalizeShowDayOverrideInput({ mode: "auto", location: "ignored" }, "2026-08-24");
  assert.equal(automatic.value.location, "");
  assert.equal(automatic.value.expiresOn, null);
});

test("Show Day status resolution keeps Auto authoritative and supports temporary force modes", () => {
  const automatic = { active: false, location: "", activeCount: 0 };

  assert.deepEqual(resolveShowDayStatus(automatic, { mode: "force_on", location: "QA · Bogotá" }), {
    active: true,
    location: "QA · Bogotá",
    activeCount: 1,
    source: "admin-override",
    overrideMode: "force_on"
  });

  assert.deepEqual(resolveShowDayStatus({ active: true, location: "Teatro", activeCount: 1 }, { mode: "force_off" }), {
    active: false,
    location: "",
    activeCount: 0,
    source: "admin-override",
    overrideMode: "force_off"
  });

  assert.deepEqual(resolveShowDayStatus({ active: true, location: "Teatro", activeCount: 1 }, { mode: "auto" }), {
    active: true,
    location: "Teatro",
    activeCount: 1,
    source: "site-schedule",
    overrideMode: "auto"
  });
});

test("Override state is separate D1 state and routed behind the existing Admin auth boundary", () => {
  assert.match(store, /CREATE TABLE IF NOT EXISTS showday_override_state/);
  assert.match(store, /expires_on TEXT/);
  assert.match(router, /path === "\/api\/admin\/showday-override"/);
  assert.match(dashboard, /\/api\/admin\/showday-override/);
  assert.match(dashboard, /Auto/);
  assert.match(dashboard, /Force On/);
  assert.match(dashboard, /Force Off/);
  assert.match(dashboard, /never edit Site Schedule, REGISTRO or AppSheet/);
});

test("Public runtime exposes whether Show Day came from Site Schedule or the Admin override", () => {
  assert.match(runtime, /status\?\.source === "admin-override"/);
  assert.match(runtime, /root\.dataset\.showdaySource = source/);
  assert.match(runtime, /root\.dataset\.showdayOverride = overrideMode/);
});