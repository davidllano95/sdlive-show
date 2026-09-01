import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Apply status keeps the existing mode buttons as the sole canonical save trigger', () => {
  const runtime = fs.readFileSync('admin/availability-temporary-apply.js', 'utf8');
  assert.match(runtime, /const target = controls\.find/);
  assert.match(runtime, /allowCanonicalClick = true/);
  assert.match(runtime, /target\.click\(\)/);
  assert.doesNotMatch(runtime, /new CustomEvent/);
});
