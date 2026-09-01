import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Temporary Status exposes a flexible hours/minutes timer instead of visible fixed-duration blocks', () => {
  const runtime = fs.readFileSync('admin/availability-temporary-timer.js', 'utf8');
  const css = fs.readFileSync('admin/availability-temporary-timer.css', 'utf8');
  const edge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /Temporary status hours/);
  assert.match(runtime, /Temporary status minutes/);
  assert.match(runtime, /MIN_MINUTES = 15/);
  assert.match(runtime, /MAX_MINUTES = 1440/);
  assert.match(runtime, /starts when you choose a status/);
  assert.match(runtime, /select\.hidden = true/);
  assert.match(runtime, /option\.dataset\.timerCustom = "true"/);
  assert.match(runtime, /new MutationObserver\(syncDisabled\)\.observe\(select/);

  assert.match(css, /availability-temporary-timer/);
  assert.match(css, /grid-template-columns/);
  assert.match(css, /@media \(max-width: 560px\)/);

  assert.match(edge, /AVAILABILITY_TEMPORARY_TIMER_VERSION = "20260901-1"/);
  assert.match(edge, /availability-temporary-timer\.css\?v=\$\{AVAILABILITY_TEMPORARY_TIMER_VERSION\}/);
  assert.match(edge, /availability-temporary-timer\.js\?v=\$\{AVAILABILITY_TEMPORARY_TIMER_VERSION\}/);
});

test('Temporary timer remains an enhancement of the existing canonical override write path', () => {
  const admin = fs.readFileSync('admin/availability-admin.js', 'utf8');
  const runtime = fs.readFileSync('admin/availability-temporary-timer.js', 'utf8');

  assert.match(admin, /durationMinutes:\s*Number\(durationSelect\.value\)/);
  assert.match(admin, /action:\s*"override"/);
  assert.doesNotMatch(runtime, /fetch\(/);
  assert.doesNotMatch(runtime, /\/api\/admin\/availability/);
});
