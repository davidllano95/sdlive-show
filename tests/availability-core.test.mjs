import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateWeeklySchedule,
  normalizeAvailabilityOverrideInput,
  resolveAvailability
} from '../availability-core.js';

const tuesdayMorningBogota = new Date('2026-09-01T15:00:00.000Z');

function profile(schedule = {}, configured = true) {
  return {
    defaultTimezone: 'America/Bogota',
    weeklySchedule: schedule,
    configured
  };
}

const noTravel = { active: false, timezone: '' };

test('unconfigured schedule preserves the current Available behavior', () => {
  const result = evaluateWeeklySchedule(profile({}, false), noTravel, tuesdayMorningBogota);
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'compatibility-default');
});

test('weekly schedule resolves Available inside a configured local window', () => {
  const result = evaluateWeeklySchedule(
    profile({ tue: [['08:00', '18:00']] }),
    noTravel,
    tuesdayMorningBogota
  );
  assert.equal(result.status, 'available');
  assert.equal(result.source, 'weekly-schedule');
  assert.equal(result.timeZone, 'America/Bogota');
});

test('weekly schedule resolves Away outside the local window', () => {
  const result = evaluateWeeklySchedule(
    profile({ tue: [['11:00', '18:00']] }),
    noTravel,
    tuesdayMorningBogota
  );
  assert.equal(result.status, 'away');
});

test('travel mode changes the clock used by the weekly schedule without forcing Away', () => {
  const result = evaluateWeeklySchedule(
    profile({ tue: [['15:00', '18:00']] }),
    { active: true, timezone: 'Europe/Madrid' },
    tuesdayMorningBogota
  );
  assert.equal(result.status, 'available');
  assert.equal(result.timeZone, 'Europe/Madrid');
});

test('manual Limited override has precedence over the weekly schedule', () => {
  const result = resolveAvailability(
    profile({ tue: [['08:00', '18:00']] }),
    {
      mode: 'limited',
      expiresAt: '2026-09-01T17:00:00.000Z'
    },
    noTravel,
    tuesdayMorningBogota
  );
  assert.equal(result.status, 'limited');
  assert.equal(result.source, 'manual-override');
});

test('manual override requires an explicit bounded duration', () => {
  assert.equal(normalizeAvailabilityOverrideInput({ mode: 'away' }, tuesdayMorningBogota).ok, false);
  assert.equal(normalizeAvailabilityOverrideInput({ mode: 'away', durationMinutes: 5 }, tuesdayMorningBogota).ok, false);

  const normalized = normalizeAvailabilityOverrideInput(
    { mode: 'away', durationMinutes: 120 },
    tuesdayMorningBogota
  );
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.startsAt, '2026-09-01T15:00:00.000Z');
  assert.equal(normalized.value.expiresAt, '2026-09-01T17:00:00.000Z');
});

test('Auto clears temporary override timing', () => {
  const normalized = normalizeAvailabilityOverrideInput({ mode: 'auto' }, tuesdayMorningBogota);
  assert.deepEqual(normalized, {
    ok: true,
    value: { mode: 'auto', startsAt: null, expiresAt: null }
  });
});

test('public runtime contains bilingual copy and follows html lang changes', () => {
  const runtime = fs.readFileSync('availability-status.js', 'utf8');
  assert.match(runtime, /Available now/);
  assert.match(runtime, /Disponible ahora/);
  assert.match(runtime, /Limited response/);
  assert.match(runtime, /Respuesta limitada/);
  assert.match(runtime, /Currently away/);
  assert.match(runtime, /No disponible ahora/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /attributeFilter:\s*\["lang"\]/);
});

test('public runtime decorates the existing WhatsApp button instead of creating another floating CTA', () => {
  const runtime = fs.readFileSync('availability-status.js', 'utf8');
  assert.match(runtime, /getElementById\("whatsappFloat"\)/);
  assert.doesNotMatch(runtime, /createElement\("a"\)/);
});

test('Availability uses semantic green, amber and muted status colors', () => {
  const css = fs.readFileSync('availability-status.css', 'utf8');
  const runtime = fs.readFileSync('availability-status.js', 'utf8');
  assert.match(css, /--availability-available-rgb:\s*91, 214, 142/);
  assert.match(css, /--availability-limited-rgb:\s*245, 183, 72/);
  assert.match(css, /--availability-away-rgb:\s*142, 149, 166/);
  assert.match(css, /data-availability-state="available"[\s\S]*--availability-state-rgb:\s*var\(--availability-available-rgb\)/);
  assert.match(css, /data-availability-state="limited"[\s\S]*--availability-state-rgb:\s*var\(--availability-limited-rgb\)/);
  assert.match(runtime, /ensurePopover\(\)\.dataset\.availabilityState = state/);
});

test('Availability status is an integrated bilingual tab attached to the WhatsApp control', () => {
  const css = fs.readFileSync('availability-status.css', 'utf8');
  const runtime = fs.readFileSync('availability-status.js', 'utf8');
  assert.match(runtime, /tab:\s*"AVAILABLE"/);
  assert.match(runtime, /tab:\s*"DISPONIBLE"/);
  assert.match(runtime, /tab:\s*"LIMITED"/);
  assert.match(runtime, /tab:\s*"LIMITADO"/);
  assert.match(runtime, /tab = document\.createElement\("span"\)/);
  assert.match(runtime, /tab\.className = "availability-tab"/);
  assert.match(runtime, /button\.append\(tab\)/);
  assert.match(css, /\.availability-tab\s*\{[\s\S]*right:\s*calc\(100% - 11px\)/);
  assert.match(css, /data-availability-ready="true"[\s\S]*\.availability-tab/);
  assert.doesNotMatch(css, /availability-status-dot/);
});

test('popover hands off to the persistent tab instead of competing for the same space', () => {
  const runtime = fs.readFileSync('availability-status.js', 'utf8');
  assert.match(runtime, /function showPopover\(\{ autoHide = true, keepTab = false \} = \{\}\)/);
  assert.match(runtime, /if \(!keepTab\) hideTab\(\)/);
  assert.match(runtime, /function hidePopover\(\)[\s\S]*showTab\(120\)/);
  assert.match(runtime, /button\.dataset\.availabilityReady = "true"/);
  assert.match(runtime, /button\.dataset\.availabilityReady = "false"/);
});

test('button glow remains only a restrained depth cue once the tab is present', () => {
  const css = fs.readFileSync('availability-status.css', 'utf8');
  assert.match(css, /data-availability-state="available"[\s\S]*0 0 18px rgba\(var\(--availability-state-rgb\), 0\.14\)/);
  assert.match(css, /data-availability-state="limited"[\s\S]*0 0 14px rgba\(var\(--availability-state-rgb\), 0\.10\)/);
  assert.doesNotMatch(css, /availability-breathe-touch/);
  assert.doesNotMatch(css, /@keyframes availability-breathe/);
});

test('Availability public assets are cache-busted after the integrated tab change', () => {
  const edge = fs.readFileSync('showday-edge.js', 'utf8');
  assert.match(edge, /AVAILABILITY_RUNTIME_VERSION = "20260901-4"/);
  assert.match(edge, /availability-status\.css\?v=\$\{AVAILABILITY_RUNTIME_VERSION\}/);
  assert.match(edge, /availability-status\.js\?v=\$\{AVAILABILITY_RUNTIME_VERSION\}/);
});
