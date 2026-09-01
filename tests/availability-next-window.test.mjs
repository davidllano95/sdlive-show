import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeNextHumanWindow } from '../availability-next-window.js';

const noOverride = {
  mode: 'auto',
  storedMode: 'auto',
  startsAt: null,
  expiresAt: null
};
const noTravel = {
  active: false,
  timezone: '',
  startsAt: null,
  expiresAt: null
};
const noForce = {
  mode: 'auto',
  storedMode: 'auto',
  expiresOn: null
};

function profile(schedule, defaultTimezone = 'America/Bogota', configured = true) {
  return {
    defaultTimezone,
    weeklySchedule: schedule,
    configured
  };
}

function state({
  schedule = {},
  defaultTimezone = 'America/Bogota',
  configured = true,
  override = noOverride,
  travel = noTravel,
  force = noForce
} = {}) {
  return {
    profile: profile(schedule, defaultTimezone, configured),
    override,
    travel,
    force
  };
}

test('finds the next weekly service-window start in the base timezone', () => {
  const now = new Date('2026-09-01T15:00:00.000Z'); // Tue 10:00 Bogota
  const next = computeNextHumanWindow(state({
    schedule: { tue: [['11:00', '18:00']] }
  }), now);

  assert.equal(next.startsAt, '2026-09-01T16:00:00.000Z');
  assert.equal(next.timeZone, 'America/Bogota');
  assert.ok(next.labelEn);
  assert.ok(next.labelEs);
});

test('supports multiple service windows and skips a finished morning window', () => {
  const now = new Date('2026-09-01T15:30:00.000Z'); // Tue 10:30 Bogota
  const next = computeNextHumanWindow(state({
    schedule: { tue: [['08:00', '10:00'], ['13:00', '18:00']] }
  }), now);

  assert.equal(next.startsAt, '2026-09-01T18:00:00.000Z');
});

test('skips closed weekend days and finds the next configured weekday', () => {
  const now = new Date('2026-09-05T15:00:00.000Z'); // Sat 10:00 Bogota
  const next = computeNextHumanWindow(state({
    schedule: { mon: [['09:00', '18:00']] }
  }), now);

  assert.equal(next.startsAt, '2026-09-07T14:00:00.000Z');
});

test('manual Away can hand back to an already-open weekly window at override expiry', () => {
  const now = new Date('2026-09-01T15:00:00.000Z');
  const next = computeNextHumanWindow(state({
    schedule: { tue: [['08:00', '18:00']] },
    override: {
      mode: 'away',
      storedMode: 'away',
      startsAt: '2026-09-01T15:00:00.000Z',
      expiresAt: '2026-09-01T16:30:00.000Z'
    }
  }), now);

  assert.equal(next.startsAt, '2026-09-01T16:30:00.000Z');
});

test('Force Off keeps priority until base-timezone day end', () => {
  const now = new Date('2026-09-01T15:00:00.000Z');
  const next = computeNextHumanWindow(state({
    schedule: { wed: [['00:00', '18:00']] },
    force: {
      mode: 'force_off',
      storedMode: 'force_off',
      expiresOn: '2026-09-01'
    }
  }), now);

  assert.equal(next.startsAt, '2026-09-02T05:00:00.000Z');
});

test('Travel Mode evaluates the next service window in the travel timezone', () => {
  const now = new Date('2026-09-01T15:00:00.000Z'); // Tue 17:00 Madrid
  const next = computeNextHumanWindow(state({
    schedule: { tue: [['18:00', '20:00']] },
    travel: {
      active: true,
      timezone: 'Europe/Madrid',
      startsAt: '2026-09-01T14:00:00.000Z',
      expiresAt: '2026-09-03T21:59:59.999Z'
    }
  }), now);

  assert.equal(next.startsAt, '2026-09-01T16:00:00.000Z');
  assert.equal(next.timeZone, 'Europe/Madrid');
});

