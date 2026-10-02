import {
  addDeviceFromProfile,
  addSource,
  assignFeedToConsoleChannel,
  assignFeedToPort,
  createPatchProject,
  disconnectFeed,
  disconnectFeedFromConsoleChannel,
  normalizePatchProject,
  projectRouteRows,
  renamePatch,
  updateFeed,
  updateSource,
  validatePatch
} from "../../patch-domain.js";
import { listPatchProfiles } from "../../patch-profiles.js";
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
  projectMeta: $("projectMeta"),
  validityChip: $("validityChip"),
  completenessChip: $("completenessChip"),
  consoleProfile: $("consoleProfile"),
  ioProfile: $("ioProfile"),
  addConsole: $("addConsole"),
  addIoDevice: $("addIoDevice"),
  deviceSummary: $("deviceSummary"),
  patchGridBody: $("patchGridBody"),
  inputPortOptions: $("inputPortOptions"),
  consoleChannelOptions: $("consoleChannelOptions"),
  gridFeedback: $("gridFeedback"),
  ioBanks: $("ioBanks"),
  systemView: $("systemView"),
  validationPanel: $("validationPanel"),
  viewTabs: Array.from(document.querySelectorAll("[data-view]")),
  views: Array.from(document.querySelectorAll("[data-patch-view]"))
};

let project = null;
let saveTimer = null;
let saveSequence = 0;
let activeView = "sheet";

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

function setGridFeedback(text = "", type = "") {
  elements.gridFeedback.textContent = text;
  elements.gridFeedback.className = type ? `is-${type}` : "";
}

