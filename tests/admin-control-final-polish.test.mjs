import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('final control polish removes glyph chevrons and normalizes pill alignment', () => {
  const runtime = fs.readFileSync('admin/admin-control-final-polish.js', 'utf8');
  const css = fs.readFileSync('admin/admin-control-final-polish.css', 'utf8');
  const edge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /chevron\.textContent = ""/);
  assert.match(runtime, /dataset\.cssChevron = "true"/);
  assert.doesNotMatch(runtime, /MutationObserver/);

  assert.match(css, /availability-admin-card__status,[\s\S]*showday-control__status,[\s\S]*availability-travel__status/);
  assert.match(css, /align-items: center !important/);
  assert.match(css, /justify-content: center !important/);
  assert.match(css, /height: 25px !important/);
  assert.match(css, /font-weight: 500 !important/);
  assert.match(css, /availability-admin-manage__chevron::before/);
  assert.match(css, /position: absolute/);

  assert.match(edge, /ADMIN_CONTROL_FINAL_POLISH_VERSION = "20260901-1"/);
  assert.match(edge, /admin-control-final-polish\.css\?v=\$\{ADMIN_CONTROL_FINAL_POLISH_VERSION\}/);
  assert.match(edge, /admin-control-final-polish\.js\?v=\$\{ADMIN_CONTROL_FINAL_POLISH_VERSION\}/);
});
