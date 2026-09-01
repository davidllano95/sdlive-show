import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeAvailabilityTravelInput } from '../availability-travel-api.js';

const now = new Date('2026-09-01T15:00:00.000Z');

test('Travel Mode requires an explicit valid timezone and bounded end date', () => {
  assert.deepEqual(normalizeAvailabilityTravelInput({ enabled: true, endDate: '2026-09-03' }, now), {
    ok: false,
    error: 'invalid_travel_timezone'
  });

  assert.deepEqual(normalizeAvailabilityTravelInput({
    enabled: true,
    timezone: 'Not/AZone',
    endDate: '2026-09-03'
  }, now), {
    ok: false,
    error: 'invalid_travel_timezone'
  });

  assert.deepEqual(normalizeAvailabilityTravelInput({
    enabled: true,
    timezone: 'Europe/Madrid',
    endDate: '2026-08-31'
  }, now), {
    ok: false,
    error: 'invalid_travel_end_date'
  });

  assert.equal(normalizeAvailabilityTravelInput({
    enabled: true,
    timezone: 'Europe/Madrid',
    endDate: '2026-12-15'
  }, now).ok, false);
});

test('Travel Mode starts now and expires at the end of the selected date in the travel timezone', () => {
  const result = normalizeAvailabilityTravelInput({
    enabled: true,
    timezone: 'Europe/Madrid',
    endDate: '2026-09-03'
  }, now);

  assert.deepEqual(result, {
    ok: true,
    value: {
      enabled: true,
      timezone: 'Europe/Madrid',
      startsAt: '2026-09-01T15:00:00.000Z',
      expiresAt: '2026-09-03T21:59:59.999Z',
      endDate: '2026-09-03'
    }
  });
});

test('turning Travel Mode off clears the temporary travel state explicitly', () => {
  assert.deepEqual(normalizeAvailabilityTravelInput({ enabled: false }, now), {
    ok: true,
    value: {
      enabled: false,
      timezone: null,
      startsAt: null,
      expiresAt: null,
      endDate: null
    }
  });
});

test('Travel Mode write path stays inside Availability and uses the existing protected Admin boundary', () => {
  const travelApi = fs.readFileSync('availability-travel-api.js', 'utf8');
  const worker = fs.readFileSync('admin-stabilization-worker.js', 'utf8');

  assert.match(travelApi, /availability_travel_state/);
  assert.match(travelApi, /INSERT INTO availability_history/);
  assert.match(travelApi, /readAvailabilityTravel/);
  assert.match(travelApi, /resolveAvailability/);
  assert.match(travelApi, /verifyAdmin/);
  assert.doesNotMatch(travelApi, /REGISTRO|GOOGLE_CALENDAR|Finance|Rental/);

  assert.match(worker, /handleAvailabilityTravelPut/);
  assert.match(worker, /path === "\/api\/admin\/availability"/);
  assert.match(worker, /String\(body\?\.action \|\| ""\)\.trim\(\)\.toLowerCase\(\) !== "travel"/);
  assert.match(worker, /verifyAdmin:\s*verifyAdminViaExistingApi/);
});

test('Travel Mode Admin UI uses a real timezone selector with device and custom fallbacks', () => {
  const runtime = fs.readFileSync('admin/availability-travel-admin.js', 'utf8');
  const css = fs.readFileSync('admin/availability-travel-admin.css', 'utf8');
  const edge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /Travel mode/);
  assert.match(runtime, /Temporary timezone · does not force Away/);
  assert.match(runtime, /<select id="availabilityTravelTimezone"/);
  assert.match(runtime, /Use device timezone/);
  assert.match(runtime, /Other IANA timezone…/);
  assert.match(runtime, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(runtime, /Bogotá/);
  assert.match(runtime, /Europe\/Madrid/);
  assert.match(runtime, /Australia\/Sydney/);
  assert.match(runtime, /Asia\/Singapore/);
  assert.match(runtime, /Pacific\/Auckland/);
  assert.match(runtime, /Pacific\/Honolulu/);
  assert.match(runtime, /action:\s*"travel"/);
  assert.match(runtime, /enabled:\s*true/);
  assert.match(runtime, /enabled:\s*false/);
  assert.match(runtime, /schedule\.before\(section\)/);
  assert.doesNotMatch(runtime, /<datalist/);
  assert.doesNotMatch(runtime, /Date\.now\(\) \+ 7 \* 86400000/);
  assert.doesNotMatch(runtime, /MutationObserver/);

  assert.match(css, /availability-travel__controls/);
  assert.match(css, /box-sizing:\s*border-box/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /height:\s*44px/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.7fr\) minmax\(96px, \.8fr\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /rgba\(var\(--accent-rgb\)/);

  assert.match(edge, /AVAILABILITY_ADMIN_RUNTIME_VERSION = "20260901-5"/);
  assert.match(edge, /availability-travel-admin\.css\?v=\$\{AVAILABILITY_ADMIN_RUNTIME_VERSION\}/);
  assert.match(edge, /availability-travel-admin\.js\?v=\$\{AVAILABILITY_ADMIN_RUNTIME_VERSION\}/);
});
