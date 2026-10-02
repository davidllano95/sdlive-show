import {
  addDevice,
  addInputBank,
  addSource,
  assignFeedToPort,
  createPatchProject,
  disconnectFeed,
  projectRouteRows,
  renamePatch,
  setPortState,
  validatePatch
} from "../../patch-domain.js";
import { loadLocalPatch, saveLocalPatch } from "./patch-storage.js";

const LOCAL_PROJECT_ID = "patch-smoke-local";
const AUTOSAVE_DELAY_MS = 650;

const $ = (id) => document.getElementById(id);
const elements = {
  saveState: $("saveState"),
  savePatch: $("savePatch"),
  reloadPatch: $("reloadPatch"),
  newPatch: $("newPatch"),
  projectName: $("projectName"),
  projectHeading: $("projectHeading"),
  projectMeta: $("projectMeta"),
  validityChip: $("validityChip"),
  completenessChip: $("completenessChip"),
  sourceForm: $("sourceForm"),
  sourceName: $("sourceName"),
  inputMethod: $("inputMethod"),
  deviceForm: $("deviceForm"),
  deviceName: $("deviceName"),
  deviceInputs: $("deviceInputs"),
  deviceProtocol: $("deviceProtocol"),
  routeForm: $("routeForm"),
  routeFeed: $("routeFeed"),
  routePort: $("routePort"),
  routeMessage: $("routeMessage"),
  routeRows: $("routeRows"),
  systemView: $("systemView"),
  deviceList: $("deviceList"),
  validationPanel: $("validationPanel")
};

let project = null;
let saveTimer = null;
let saveSequence = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
}

function setSaveState(text, className = "") {
  elements.saveState.textContent = text;
  elements.saveState.className = `patch-save-state${className ? ` ${className}` : ""}`;
}