test('Travel Mode expiry can immediately reopen an active base-timezone service window', () => {
  const now = new Date('2026-09-01T15:00:00.000Z');
  const next = computeNextHumanWindow(state({
    schedule: { tue: [['12:00', '18:00']] },
    travel: {
      active: true,
      timezone: 'Europe/Madrid',
      startsAt: '2026-09-01T14:00:00.000Z',
      expiresAt: '2026-09-01T17:30:00.000Z'
    }
  }), now);

  assert.equal(next.startsAt, '2026-09-01T17:30:00.000Z');
  assert.equal(next.timeZone, 'America/Bogota');
});

test('DST-aware conversion uses the post-transition New York offset', () => {
  const now = new Date('2026-03-08T11:00:00.000Z'); // Sun 07:00 after spring-forward
  const next = computeNextHumanWindow(state({
    defaultTimezone: 'America/New_York',
    schedule: { sun: [['09:00', '12:00']] }
  }), now);

  assert.equal(next.startsAt, '2026-03-08T13:00:00.000Z');
  assert.equal(next.timeZone, 'America/New_York');
});

test('a deliberately all-closed week has no next service window', () => {
  const now = new Date('2026-09-01T15:00:00.000Z');
  const next = computeNextHumanWindow(state({ schedule: {} }), now);
  assert.equal(next, null);
});

test('unconfigured compatibility state returns no next window because it is already Available', () => {
  const now = new Date('2026-09-01T15:00:00.000Z');
  const next = computeNextHumanWindow(state({ configured: false, schedule: {} }), now);
  assert.equal(next, null);
});

test('public contract keeps travel timezone private while Admin retains audit context', () => {
  const resolver = fs.readFileSync('availability-next-window.js', 'utf8');
  const publicWorker = fs.readFileSync('public-form-rate-limit.js', 'utf8');
  const adminWorker = fs.readFileSync('admin-stabilization-worker.js', 'utf8');

  assert.match(resolver, /function publicWindow\(window\)/);
  assert.match(resolver, /startsAt:\s*window\.startsAt/);
  assert.match(resolver, /labelEn:\s*window\.labelEn/);
  assert.match(resolver, /labelEs:\s*window\.labelEs/);
  assert.doesNotMatch(
    resolver.match(/function publicWindow\(window\)[\s\S]*?\n\}/)?.[0] || '',
    /timeZone/
  );
  assert.match(publicWorker, /publicView:\s*path === "\/api\/availability"/);
  assert.match(adminWorker, /decorateAvailabilityNextWindowResponse\(response, env, \{ publicView: false \}\)/);
});

test('public and Admin runtimes surface next-window data without changing the persistent tab contract', () => {
  const publicRuntime = fs.readFileSync('availability-status.js', 'utf8');
  const publicEdge = fs.readFileSync('showday-edge.js', 'utf8');
  const adminRuntime = fs.readFileSync('admin/availability-next-window-admin.js', 'utf8');
  const adminCss = fs.readFileSync('admin/availability-next-window-admin.css', 'utf8');
  const adminEdge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.match(publicRuntime, /data\.nextHumanWindow/);
  assert.match(publicRuntime, /Available again/);
  assert.match(publicRuntime, /Disponible de nuevo/);
  assert.match(publicRuntime, /tab:\s*"AWAY"/);
  assert.match(publicRuntime, /tab:\s*"AUSENTE"/);
  assert.match(publicEdge, /AVAILABILITY_NEXT_WINDOW_VERSION = "1"/);
  assert.match(publicEdge, /&nw=\$\{AVAILABILITY_NEXT_WINDOW_VERSION\}/);

  assert.match(adminRuntime, /Next service window/);
  assert.match(adminRuntime, /next\.timeZone/);
  assert.match(adminRuntime, /MutationObserver/);
  assert.match(adminCss, /availability-next-window-admin/);
  assert.match(adminEdge, /availability-next-window-admin\.css/);
  assert.match(adminEdge, /availability-next-window-admin\.js/);
});
