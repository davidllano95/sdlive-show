import { getPatchProfile } from "./patch-profiles.js";

export const PATCH_SMOKE_FORMAT_VERSION = 2;

const AVAILABILITY = new Set(["available", "reserved", "unavailable"]);
const CONDITION = new Set(["ok", "damaged"]);
const DIRECTION = new Set(["input", "output", "bidirectional"]);

function clone(value) {
  return structuredClone(value);
}

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function defaultIdFactory(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function requireText(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`patch_${field}_required`);
  return text;
}

function assertProject(project) {
  if (!project || typeof project !== "object") throw new Error("patch_project_required");
}

function touch(project, now) {
  project.updatedAt = nowIso(now);
  return project;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizePatchProject(project) {
  assertProject(project);
  const next = clone(project);
  next.formatVersion = PATCH_SMOKE_FORMAT_VERSION;
  next.settings = {
    sourceFanOut: false,
    ...(next.settings || {})
  };
  next.sources = normalizeArray(next.sources).map((source, index) => ({
    stagePosition: "",
    order: index + 1,
    ...source
  }));
  next.feeds = normalizeArray(next.feeds);
  next.devices = normalizeArray(next.devices);
  next.ioBanks = normalizeArray(next.ioBanks);
  next.ports = normalizeArray(next.ports);
  next.consoleChannels = normalizeArray(next.consoleChannels);
  next.connections = normalizeArray(next.connections);
  next.consoleAssignments = normalizeArray(next.consoleAssignments);
  return next;
}

export function createPatchProject({
  id,
  name = "Untitled Patch",
  now,
  idFactory = defaultIdFactory
} = {}) {
  const createdAt = nowIso(now);
  return {
    formatVersion: PATCH_SMOKE_FORMAT_VERSION,
    id: id || idFactory("patch"),
    name: requireText(name, "project_name"),
    mode: "single",
    createdAt,
    updatedAt: createdAt,
    settings: {
      sourceFanOut: false
    },
    sources: [],
    feeds: [],
    devices: [],
    ioBanks: [],
    ports: [],
    consoleChannels: [],
    connections: [],
    consoleAssignments: []
  };
}

export function renamePatch(project, name, { now } = {}) {
  const next = normalizePatchProject(project);
  next.name = requireText(name, "project_name");
  return touch(next, now);
}

export function addSource(project, {
  name,
  inputMethod = "Mic",
  feedQualifier = "",
  stagePosition = ""
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = normalizePatchProject(project);
  const source = {
    id: idFactory("src"),
    name: requireText(name, "source_name"),
    stagePosition: String(stagePosition || "").trim(),
    order: next.sources.length + 1,
    createdAt: nowIso(now)
  };
  const feed = {
    id: idFactory("feed"),
    sourceId: source.id,
    qualifier: String(feedQualifier || "").trim(),
    inputMethod: String(inputMethod || "").trim() || "Unknown",
    implicit: true,
    createdAt: nowIso(now)
  };
  next.sources.push(source);
  next.feeds.push(feed);
  touch(next, now);
  return { project: next, source, feed };
}

export function updateSource(project, sourceId, changes = {}, { now } = {}) {
  const next = normalizePatchProject(project);
  const source = next.sources.find((item) => item.id === sourceId);
  if (!source) throw new Error("patch_source_not_found");
  if (changes.name !== undefined) source.name = requireText(changes.name, "source_name");
  if (changes.stagePosition !== undefined) source.stagePosition = String(changes.stagePosition || "").trim();
  touch(next, now);
  return next;
}

export function updateFeed(project, feedId, changes = {}, { now } = {}) {
  const next = normalizePatchProject(project);
  const feed = next.feeds.find((item) => item.id === feedId);
  if (!feed) throw new Error("patch_feed_not_found");
  if (changes.inputMethod !== undefined) feed.inputMethod = String(changes.inputMethod || "").trim() || "Unknown";
  if (changes.qualifier !== undefined) feed.qualifier = String(changes.qualifier || "").trim();
  touch(next, now);
  return next;
}

export function addDevice(project, {
  name,
  rackLocation = "",
  kind = "stage-io",
  profileId = null,
  manufacturer = "",
  model = ""
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = normalizePatchProject(project);
  const device = {
    id: idFactory("dev"),
    name: requireText(name, "device_name"),
    kind: String(kind || "device"),
    profileId: profileId || null,
    manufacturer: String(manufacturer || ""),
    model: String(model || ""),
    rackLocation: String(rackLocation || "").trim(),
    createdAt: nowIso(now)
  };
  next.devices.push(device);
  touch(next, now);
  return { project: next, device };
}

export function addPort(project, {
  deviceId,
  bankId = null,
  name,
  direction = "input",
  signalProtocol = "Analog",
  connector = "",
  availability = "available",
  condition = "ok",
  index = null
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = normalizePatchProject(project);
  if (!next.devices.some((item) => item.id === deviceId)) throw new Error("patch_device_not_found");
  if (!DIRECTION.has(direction)) throw new Error("patch_invalid_port_direction");
  if (!AVAILABILITY.has(availability)) throw new Error("patch_invalid_port_availability");
  if (!CONDITION.has(condition)) throw new Error("patch_invalid_port_condition");
  const port = {
    id: idFactory("port"),
    deviceId,
    bankId,
    name: requireText(name, "port_name"),
    direction,
    signalProtocol: String(signalProtocol || "Unknown"),
    connector: String(connector || ""),
    availability,
    condition,
    index,
    createdAt: nowIso(now)
  };
  next.ports.push(port);
  touch(next, now);
  return { project: next, port };
}

export function addInputBank(project, {
  deviceId,
  count,
  prefix = "In",
  signalProtocol = "Analog"
}, options = {}) {
  let next = normalizePatchProject(project);
  const ports = [];
  const total = Number(count);
  if (!Number.isInteger(total) || total < 1 || total > 256) throw new Error("patch_invalid_port_count");
  const bankId = options.idFactory ? options.idFactory("bank") : defaultIdFactory("bank");
  next.ioBanks.push({
    id: bankId,
    deviceId,
    profileBankId: null,
    name: "Inputs",
    direction: "input",
    signalProtocol,
    connector: "",
    createdAt: nowIso(options.now)
  });
  for (let index = 1; index <= total; index += 1) {
    const result = addPort(next, {
      deviceId,
      bankId,
      name: `${prefix} ${index}`,
      direction: "input",
      signalProtocol,
      index
    }, options);
    next = result.project;
    ports.push(result.port);
  }
  return { project: next, ports };
}

export function addDeviceFromProfile(project, {
  profileId,
  name = "",
  rackLocation = ""
}, { now, idFactory = defaultIdFactory } = {}) {
  const profile = getPatchProfile(profileId);
  if (!profile) throw new Error("patch_profile_not_found");

  let next = normalizePatchProject(project);
  const created = addDevice(next, {
    name: String(name || "").trim() || profile.model,
    rackLocation,
    kind: profile.kind,
    profileId: profile.id,
    manufacturer: profile.manufacturer,
    model: profile.model
  }, { now, idFactory });
  next = created.project;
  const device = created.device;

  for (const profileBank of profile.banks || []) {
    const bankId = idFactory("bank");
    next.ioBanks.push({
      id: bankId,
      deviceId: device.id,
      profileBankId: profileBank.id,
      name: profileBank.name,
      direction: profileBank.direction,
      signalProtocol: profileBank.signalProtocol,
      connector: profileBank.connector,
      createdAt: nowIso(now)
    });
    for (let index = 1; index <= profileBank.count; index += 1) {
      const result = addPort(next, {
        deviceId: device.id,
        bankId,
        name: `${profileBank.prefix} ${index}`,
        direction: profileBank.direction,
        signalProtocol: profileBank.signalProtocol,
        connector: profileBank.connector,
        index
      }, { now, idFactory });
      next = result.project;
    }
  }

  if (profile.kind === "console" && profile.consoleChannels) {
    for (let index = 1; index <= profile.consoleChannels.mono; index += 1) {
      next.consoleChannels.push({
        id: idFactory("ch"),
        deviceId: device.id,
        name: `Ch ${index}`,
        index,
        format: "mono",
        profileFamily: "input-mono",
        createdAt: nowIso(now)
      });
    }
    for (let index = 1; index <= profile.consoleChannels.stereo; index += 1) {
      next.consoleChannels.push({
        id: idFactory("ch"),
        deviceId: device.id,
        name: `ST IN ${index}`,
        index,
        format: "stereo",
        profileFamily: "input-stereo",
        createdAt: nowIso(now)
      });
    }
  }

  touch(next, now);
  return { project: next, device, profile };
}

export function setPortState(project, portId, changes = {}, { now } = {}) {
  const next = normalizePatchProject(project);
  const port = next.ports.find((item) => item.id === portId);
  if (!port) throw new Error("patch_port_not_found");
  if (changes.availability !== undefined) {
    if (!AVAILABILITY.has(changes.availability)) throw new Error("patch_invalid_port_availability");
    port.availability = changes.availability;
  }
  if (changes.condition !== undefined) {
    if (!CONDITION.has(changes.condition)) throw new Error("patch_invalid_port_condition");
    port.condition = changes.condition;
  }
  touch(next, now);
  return next;
}

export function assignFeedToPort(project, {
  feedId,
  portId
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = normalizePatchProject(project);
  const feed = next.feeds.find((item) => item.id === feedId);
  const port = next.ports.find((item) => item.id === portId);
  if (!feed) throw new Error("patch_feed_not_found");
  if (!port) throw new Error("patch_port_not_found");
  if (!(port.direction === "input" || port.direction === "bidirectional")) throw new Error("patch_destination_not_input");

  const occupiedBy = next.connections.find((item) => item.toPortId === portId && item.feedId !== feedId);
  if (occupiedBy) throw new Error("patch_input_already_assigned");

  const existingForFeed = next.connections.filter((item) => item.feedId === feedId);
  let repatched = false;
  if (!next.settings?.sourceFanOut && existingForFeed.length) {
    next.connections = next.connections.filter((item) => item.feedId !== feedId);
    repatched = existingForFeed.some((item) => item.toPortId !== portId);
  }

  const already = next.connections.find((item) => item.feedId === feedId && item.toPortId === portId);
  if (!already) {
    next.connections.push({
      id: idFactory("conn"),
      feedId,
      toPortId: portId,
      state: "planned",
      createdAt: nowIso(now)
    });
  }
  touch(next, now);
  return { project: next, repatched };
}

export function assignFeedToConsoleChannel(project, {
  feedId,
  channelId
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = normalizePatchProject(project);
  const feed = next.feeds.find((item) => item.id === feedId);
  const channel = next.consoleChannels.find((item) => item.id === channelId);
  if (!feed) throw new Error("patch_feed_not_found");
  if (!channel) throw new Error("patch_console_channel_not_found");

  const occupiedBy = next.consoleAssignments.find(
    (item) => item.channelId === channelId && item.feedId !== feedId
  );
  if (occupiedBy) throw new Error("patch_console_channel_already_assigned");

  const existing = next.consoleAssignments.find((item) => item.feedId === feedId);
  let repatched = false;
  if (existing) {
    repatched = existing.channelId !== channelId;
    existing.channelId = channelId;
  } else {
    next.consoleAssignments.push({
      id: idFactory("assign"),
      feedId,
      channelId,
      createdAt: nowIso(now)
    });
  }
  touch(next, now);
  return { project: next, repatched };
}

export function disconnectFeed(project, feedId, { now } = {}) {
  const next = normalizePatchProject(project);
  next.connections = next.connections.filter((item) => item.feedId !== feedId);
  touch(next, now);
  return next;
}

export function disconnectFeedFromConsoleChannel(project, feedId, { now } = {}) {
  const next = normalizePatchProject(project);
  next.consoleAssignments = next.consoleAssignments.filter((item) => item.feedId !== feedId);
  touch(next, now);
  return next;
}

export function projectRouteRows(project) {
  const normalized = normalizePatchProject(project);
  const sources = new Map(normalized.sources.map((item) => [item.id, item]));
  const devices = new Map(normalized.devices.map((item) => [item.id, item]));
  const ports = new Map(normalized.ports.map((item) => [item.id, item]));
  const channels = new Map(normalized.consoleChannels.map((item) => [item.id, item]));
  const connectionsByFeed = new Map();
  for (const connection of normalized.connections) {
    const list = connectionsByFeed.get(connection.feedId) || [];
    list.push(connection);
    connectionsByFeed.set(connection.feedId, list);
  }
  const consoleByFeed = new Map(normalized.consoleAssignments.map((item) => [item.feedId, item]));

  return normalized.feeds
    .map((feed) => {
      const source = sources.get(feed.sourceId) || null;
      const connections = (connectionsByFeed.get(feed.id) || []).map((connection) => {
        const port = ports.get(connection.toPortId) || null;
        const device = port ? devices.get(port.deviceId) || null : null;
        return { connection, port, device };
      });
      const assignment = consoleByFeed.get(feed.id) || null;
      const channel = assignment ? channels.get(assignment.channelId) || null : null;
      const consoleDevice = channel ? devices.get(channel.deviceId) || null : null;
      return {
        source,
        feed,
        connections,
        consoleAssignment: assignment
          ? { assignment, channel, device: consoleDevice }
          : null
      };
    })
    .sort((a, b) => (a.source?.order || 0) - (b.source?.order || 0));
}

export function validatePatch(project) {
  const normalized = normalizePatchProject(project);
  const issues = [];
  const feeds = new Map(normalized.feeds.map((item) => [item.id, item]));
  const ports = new Map(normalized.ports.map((item) => [item.id, item]));
  const incoming = new Map();

  for (const connection of normalized.connections) {
    if (!feeds.has(connection.feedId)) {
      issues.push({ severity: "conflict", code: "connection_missing_feed", connectionId: connection.id });
      continue;
    }
    const port = ports.get(connection.toPortId);
    if (!port) {
      issues.push({ severity: "conflict", code: "connection_missing_port", connectionId: connection.id });
      continue;
    }
    const count = (incoming.get(port.id) || 0) + 1;
    incoming.set(port.id, count);
    if (count > 1) issues.push({ severity: "conflict", code: "input_double_assignment", portId: port.id });
    if (port.condition === "damaged") issues.push({ severity: "warning", code: "damaged_port_assigned", portId: port.id });
    if (port.availability === "reserved") issues.push({ severity: "warning", code: "reserved_port_assigned", portId: port.id });
    if (port.availability === "unavailable") issues.push({ severity: "warning", code: "unavailable_port_assigned", portId: port.id });
  }

  const consoleIncoming = new Map();
  for (const assignment of normalized.consoleAssignments) {
    const count = (consoleIncoming.get(assignment.channelId) || 0) + 1;
    consoleIncoming.set(assignment.channelId, count);
    if (count > 1) {
      issues.push({
        severity: "conflict",
        code: "console_channel_double_assignment",
        channelId: assignment.channelId
      });
    }
  }

  const connectedFeedIds = new Set(normalized.connections.map((item) => item.feedId));
  const consoleAssignedFeedIds = new Set(normalized.consoleAssignments.map((item) => item.feedId));
  const hasConsole = normalized.devices.some((item) => item.kind === "console");
  const incompleteFeedIds = [];
  const incompleteReasonsByFeed = {};

  for (const feed of normalized.feeds) {
    const reasons = [];
    if (!connectedFeedIds.has(feed.id)) reasons.push("input");
    if (hasConsole && !consoleAssignedFeedIds.has(feed.id)) reasons.push("console-channel");
    if (reasons.length) {
      incompleteFeedIds.push(feed.id);
      incompleteReasonsByFeed[feed.id] = reasons;
    }
  }

  return {
    validity: issues.some((item) => item.severity === "conflict") ? "conflict" : "valid",
    completeness: incompleteFeedIds.length ? "incomplete" : "complete",
    issues,
    incompleteFeedIds,
    incompleteReasonsByFeed
  };
}