function markDirty() {
  setSaveState("Unsaved changes", "is-dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow("autosave"), AUTOSAVE_DELAY_MS);
}

async function saveNow(reason = "manual") {
  if (!project) return;
  const sequence = ++saveSequence;
  clearTimeout(saveTimer);
  setSaveState("Saving…");
  try {
    await saveLocalPatch(project);
    if (sequence === saveSequence) {
      setSaveState(reason === "autosave" ? "Saved locally" : "Saved locally", "is-saved");
    }
  } catch (error) {
    console.error("[Patch Smoke] local save failed", error);
    if (sequence === saveSequence) setSaveState("Save failed", "is-error");
  }
}

function mutate(nextProject, { message = "" } = {}) {
  project = nextProject;
  if (message) {
    elements.routeMessage.textContent = message;
    elements.routeMessage.className = "patch-inline-message is-good";
  }
  render();
  markDirty();
}

function routeLabel(row) {
  if (!row.connections.length) return "TBD";
  return row.connections
    .map(({ device, port }) => `${device?.name || "Unknown device"} / ${port?.name || "Unknown port"}`)
    .join(" + ");
}

function renderSelectors(rows) {
  const previousFeed = elements.routeFeed.value;
  const previousPort = elements.routePort.value;

  elements.routeFeed.innerHTML = rows.length
    ? rows.map(({ source, feed }) =>
        `<option value="${escapeHtml(feed.id)}">${escapeHtml(source?.name || "Unknown Source")}${feed.qualifier ? ` · ${escapeHtml(feed.qualifier)}` : ""}</option>`
      ).join("")
    : '<option value="">Add a Source first</option>';

  if (previousFeed && project.feeds.some((feed) => feed.id === previousFeed)) {
    elements.routeFeed.value = previousFeed;
  }

  const devices = new Map(project.devices.map((device) => [device.id, device]));
  const eligiblePorts = project.ports.filter(
    (port) => port.direction === "input" || port.direction === "bidirectional"
  );

  elements.routePort.innerHTML = eligiblePorts.length
    ? eligiblePorts.map((port) => {
        const device = devices.get(port.deviceId);
        const assigned = project.connections.find(
          (connection) => connection.toPortId === port.id
        );
        const suffix = assigned ? " · assigned" : "";
        return `<option value="${escapeHtml(port.id)}">${escapeHtml(device?.name || "Device")} / ${escapeHtml(port.name)}${suffix}</option>`;
      }).join("")
    : '<option value="">Add an input device first</option>';

  if (previousPort && eligiblePorts.some((port) => port.id === previousPort)) {
    elements.routePort.value = previousPort;
  }
}

function renderRows(rows, validation) {
  const incomplete = new Set(validation.incompleteFeedIds);

  elements.routeRows.innerHTML = rows.length
    ? rows.map(({ source, feed, connections }) => {
        const routing = connections.length
          ? connections.map(({ device, port }) =>
              `<span class="patch-route-pill">${escapeHtml(device?.name || "Unknown")} / ${escapeHtml(port?.name || "Unknown")}</span>`
            ).join(" ")
          : '<span class="patch-empty">TBD</span>';

        const status = incomplete.has(feed.id) ? "Incomplete" : "Planned";

        return `<tr>
          <td><strong>${escapeHtml(source?.name || "Unknown Source")}</strong></td>
          <td>${escapeHtml(feed.inputMethod)}</td>
          <td>${routing}</td>
          <td>${escapeHtml(status)}</td>
          <td>${connections.length ? `<button class="patch-mini-button" type="button" data-disconnect-feed="${escapeHtml(feed.id)}">Disconnect</button>` : ""}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="5" class="patch-empty">Add a Source to begin.</td></tr>';
}

function renderSystem(rows) {
  elements.systemView.innerHTML = rows.length
    ? rows.map((row) => {
        const destination = row.connections.length
          ? routeLabel(row)
          : "Unassigned / TBD";

        return `<div class="system-route">
          <div class="system-node">
            <strong>${escapeHtml(row.source?.name || "Unknown Source")}</strong>
            <span>${escapeHtml(row.feed.inputMethod)} · implicit Feed</span>
          </div>
          <span class="system-arrow" aria-hidden="true">→</span>
          <div class="system-node">
            <strong>${escapeHtml(destination)}</strong>
            <span>${row.connections.length ? "Input endpoint" : "Incomplete route"}</span>
          </div>
        </div>`;
      }).join("")
    : '<div class="patch-empty">No Sources yet.</div>';
}

function renderDevices() {
  elements.deviceList.innerHTML = project.devices.length
    ? project.devices.map((device) => {
        const ports = project.ports.filter((port) => port.deviceId === device.id);

        return `<section class="device-card">
          <div class="device-card__head">
            <strong>${escapeHtml(device.name)}</strong>
            <span>${ports.length} ports${device.rackLocation ? ` · ${escapeHtml(device.rackLocation)}` : ""}</span>
          </div>
          <div class="port-grid">
            ${ports.map((port) => `<div class="port-row">
              <strong>${escapeHtml(port.name)}</strong>
              <select data-port-availability="${escapeHtml(port.id)}" aria-label="Availability for ${escapeHtml(port.name)}">
                <option value="available"${port.availability === "available" ? " selected" : ""}>Available</option>
                <option value="reserved"${port.availability === "reserved" ? " selected" : ""}>Reserved</option>
                <option value="unavailable"${port.availability === "unavailable" ? " selected" : ""}>Unavailable</option>
              </select>
              <select data-port-condition="${escapeHtml(port.id)}" aria-label="Condition for ${escapeHtml(port.name)}">
                <option value="ok"${port.condition === "ok" ? " selected" : ""}>OK</option>
                <option value="damaged"${port.condition === "damaged" ? " selected" : ""}>Damaged</option>
              </select>
            </div>`).join("")}
          </div>
        </section>`;
      }).join("")
    : '<div class="patch-empty">No Devices yet.</div>';
}

function issueText(issue) {
  const port = issue.portId
    ? project.ports.find((item) => item.id === issue.portId)
    : null;
  const device = port
    ? project.devices.find((item) => item.id === port.deviceId)
    : null;
  const where = port ? `${device?.name || "Device"} / ${port.name}` : "Route";

  const labels = {
    damaged_port_assigned: `${where}: assigned port is marked Damaged.`,
    reserved_port_assigned: `${where}: assigned port is Reserved.`,
    unavailable_port_assigned: `${where}: assigned port is Unavailable.`,
    input_double_assignment: `${where}: ordinary input has multiple simultaneous Feeds.`,
    connection_missing_feed: "Connection references a missing Feed.",
    connection_missing_port: "Connection references a missing Port."
  };

  return labels[issue.code] || issue.code;
}

function renderValidation(validation) {
  elements.validityChip.textContent =
    validation.validity === "valid" ? "Valid" : "Conflict";
  elements.validityChip.className =
    `patch-chip ${validation.validity === "valid" ? "is-good" : "is-conflict"}`;

  elements.completenessChip.textContent =
    validation.completeness === "complete"
      ? "Complete"
      : `Incomplete · ${validation.incompleteFeedIds.length}`;
  elements.completenessChip.className =
    `patch-chip ${validation.completeness === "complete" ? "is-good" : "is-warning"}`;

  const items = [];

  if (validation.incompleteFeedIds.length) {
    items.push(
      `<div class="validation-item">${validation.incompleteFeedIds.length} Feed(s) are incomplete/TBD. This is not a Conflict.</div>`
    );
  }

  for (const issue of validation.issues) {
    items.push(
      `<div class="validation-item is-${escapeHtml(issue.severity)}"><strong>${escapeHtml(issue.severity.toUpperCase())}</strong> · ${escapeHtml(issueText(issue))}</div>`
    );
  }

  if (!items.length) {
    items.push(
      '<div class="validation-item">No conflicts or warnings in the current smoke project.</div>'
    );
  }

  elements.validationPanel.innerHTML =
    `<div class="validation-summary">
      <span class="patch-chip ${validation.validity === "valid" ? "is-good" : "is-conflict"}">Validity: ${escapeHtml(validation.validity)}</span>
      <span class="patch-chip ${validation.completeness === "complete" ? "is-good" : "is-warning"}">Completeness: ${escapeHtml(validation.completeness)}</span>
    </div>${items.join("")}`;
}

function render() {
  if (!project) return;

  const rows = projectRouteRows(project);
  const validation = validatePatch(project);

  elements.projectName.value = project.name;
  elements.projectHeading.textContent = project.name;
  elements.projectMeta.innerHTML =
    `<span>ID: ${escapeHtml(project.id)}</span>
     <span>Sources: ${project.sources.length}</span>
     <span>Devices: ${project.devices.length}</span>
     <span>Connections: ${project.connections.length}</span>`;

  renderSelectors(rows);
  renderRows(rows, validation);
  renderSystem(rows);
  renderDevices();
  renderValidation(validation);
}

function newLocalProject() {
  project = createPatchProject({
    id: LOCAL_PROJECT_ID,
    name: "Patch Smoke"
  });
  elements.routeMessage.textContent = "";
  render();
  markDirty();
}

async function reloadLocal() {
  setSaveState("Loading…");
  try {
    project =
      (await loadLocalPatch(LOCAL_PROJECT_ID)) ||
      createPatchProject({ id: LOCAL_PROJECT_ID, name: "Patch Smoke" });

    render();
    setSaveState("Saved locally", "is-saved");
  } catch (error) {
    console.error("[Patch Smoke] local load failed", error);
    project = createPatchProject({
      id: LOCAL_PROJECT_ID,
      name: "Patch Smoke"
    });
    render();
    setSaveState("Local load failed", "is-error");
  }
}

elements.projectName.addEventListener("change", () => {
  try {
    mutate(renamePatch(project, elements.projectName.value));
  } catch (error) {
    alert(error.message);
    render();
  }
});

elements.sourceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const result = addSource(project, {
      name: elements.sourceName.value,
      inputMethod: elements.inputMethod.value
    });
    mutate(result.project);
    elements.sourceName.value = "";
    elements.sourceName.focus();
  } catch (error) {
    alert(error.message);
  }
});

elements.deviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const created = addDevice(project, {
      name: elements.deviceName.value
    });
    const bank = addInputBank(created.project, {
      deviceId: created.device.id,
      count: Number(elements.deviceInputs.value),
      signalProtocol: elements.deviceProtocol.value
    });
    mutate(bank.project);
    elements.deviceName.value = "";
  } catch (error) {
    alert(error.message);
  }
});

elements.routeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  elements.routeMessage.textContent = "";
  elements.routeMessage.className = "patch-inline-message";

  try {
    const result = assignFeedToPort(project, {
      feedId: elements.routeFeed.value,
      portId: elements.routePort.value
    });

    mutate(result.project, {
      message: result.repatched ? "Repatched." : "Patched."
    });
  } catch (error) {
    elements.routeMessage.textContent =
      error.message === "patch_input_already_assigned"
        ? "That input is already assigned."
        : error.message;
    elements.routeMessage.className = "patch-inline-message is-error";
  }
});

elements.routeRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-disconnect-feed]");
  if (!button) return;
  mutate(disconnectFeed(project, button.dataset.disconnectFeed));
});

elements.deviceList.addEventListener("change", (event) => {
  const availability = event.target.closest("[data-port-availability]");
  const condition = event.target.closest("[data-port-condition]");

  try {
    if (availability) {
      mutate(
        setPortState(
          project,
          availability.dataset.portAvailability,
          { availability: availability.value }
        )
      );
    }

    if (condition) {
      mutate(
        setPortState(
          project,
          condition.dataset.portCondition,
          { condition: condition.value }
        )
      );
    }
  } catch (error) {
    alert(error.message);
    render();
  }
});

elements.savePatch.addEventListener("click", () => saveNow("manual"));
elements.reloadPatch.addEventListener("click", () => reloadLocal());

elements.newPatch.addEventListener("click", () => {
  if (!confirm("Replace the current local smoke project with a blank Patch?")) {
    return;
  }
  newLocalProject();
});

window.addEventListener("beforeunload", () => clearTimeout(saveTimer));

reloadLocal();
