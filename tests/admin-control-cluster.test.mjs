import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Availability and Show Day are grouped into bounded compact dashboard cards', () => {
  const runtime = fs.readFileSync('admin/admin-control-cluster.js', 'utf8');
  const css = fs.readFileSync('admin/admin-control-cluster.css', 'utf8');
  const edge = fs.readFileSync('availability-admin-edge.js', 'utf8');

  assert.doesNotThrow(() => new Function(runtime));
  assert.match(runtime, /adminControlCluster/);
  assert.match(runtime, /availabilityAdminCard/);
  assert.match(runtime, /showDayQaControl/);
  assert.match(runtime, /Manage Show Day/);
  assert.match(runtime, /Auto · Force On · Force Off/);
  assert.match(runtime, /metrics\.after\(cluster\)/);
  assert.match(runtime, /MAX_ATTEMPTS = 8/);
  assert.doesNotMatch(runtime, /MutationObserver/);

  assert.match(css, /grid-template-columns: repeat\(2, minmax\(340px, 480px\)\)/);
  assert.match(css, /max-width: 970px/);
  assert.match(css, /showday-admin-manage__body/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /grid-template-columns: 1fr/);

  assert.match(edge, /ADMIN_CONTROL_CLUSTER_VERSION = "20260901-1"/);
  assert.match(edge, /admin-control-cluster\.css\?v=\$\{ADMIN_CONTROL_CLUSTER_VERSION\}/);
  assert.match(edge, /admin-control-cluster\.js\?v=\$\{ADMIN_CONTROL_CLUSTER_VERSION\}/);
});

test('Show Day compacting preserves existing control ids and runtime ownership', () => {
  const runtime = fs.readFileSync('admin/admin-control-cluster.js', 'utf8');
  const dashboard = fs.readFileSync('admin/dashboard.js', 'utf8');

  assert.match(dashboard, /id="showDayQaApply"/);
  assert.match(dashboard, /id="showDayQaStatus"/);
  assert.match(dashboard, /data-showday-mode="force_on"/);
  assert.doesNotMatch(runtime, /\/api\/admin\/showday-override/);
  assert.doesNotMatch(runtime, /fetch\(/);
});