function markDirty() {
  setSaveState("Unsaved changes", "is-dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow("autosave"), AUTOSAVE_DELAY_MS);
}

async function saveNow() {
  if (!project) return;
  const sequence = ++saveSequence;
  clearTimeout(saveTimer);
  setSaveState("Saving…");
  try {
    await saveLocalPatch(project);
    if (sequence === saveSequence) setSaveState("Saved locally", "is-saved");
  } catch (error) {
    console.error("[Patch] local save failed", error);
    if (sequence === saveSequence) setSaveState("Save failed", "is-error");
  }
}

function mutate(nextProject, feedback = "") {
  project = normalizePatchProject(nextProject);
  render();
  if (feedback) setGridFeedback(feedback, "good");
  markDirty();
}

function profileOptions(kind) {
  return listPatchProfiles(kind)
    .map((profile) =>
      `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.manufacturer)} ${escapeHtml(profile.model)}</option>`
    )
    .join("");
}

function populateProfileSelectors() {
  elements.consoleProfile.innerHTML = profileOptions("console");
  elements.ioProfile.innerHTML = profileOptions("stage-io");
}

function deviceInstanceName(profileId) {
  const profile = [...listPatchProfiles()].find((item) => item.id === profileId);
  if (!profile) return "Device";
  const count = project.devices.filter((device) => device.profileId === profileId).length;
  return count ? `${profile.model} ${count + 1}` : profile.model;
}

function deviceMap() {
  return new Map(project.devices.map((device) => [device.id, device]));
}

function portOptionModel() {
  const devices = deviceMap();
  return project.ports
    .filter((port) => port.direction === "input" || port.direction === "bidirectional")
    .map((port) => {
      const device = devices.get(port.deviceId);
      return {
        id: port.id,
        label: `${device?.name || "Device"} / ${port.name}`,
        port,
        device
      };
    });
}

function channelOptionModel() {
  const devices = deviceMap();
  return project.consoleChannels.map((channel) => {
    const device = devices.get(channel.deviceId);
    return {
      id: channel.id,
      label: `${device?.name || "Console"} / ${channel.name}`,
      channel,
      device
    };
  });
}

function optionLookup(options) {
  return new Map(options.map((item) => [item.label.trim().toLowerCase(), item]));
}

function renderDataLists(portOptions, channelOptions) {
  elements.inputPortOptions.innerHTML = portOptions
    .map((item) => `<option value="${escapeHtml(item.label)}"></option>`)
    .join("");
  elements.consoleChannelOptions.innerHTML = channelOptions
    .map((item) => `<option value="${escapeHtml(item.label)}"></option>`)
    .join("");
}

function rowStatus(row, validation) {
  const reasons = validation.incompleteReasonsByFeed?.[row.feed.id] || [];
  const portIds = new Set(row.connections.map(({ port }) => port?.id).filter(Boolean));
  const hasWarning = validation.issues.some(
    (issue) => issue.severity === "warning" && issue.portId && portIds.has(issue.portId)
  );
  if (validation.issues.some((issue) => issue.severity === "conflict")) {
    const channelId = row.consoleAssignment?.channel?.id;
    const hasRowConflict = validation.issues.some(
      (issue) =>
        issue.severity === "conflict" &&
        (portIds.has(issue.portId) || (channelId && issue.channelId === channelId))
    );
    if (hasRowConflict) return { label:"Conflict", className:"is-warning" };
  }
  if (hasWarning) return { label:"Warning", className:"is-warning" };
  if (!reasons.length) return { label:"Complete", className:"is-complete" };
  if (reasons.length === 1 && reasons[0] === "input") return { label:"Needs input", className:"is-incomplete" };
  if (reasons.length === 1 && reasons[0] === "console-channel") return { label:"Needs ch", className:"is-incomplete" };
  return { label:"Incomplete", className:"is-incomplete" };
}

function rowInput({ field, value, sourceId, feedId, list = "", placeholder = "" }) {
  const attrs = [
    'class="patch-cell-input"',
    `data-grid-field="${field}"`,
    sourceId ? `data-source-id="${escapeHtml(sourceId)}"` : "",
    feedId ? `data-feed-id="${escapeHtml(feedId)}"` : "",
    list ? `list="${list}"` : "",
    `value="${escapeHtml(value)}"`,
    placeholder ? `placeholder="${escapeHtml(placeholder)}"` : "",
    'autocomplete="off"'
  ].filter(Boolean).join(" ");
  return `<input ${attrs} />`;
}

function renderGrid(rows, validation) {
  const body = rows.map((row, index) => {
    const physical = row.connections[0]
      ? `${row.connections[0].device?.name || "Device"} / ${row.connections[0].port?.name || "Port"}`
      : "";
    const consoleChannel = row.consoleAssignment
      ? `${row.consoleAssignment.device?.name || "Console"} / ${row.consoleAssignment.channel?.name || "Channel"}`
      : "";
    const status = rowStatus(row, validation);
    return `<tr data-feed-row="${escapeHtml(row.feed.id)}">
      <td class="patch-row-number">${index + 1}</td>
      <td>${rowInput({ field:"source-name", value:row.source?.name || "", sourceId:row.source?.id, feedId:row.feed.id })}</td>
      <td>${rowInput({ field:"input-method", value:row.feed.inputMethod || "", feedId:row.feed.id, list:"inputMethodOptions" })}</td>
      <td>${rowInput({ field:"stage-position", value:row.source?.stagePosition || "", sourceId:row.source?.id, feedId:row.feed.id })}</td>
      <td>${rowInput({ field:"physical-input", value:physical, feedId:row.feed.id, list:"inputPortOptions", placeholder:"TBD" })}</td>
      <td>${rowInput({ field:"console-channel", value:consoleChannel, feedId:row.feed.id, list:"consoleChannelOptions", placeholder:"TBD" })}</td>
      <td class="patch-status-cell ${status.className}">${escapeHtml(status.label)}</td>
    </tr>`;
  });

  body.push(`<tr class="patch-grid-new">
    <td class="patch-row-number">+</td>
    <td><input class="patch-cell-input" id="newSourceCell" data-new-source placeholder="Type Source + Enter" autocomplete="off" /></td>
    <td><input class="patch-cell-input" tabindex="-1" placeholder="Mic" disabled /></td>
    <td><input class="patch-cell-input" tabindex="-1" disabled /></td>
    <td><input class="patch-cell-input" tabindex="-1" placeholder="TBD" disabled /></td>
    <td><input class="patch-cell-input" tabindex="-1" placeholder="TBD" disabled /></td>
    <td class="patch-status-cell is-incomplete">New</td>
  </tr>`);

  elements.patchGridBody.innerHTML = body.join("");
}

function renderDeviceSummary() {
  elements.deviceSummary.innerHTML = project.devices.length
    ? project.devices.map((device) => {
        const ports = project.ports.filter((port) => port.deviceId === device.id).length;
        const channels = project.consoleChannels.filter((channel) => channel.deviceId === device.id).length;
        const detail = device.kind === "console" ? `${channels} ch · ${ports} I/O` : `${ports} I/O`;
        return `<span class="patch-device-pill">${escapeHtml(device.name)} · ${escapeHtml(detail)}</span>`;
      }).join("")
    : '<span class="patch-device-pill">No hardware profiles yet</span>';
}

function renderIoBanks() {
  const devices = deviceMap();
  elements.ioBanks.innerHTML = project.devices.length
    ? project.devices.map((device) => {
        const banks = project.ioBanks.filter((bank) => bank.deviceId === device.id);
        const channels = project.consoleChannels.filter((channel) => channel.deviceId === device.id);
        const bankRows = banks.map((bank) => {
          const count = project.ports.filter((port) => port.bankId === bank.id).length;
          return `<div class="patch-bank-row">
            <div><strong>${escapeHtml(bank.name)}</strong><span>${escapeHtml(bank.direction)} · ${escapeHtml(bank.signalProtocol)}${bank.connector ? ` · ${escapeHtml(bank.connector)}` : ""}</span></div>
            <span class="patch-bank-count">${count}</span>
          </div>`;
        }).join("");
        const channelRow = channels.length
          ? `<div class="patch-bank-row"><div><strong>Console Input Channels</strong><span>Logical processing slots</span></div><span class="patch-bank-count">${channels.length}</span></div>`
          : "";
        return `<section class="patch-io-device">
          <div class="patch-io-device__head"><strong>${escapeHtml(device.name)}</strong><span>${escapeHtml(device.manufacturer || "")} ${escapeHtml(device.model || "")}</span></div>
          ${bankRows || '<div class="patch-bank-row"><span>No generated banks</span></div>'}
          ${channelRow}
        </section>`;
      }).join("")
    : '<div class="patch-io-device"><div class="patch-io-device__head"><strong>No devices yet</strong><span>Add a Console or I/O Profile above.</span></div></div>';
}

function renderSystem(rows) {
  elements.systemView.innerHTML = rows.length
    ? rows.map((row) => {
        const physical = row.connections[0]
          ? `${row.connections[0].device?.name || "Device"} / ${row.connections[0].port?.name || "Port"}`
          : "Input TBD";
        const channel = row.consoleAssignment
          ? `${row.consoleAssignment.device?.name || "Console"} / ${row.consoleAssignment.channel?.name || "Channel"}`
          : "Console Ch TBD";
        return `<div class="system-route">
          <div class="system-node"><strong>${escapeHtml(row.source?.name || "Source")}</strong><span>${escapeHtml(row.feed.inputMethod || "Unknown")}</span></div>
          <span class="system-arrow">→</span>
          <div class="system-node ${row.connections.length ? "" : "is-tbd"}"><strong>${escapeHtml(physical)}</strong><span>Input endpoint</span></div>
          <span class="system-arrow">→</span>
          <div class="system-node ${row.consoleAssignment ? "" : "is-tbd"}"><strong>${escapeHtml(channel)}</strong><span>Logical channel</span></div>
        </div>`;
      }).join("")
    : '<div class="system-node is-tbd"><strong>No Sources yet</strong><span>Add one from the spreadsheet.</span></div>';
}

function issueText(issue) {
  const devices = deviceMap();
  const port = issue.portId ? project.ports.find((item) => item.id === issue.portId) : null;
  const device = port ? devices.get(port.deviceId) : null;
  const where = port ? `${device?.name || "Device"} / ${port.name}` : "Route";
  const labels = {
    damaged_port_assigned: `${where}: Damaged port is assigned.`,
    reserved_port_assigned: `${where}: Reserved port is assigned.`,
    unavailable_port_assigned: `${where}: Unavailable port is assigned.`,
    input_double_assignment: `${where}: input has multiple Feeds.`,
    console_channel_double_assignment: "Console Channel has multiple Feeds."
  };
  return labels[issue.code] || issue.code;
}

function renderValidation(validation) {
  const items = [];
  if (validation.incompleteFeedIds.length) {
    items.push(`<span class="validation-item">${validation.incompleteFeedIds.length} incomplete · not a Conflict</span>`);
  }
  for (const issue of validation.issues) {
    items.push(`<span class="validation-item is-${escapeHtml(issue.severity)}">${escapeHtml(issueText(issue))}</span>`);
  }
  if (!items.length) items.push('<span class="validation-item">No conflicts or warnings.</span>');
  elements.validationPanel.innerHTML = items.join("");
}

function renderStatus(validation) {
  elements.validityChip.textContent = validation.validity === "valid" ? "Valid" : "Conflict";
  elements.validityChip.className = `patch-chip ${validation.validity === "valid" ? "is-good" : "is-conflict"}`;
  elements.completenessChip.textContent = validation.completeness === "complete"
    ? "Complete"
    : `Incomplete · ${validation.incompleteFeedIds.length}`;
  elements.completenessChip.className = `patch-chip ${validation.completeness === "complete" ? "is-good" : "is-warning"}`;
}

function render() {
  if (!project) return;
  project = normalizePatchProject(project);
  const rows = projectRouteRows(project);
  const validation = validatePatch(project);
  const portOptions = portOptionModel();
  const channelOptions = channelOptionModel();

  elements.projectName.value = project.name;
  elements.projectMeta.innerHTML = `<span>Sources ${project.sources.length}</span><span>Devices ${project.devices.length}</span><span>Connections ${project.connections.length}</span>`;

  renderDataLists(portOptions, channelOptions);
  renderGrid(rows, validation);
  renderDeviceSummary();
  renderIoBanks();
  renderSystem(rows);
  renderValidation(validation);
  renderStatus(validation);
}

function addProfile(profileId) {
  try {
    const result = addDeviceFromProfile(project, {
      profileId,
      name: deviceInstanceName(profileId)
    });
    mutate(result.project, `${result.device.name} capacity created.`);
  } catch (error) {
    setGridFeedback(error.message, "error");
  }
}

function matchOption(value, options) {
  return optionLookup(options).get(String(value || "").trim().toLowerCase()) || null;
}

function handleExistingCellChange(input) {
  const field = input.dataset.gridField;
  const sourceId = input.dataset.sourceId;
  const feedId = input.dataset.feedId;
  input.classList.remove("is-invalid");
  setGridFeedback("");

  try {
    if (field === "source-name") {
      mutate(updateSource(project, sourceId, { name:input.value }));
      return;
    }
    if (field === "stage-position") {
      mutate(updateSource(project, sourceId, { stagePosition:input.value }));
      return;
    }
    if (field === "input-method") {
      mutate(updateFeed(project, feedId, { inputMethod:input.value }));
      return;
    }
    if (field === "physical-input") {
      if (!input.value.trim()) {
        mutate(disconnectFeed(project, feedId), "Input cleared.");
        return;
      }
      const option = matchOption(input.value, portOptionModel());
      if (!option) throw new Error("Choose an existing I/O endpoint.");
      const result = assignFeedToPort(project, { feedId, portId:option.id });
      mutate(result.project, result.repatched ? "Repatched input." : "Input assigned.");
      return;
    }
    if (field === "console-channel") {
      if (!input.value.trim()) {
        mutate(disconnectFeedFromConsoleChannel(project, feedId), "Console Channel cleared.");
        return;
      }
      const option = matchOption(input.value, channelOptionModel());
      if (!option) throw new Error("Choose an existing Console Channel.");
      const result = assignFeedToConsoleChannel(project, { feedId, channelId:option.id });
      mutate(result.project, result.repatched ? "Repatched Console Channel." : "Console Channel assigned.");
    }
  } catch (error) {
    input.classList.add("is-invalid");
    setGridFeedback(error.message, "error");
  }
}

function createSourceFromBlank(name, { inputMethod = "Mic", stagePosition = "" } = {}) {
  const result = addSource(project, { name, inputMethod, stagePosition });
  project = result.project;
  return result;
}

function applyPastedRow(cells) {
  const name = String(cells[0] || "").trim();
  if (!name) return;
  const result = createSourceFromBlank(name, {
    inputMethod: String(cells[1] || "").trim() || "Mic",
    stagePosition: String(cells[2] || "").trim()
  });
  let next = result.project;
  const portText = String(cells[3] || "").trim();
  const channelText = String(cells[4] || "").trim();

  if (portText) {
    const option = matchOption(portText, portOptionModel());
    if (option) next = assignFeedToPort(next, { feedId:result.feed.id, portId:option.id }).project;
  }
  project = next;

  if (channelText) {
    const option = matchOption(channelText, channelOptionModel());
    if (option) project = assignFeedToConsoleChannel(project, { feedId:result.feed.id, channelId:option.id }).project;
  }
}

function handlePaste(event) {
  const input = event.target.closest("[data-new-source]");
  if (!input) return;
  const text = event.clipboardData?.getData("text/plain") || "";
  if (!text.includes("\n") && !text.includes("\t")) return;
  event.preventDefault();
  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.split("\t"));

  try {
    for (const cells of rows) applyPastedRow(cells);
    mutate(project, `${rows.length} row(s) pasted.`);
    requestAnimationFrame(() => document.querySelector("[data-new-source]")?.focus());
  } catch (error) {
    setGridFeedback(error.message, "error");
  }
}

