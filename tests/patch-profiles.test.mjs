import test from "node:test";
import assert from "node:assert/strict";
import {
  addDeviceFromProfile,
  addSource,
  assignFeedToConsoleChannel,
  createPatchProject,
  normalizePatchProject,
  projectRouteRows,
  validatePatch
} from "../patch-domain.js";
import { getPatchProfile, listPatchProfiles } from "../patch-profiles.js";

function ids() {
  let n = 0;
  return (prefix) => `${prefix}_${++n}`;
}

const fixedNow = () => new Date("2026-10-01T22:00:00.000Z");

test("verified Yamaha console profiles expose model-defined capacity", () => {
  const cl5 = getPatchProfile("yamaha-cl5");
  const ql5 = getPatchProfile("yamaha-ql5");

  assert.equal(cl5.consoleChannels.mono, 72);
  assert.equal(cl5.consoleChannels.stereo, 8);
  assert.deepEqual(
    cl5.banks.map((bank) => [bank.id, bank.count]),
    [["local-in", 8], ["local-out", 8], ["dante-rx", 64], ["dante-tx", 64]]
  );

  assert.equal(ql5.consoleChannels.mono, 64);
  assert.equal(ql5.consoleChannels.stereo, 8);
  assert.deepEqual(
    ql5.banks.map((bank) => [bank.id, bank.count]),
    [["local-in", 32], ["local-out", 16], ["dante-rx", 64], ["dante-tx", 64]]
  );
});

test("verified Rio profiles expose physical and network capacity", () => {
  const rio3224 = getPatchProfile("yamaha-rio3224-d2");
  const rio1608 = getPatchProfile("yamaha-rio1608-d2");

  assert.deepEqual(
    rio3224.banks.map((bank) => [bank.id, bank.count]),
    [["analog-in", 32], ["analog-out", 16], ["dante-tx", 32], ["dante-rx", 24], ["aes-out", 8]]
  );
  assert.deepEqual(
    rio1608.banks.map((bank) => [bank.id, bank.count]),
    [["analog-in", 16], ["analog-out", 8], ["dante-tx", 16], ["dante-rx", 8]]
  );
});

test("instantiating CL5 creates I/O banks, ports and logical channels automatically", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const result = addDeviceFromProfile(project, { profileId:"yamaha-cl5", name:"CL5 FOH" }, { now:fixedNow, idFactory });
  project = result.project;

  assert.equal(project.devices.length, 1);
  assert.equal(project.ioBanks.length, 4);
  assert.equal(project.ports.length, 144);
  assert.equal(project.consoleChannels.filter((ch) => ch.format === "mono").length, 72);
  assert.equal(project.consoleChannels.filter((ch) => ch.format === "stereo").length, 8);
  assert.equal(project.consoleChannels.length, 80);
  assert.equal(project.ports.find((port) => port.name === "Local In 1").signalProtocol, "Analog");
  assert.equal(project.ports.find((port) => port.name === "Dante Rx 64").signalProtocol, "Dante");
});

test("same Feed may map to one logical channel per Console Instance", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  const source = addSource(project, { name:"Kick" }, { now:fixedNow, idFactory });
  project = source.project;

  const foh = addDeviceFromProfile(project, { profileId:"yamaha-cl5", name:"CL5 FOH" }, { now:fixedNow, idFactory });
  project = foh.project;
  const mon = addDeviceFromProfile(project, { profileId:"yamaha-ql5", name:"QL5 MON" }, { now:fixedNow, idFactory });
  project = mon.project;

  const fohCh1 = project.consoleChannels.find((ch) => ch.deviceId === foh.device.id && ch.name === "Ch 1");
  const monCh1 = project.consoleChannels.find((ch) => ch.deviceId === mon.device.id && ch.name === "Ch 1");

  project = assignFeedToConsoleChannel(project, { feedId:source.feed.id, channelId:fohCh1.id }, { now:fixedNow, idFactory }).project;
  project = assignFeedToConsoleChannel(project, { feedId:source.feed.id, channelId:monCh1.id }, { now:fixedNow, idFactory }).project;

  const row = projectRouteRows(project)[0];
  assert.equal(row.consoleAssignments.length, 2);
  assert.deepEqual(row.consoleAssignments.map((item) => item.device.name), ["CL5 FOH", "QL5 MON"]);
});

test("v1 local project normalizes into the v2 profile-capable shape", () => {
  const normalized = normalizePatchProject({
    formatVersion: 1,
    id: "legacy",
    name: "Legacy",
    settings: {},
    sources: [],
    feeds: [],
    devices: [],
    ports: [],
    connections: []
  });

  assert.equal(normalized.formatVersion, 2);
  assert.deepEqual(normalized.ioBanks, []);
  assert.deepEqual(normalized.consoleChannels, []);
  assert.deepEqual(normalized.consoleAssignments, []);
});

test("a Feed is incomplete when a console exists but no Console Channel is assigned", () => {
  const idFactory = ids();
  let project = createPatchProject({ id:"patch_test", name:"Smoke", now:fixedNow, idFactory });
  project = addSource(project, { name:"Vocal" }, { now:fixedNow, idFactory }).project;
  project = addDeviceFromProfile(project, { profileId:"yamaha-cl5" }, { now:fixedNow, idFactory }).project;

  const status = validatePatch(project);
  assert.equal(status.completeness, "incomplete");
  assert.deepEqual(Object.values(status.incompleteReasonsByFeed)[0], ["input", "console-channel"]);
});

test("catalog keeps console and stage-I/O profiles separated for setup UI", () => {
  assert.ok(listPatchProfiles("console").every((profile) => profile.kind === "console"));
  assert.ok(listPatchProfiles("stage-io").every((profile) => profile.kind === "stage-io"));
});
