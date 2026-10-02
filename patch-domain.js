export const PATCH_SMOKE_FORMAT_VERSION = 1;

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
    ports: [],
    connections: []
  };
}

export function renamePatch(project, name, { now } = {}) {
  const next = clone(project);
  assertProject(next);
  next.name = requireText(name, "project_name");
  return touch(next, now);
}

export function addSource(project, {
  name,
  inputMethod = "Mic",
  feedQualifier = ""
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = clone(project);
  assertProject(next);
  const source = {
    id: idFactory("src"),
    name: requireText(name, "source_name"),
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

export function addDevice(project, {
  name,
  rackLocation = "",
  kind = "stage-io"
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = clone(project);
  assertProject(next);
  const device = {
    id: idFactory("dev"),
    name: requireText(name, "device_name"),
    kind: String(kind || "device"),
    rackLocation: String(rackLocation || "").trim(),
    createdAt: nowIso(now)
  };
  next.devices.push(device);
  touch(next, now);
  return { project: next, device };
}

export function addPort(project, {
  deviceId,
  name,
  direction = "input",
  signalProtocol = "Analog",
  availability = "available",
  condition = "ok"
}, { now, idFactory = defaultIdFactory } = {}) {
  const next = clone(project);
  assertProject(next);
  if (!next.devices.some((item) => item.id === deviceId)) throw new Error("patch_device_not_found");
  if (!DIRECTION.has(direction)) throw new Error("patch_invalid_port_direction");
  if (!AVAILABILITY.has(availability)) throw new Error("patch_invalid_port_availability");
  if (!CONDITION.has(condition)) throw new Error("patch_invalid_port_condition");
  const port = {
    id: idFactory("port"),
    deviceId,
    name: requireText(name, "port_name"),
    direction,
    signalProtocol: String(signalProtocol || "Unknown"),
    availability,
    condition,
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
  let next = project;
  const ports = [];
  const total = Number(count);
  if (!Number.isInteger(total) || total < 1 || total > 256) throw new Error("patch_invalid_port_count");
  for (let index = 1; index <= total; index += 1) {
    const result = addPort(next, {
      deviceId,
      name: `${prefix} ${index}`,
      direction: "input",
      signalProtocol
    }, options);
    next = result.project;
    ports.push(result.port);
  }
  return { project: next, ports };
}

export function setPortState(project, portId, changes = {}, { now } = {}) {
  const next = clone(project);
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
  const next = clone(project);
  assertProject(next);
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

export function disconnectFeed(project, feedId, { now } = {}) {
  const next = clone(project);
  next.connections = next.connections.filter((item) => item.feedId !== feedId);
  touch(next, now);
  return next;
}

export function projectRouteRows(project) {
  assertProject(project);
  const sources = new Map(project.sources.map((item) => [item.id, item]));
  const devices = new Map(project.devices.map((item) => [item.id, item]));
  const ports = new Map(project.ports.map((item) => [item.id, item]));
  const connectionsByFeed = new Map();
  for (const connection of project.connections) {
    const list = connectionsByFeed.get(connection.feedId) || [];
    list.push(connection);
    connectionsByFeed.set(connection.feedId, list);
  }

  return project.feeds.map((feed) => {
    const source = sources.get(feed.sourceId) || null;
    const connections = (connectionsByFeed.get(feed.id) || []).map((connection) => {
      const port = ports.get(connection.toPortId) || null;
      const device = port ? devices.get(port.deviceId) || null : null;
      return { connection, port, device };
    });
    return { source, feed, connections };
  });
}

export function validatePatch(project) {
  assertProject(project);
  const issues = [];
  const feeds = new Map(project.feeds.map((item) => [item.id, item]));
  const ports = new Map(project.ports.map((item) => [item.id, item]));
  const incoming = new Map();

  for (const connection of project.connections) {
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

  const connectedFeedIds = new Set(project.connections.map((item) => item.feedId));
  const incompleteFeedIds = project.feeds.filter((item) => !connectedFeedIds.has(item.id)).map((item) => item.id);

  return {
    validity: issues.some((item) => item.severity === "conflict") ? "conflict" : "valid",
    completeness: incompleteFeedIds.length ? "incomplete" : "complete",
    issues,
    incompleteFeedIds
  };
}