function switchView(view) {
  activeView = view;
  for (const tab of elements.viewTabs) tab.classList.toggle("is-active", tab.dataset.view === view);
  for (const panel of elements.views) {
    const active = panel.dataset.patchView === view;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  }
}

function newLocalProject() {
  project = createPatchProject({ id:LOCAL_PROJECT_ID, name:"Patch Smoke" });
  render();
  markDirty();
}

async function reloadLocal() {
  setSaveState("Loading…");
  try {
    const stored = await loadLocalPatch(LOCAL_PROJECT_ID);
    project = stored
      ? normalizePatchProject(stored)
      : createPatchProject({ id:LOCAL_PROJECT_ID, name:"Patch Smoke" });
    render();
    setSaveState("Saved locally", "is-saved");
  } catch (error) {
    console.error("[Patch] local load failed", error);
    project = createPatchProject({ id:LOCAL_PROJECT_ID, name:"Patch Smoke" });
    render();
    setSaveState("Local load failed", "is-error");
  }
}

elements.projectName.addEventListener("change", () => {
  try {
    mutate(renamePatch(project, elements.projectName.value));
  } catch (error) {
    setGridFeedback(error.message, "error");
    render();
  }
});

elements.addConsole.addEventListener("click", () => addProfile(elements.consoleProfile.value));
elements.addIoDevice.addEventListener("click", () => addProfile(elements.ioProfile.value));
elements.savePatch.addEventListener("click", () => saveNow());
elements.reloadPatch.addEventListener("click", () => reloadLocal());

elements.newPatch.addEventListener("click", () => {
  if (confirm("Replace this local smoke project with a blank Patch?")) newLocalProject();
});

elements.patchGridBody.addEventListener("change", (event) => {
  const input = event.target.closest("[data-grid-field]");
  if (input) handleExistingCellChange(input);
});

elements.patchGridBody.addEventListener("keydown", (event) => {
  const input = event.target.closest("[data-new-source]");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();
  const name = input.value.trim();
  if (!name) return;
  try {
    const result = addSource(project, { name, inputMethod:"Mic" });
    mutate(result.project, `${name} added.`);
    requestAnimationFrame(() => document.querySelector("[data-new-source]")?.focus());
  } catch (error) {
    setGridFeedback(error.message, "error");
  }
});

elements.patchGridBody.addEventListener("paste", handlePaste);

for (const tab of elements.viewTabs) {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
}

populateProfileSelectors();
switchView(activeView);
reloadLocal();
