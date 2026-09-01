import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Temporary Status separates selection from application', () => {
  const runtime = fs.readFileSync('admin/availability-temporary-apply.js', 'utf8');
  const css = fs.readFileSync('admin/availability-temporary-apply.css', 'utf8');
  const edge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /availabilityTemporaryApply/);
  assert.match(runtime, /Apply status/);
  assert.match(runtime, /Not applied yet\./);
  assert.match(runtime, /event\.stopImmediatePropagation\(\)/);
  assert.match(runtime, /allowCanonicalClick = true/);
  assert.match(runtime, /target\.click\(\)/);
  assert.doesNotMatch(runtime, /fetch\(/);
  assert.doesNotMatch(runtime, /\/api\/admin\/availability/);

  assert.match(css, /availability-temporary__apply/);
  assert.match(css, /font-weight: 500/);
  assert.match(edge, /AVAILABILITY_TEMPORARY_APPLY_VERSION = "20260901-1"/);
  assert.match(edge, /availability-temporary-apply\.js\?v=\$\{AVAILABILITY_TEMPORARY_APPLY_VERSION\}/);
});

test('Temporary Status apply layer preserves the canonical existing write owner', () => {
  const core = fs.readFileSync('admin/availability-admin.js', 'utf8');
  const runtime = fs.readFileSync('admin/availability-temporary-apply.js', 'utf8');

  assert.match(core, /async function saveTemporary\(mode\)/);
  assert.match(core, /action:\s*"override"/);
  assert.match(core, /durationMinutes:\s*Number\(durationSelect\.value\)/);
  assert.doesNotMatch(runtime, /action:\s*["']override["']/);
});
