import test from "node:test";
import assert from "node:assert/strict";
import {
  addDevice,
  addInputBank,
  addSource,
  assignFeedToPort,
  createPatchProject,
  projectRouteRows,
  setPortState,
  validatePatch
} from "../patch-domain.js";

function ids() {
  let n = 0;
  return (prefix) => `${prefix}_${++n}`;
}

const fixedNow = () => new Date("2026-10-01T22:00:00.000Z");

test("source creation materializes one implicit Feed", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const result = addSource(project, { name:"Kick", inputMethod:"Mic" }, { now:fixedNow, idFactory });
  project = result.project;
  assert.equal(project.sources.length, 1);
  assert.equal(project.feeds.length, 1);
  assert.equal(result.feed.sourceId, result.source.id);
  assert.equal(result.feed.implicit, true);
  assert.equal(result.feed.inputMethod, "Mic");
});

test("fan-out OFF repatches the same Feed instead of silently branching", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const source = addSource(project, { name:"Bass" }, { now:fixedNow, idFactory });
  project = source.project;
  const device = addDevice(project, { name:"Rio A" }, { now:fixedNow, idFactory });
  project = device.project;
  const bank = addInputBank(project, { deviceId:device.device.id, count:2 }, { now:fixedNow, idFactory });
  project = bank.project;

  let assigned = assignFeedToPort(project, { feedId:source.feed.id, portId:bank.ports[0].id }, { now:fixedNow, idFactory });
  project = assigned.project;
  assert.equal(assigned.repatched, false);
  assert.equal(project.connections.length, 1);

  assigned = assignFeedToPort(project, { feedId:source.feed.id, portId:bank.ports[1].id }, { now:fixedNow, idFactory });
  project = assigned.project;
  assert.equal(assigned.repatched, true);
  assert.equal(project.connections.length, 1);
  assert.equal(project.connections[0].toPortId, bank.ports[1].id);
});

test("ordinary input cannot accept two simultaneous Feeds", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const a = addSource(project, { name:"Kick" }, { now:fixedNow, idFactory }); project = a.project;
  const b = addSource(project, { name:"Snare" }, { now:fixedNow, idFactory }); project = b.project;
  const d = addDevice(project, { name:"Rio A" }, { now:fixedNow, idFactory }); project = d.project;
  const bank = addInputBank(project, { deviceId:d.device.id, count:1 }, { now:fixedNow, idFactory }); project = bank.project;
  project = assignFeedToPort(project, { feedId:a.feed.id, portId:bank.ports[0].id }, { now:fixedNow, idFactory }).project;
  assert.throws(() => assignFeedToPort(project, { feedId:b.feed.id, portId:bank.ports[0].id }, { now:fixedNow, idFactory }), /patch_input_already_assigned/);
});

test("route projection and validation derive from the same project state", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const s = addSource(project, { name:"Lead Vocal", inputMethod:"Mic" }, { now:fixedNow, idFactory }); project = s.project;
  const d = addDevice(project, { name:"Stagebox A", rackLocation:"SL" }, { now:fixedNow, idFactory }); project = d.project;
  const bank = addInputBank(project, { deviceId:d.device.id, count:2 }, { now:fixedNow, idFactory }); project = bank.project;
  project = setPortState(project, bank.ports[0].id, { condition:"damaged", availability:"reserved" }, { now:fixedNow });
  project = assignFeedToPort(project, { feedId:s.feed.id, portId:bank.ports[0].id }, { now:fixedNow, idFactory }).project;

  const rows = projectRouteRows(project);
  assert.equal(rows[0].source.name, "Lead Vocal");
  assert.equal(rows[0].connections[0].device.name, "Stagebox A");
  assert.equal(rows[0].connections[0].port.name, "In 1");

  const status = validatePatch(project);
  assert.equal(status.validity, "valid");
  assert.equal(status.completeness, "complete");
  assert.deepEqual(status.issues.map((x) => x.code).sort(), ["damaged_port_assigned", "reserved_port_assigned"]);
});

test("unrouted Feed is incomplete, not a conflict", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  project = addSource(project, { name:"Violin" }, { now:fixedNow, idFactory }).project;
  const status = validatePatch(project);
  assert.equal(status.validity, "valid");
  assert.equal(status.completeness, "incomplete");
  assert.equal(status.issues.length, 0);
  assert.equal(status.incompleteFeedIds.length, 1);
});
