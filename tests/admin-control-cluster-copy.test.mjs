import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('compact control disclosures keep concise operational labels', () => {
  const runtime = fs.readFileSync('admin/admin-control-cluster.js', 'utf8');
  assert.match(runtime, /Manage Show Day/);
  assert.match(runtime, /Auto · Force On · Force Off/);
});
