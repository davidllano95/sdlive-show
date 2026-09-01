(() => {
  const ENDPOINT = "/api/admin/availability";
  const DAYS = [
    ["mon", "Monday"],
    ["tue", "Tuesday"],
    ["wed", "Wednesday"],
    ["thu", "Thursday"],
    ["fri", "Friday"],
    ["sat", "Saturday"],
    ["sun", "Sunday"]
  ];

  let card = null;
  let statusNode = null;
  let metaNode = null;
  let errorNode = null;
  let durationSelect = null;
  let temporaryMeta = null;
  let forceMeta = null;
  let forceFeedback = null;
  let forceApply = null;
  let scheduleGrid = null;
  let scheduleSummary = null;
  let scheduleFeedback = null;
  let scheduleSave = null;
  let timezoneNode = null;
  let overrideControls = [];
  let forceControls = [];
  let scheduleInitialized = false;
  let scheduleDirty = false;
  let busy = false;
  let activeForceMode = "auto";
  let selectedForceMode = "auto";
  let currentProfile = null;

  function labelFor(status) {
    return {
      available: "Available",
      limited: "Limited",
      away: "Away"
    }[status] || "Available";
  }

  function forceLabel(mode) {
    return {
      force_on: "Force On",
      force_off: "Force Off",
      auto: "Auto"
    }[mode] || "Auto";
  }

  function formatExpiry(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return String(value || "");
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  async function request(payload) {
    const response = await fetch(ENDPOINT, {
      method: payload ? "PUT" : "GET",
      headers: {
        Accept: "application/json",
        ...(payload ? { "Content-Type": "application/json" } : {})
      },
      cache: "no-store",
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const error = new Error(data?.error || "Could not update Availability");
      error.code = data?.code || "";
      throw error;
    }
    return data;
  }

  function syncDisabledState() {
    const forceActive = activeForceMode !== "auto";
    overrideControls.forEach((control) => {
      control.disabled = busy || forceActive;
    });
    if (durationSelect) durationSelect.disabled = busy || forceActive;

    forceControls.forEach((control) => { control.disabled = busy; });
    if (forceApply) forceApply.disabled = busy;

    card?.querySelectorAll(".availability-schedule button, .availability-schedule input").forEach((control) => {
      control.disabled = busy;
    });
    if (scheduleSave) scheduleSave.disabled = busy;
  }

  function setBusy(next) {
    busy = next;
    card?.classList.toggle("is-busy", next);
    syncDisabledState();
  }

  function setForceSelection(mode) {
    selectedForceMode = ["auto", "force_on", "force_off"].includes(mode) ? mode : "auto";
    forceControls.forEach((button) => {
      const selected = button.dataset.forceMode === selectedForceMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function markScheduleDirty(message = "Unsaved schedule changes.") {
    scheduleDirty = true;
    if (scheduleFeedback) scheduleFeedback.textContent = message;
  }

  function addWindowRow(dayKey, start = "", end = "", { focus = false } = {}) {
    const container = scheduleGrid?.querySelector(`.availability-schedule__windows[data-day="${dayKey}"]`);
    if (!container) return;
    if (container.querySelectorAll(".availability-schedule__window").length >= 6) {
      if (scheduleFeedback) scheduleFeedback.textContent = "Maximum 6 service windows per day.";
      return;
    }

    const row = document.createElement("div");
    row.className = "availability-schedule__window";
    row.dataset.day = dayKey;

    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.step = "900";
    startInput.value = start;
    startInput.setAttribute("aria-label", `${dayKey} start time`);

    const separator = document.createElement("span");
    separator.textContent = "to";

    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.step = "900";
    endInput.value = end;
    endInput.setAttribute("aria-label", `${dayKey} end time`);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "availability-schedule__remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${dayKey} service window`);

    [startInput, endInput].forEach((input) => {
      input.addEventListener("change", () => markScheduleDirty());
    });
    remove.addEventListener("click", () => {
      row.remove();
      markScheduleDirty();
    });

    row.append(startInput, separator, endInput, remove);
    container.append(row);
    if (focus) startInput.focus();
  }

  function buildScheduleShell() {
    if (!scheduleGrid || scheduleGrid.children.length) return;
    DAYS.forEach(([key, label]) => {
      const day = document.createElement("div");
      day.className = "availability-schedule__day";
      day.innerHTML = `
        <div class="availability-schedule__day-head">
          <strong>${label}</strong>
          <button type="button" class="availability-schedule__add" data-add-window="${key}">+ Add window</button>
        </div>
        <div class="availability-schedule__windows" data-day="${key}" data-empty-label="Closed"></div>
      `;
      scheduleGrid.append(day);
    });

    scheduleGrid.querySelectorAll("[data-add-window]").forEach((button) => {
      button.addEventListener("click", () => {
        addWindowRow(button.dataset.addWindow, "", "", { focus: true });
        markScheduleDirty();
      });
    });
  }

  function renderSchedule(profile) {
    buildScheduleShell();
    scheduleGrid?.querySelectorAll(".availability-schedule__window").forEach((row) => row.remove());
    const schedule = profile?.weeklySchedule || {};
    DAYS.forEach(([key]) => {
      const windows = Array.isArray(schedule[key]) ? schedule[key] : [];
      windows.forEach(([start, end]) => addWindowRow(key, start, end));
    });
    currentProfile = profile || { defaultTimezone: "America/Bogota", weeklySchedule: {} };
    if (timezoneNode) timezoneNode.textContent = currentProfile.defaultTimezone || "America/Bogota";
    if (scheduleSummary) {
      scheduleSummary.textContent = profile?.configured ? "Configured" : "Not configured";
      scheduleSummary.classList.toggle("is-configured", Boolean(profile?.configured));
    }
    scheduleInitialized = true;
    scheduleDirty = false;
    if (scheduleFeedback) {
      scheduleFeedback.textContent = profile?.configured
        ? "Auto follows these service windows. Days without windows are Away."
        : "Until you save this schedule once, Auto preserves the current Available behavior.";
    }
    syncDisabledState();
  }

  function collectSchedule() {
    const schedule = Object.fromEntries(DAYS.map(([key]) => [key, []]));
    for (const row of scheduleGrid?.querySelectorAll(".availability-schedule__window") || []) {
      const dayKey = row.dataset.day;
      const inputs = row.querySelectorAll('input[type="time"]');
      const start = inputs[0]?.value || "";
      const end = inputs[1]?.value || "";
      if (!start || !end) {
        throw new Error("Complete both times for every service window, or remove the unfinished row.");
      }
      if (end <= start) {
        throw new Error("Each service window must end after it starts.");
      }
      schedule[dayKey].push([start, end]);
    }
    Object.values(schedule).forEach((windows) => windows.sort((a, b) => a[0].localeCompare(b[0])));
    return schedule;
  }

  function render(data, { refreshSchedule = false } = {}) {
    const effective = data?.effective || {};
    const override = data?.override || {};
    const profile = data?.profile || {};
    const force = data?.force || {};
    const status = ["available", "limited", "away"].includes(effective.status)
      ? effective.status
      : "available";

    statusNode.innerHTML = `<i aria-hidden="true"></i>${labelFor(status)}`;
    card.dataset.status = status;

    activeForceMode = ["force_on", "force_off"].includes(force.mode) ? force.mode : "auto";
    setForceSelection(activeForceMode);

    if (effective.source === "admin-force") {
      const expiry = formatDate(force.expiresOn);
      metaNode.textContent = `${forceLabel(activeForceMode)} · backend force${expiry ? ` · through ${expiry}` : ""}`;
    } else if (effective.source === "manual-override") {
      metaNode.textContent = `Temporary ${labelFor(status)} until ${formatExpiry(effective.nextTransition) || "expiry"}`;
    } else if (effective.source === "weekly-schedule") {
      metaNode.textContent = `Auto · weekly schedule · ${effective.timeZone || profile.defaultTimezone || "America/Bogota"}`;
    } else {
      metaNode.textContent = "Auto · schedule not configured";
    }

    overrideControls.forEach((button) => {
      const mode = button.dataset.mode;
      const active = mode === "auto" ? override.mode === "auto" : override.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (temporaryMeta) {
      if (activeForceMode !== "auto") {
        temporaryMeta.textContent = `Paused by ${forceLabel(activeForceMode)}. Your temporary state is preserved but cannot affect the public status until Force Mode returns to Auto.`;
      } else if (override.mode !== "auto") {
        temporaryMeta.textContent = `${labelFor(override.mode)} until ${formatExpiry(override.expiresAt) || "expiry"}.`;
      } else {
        temporaryMeta.textContent = profile.configured
          ? "Auto hands control back to the weekly schedule."
          : "Auto keeps the compatibility Available state until the weekly schedule is saved.";
      }
    }

    if (forceMeta) {
      forceMeta.textContent = activeForceMode === "auto"
        ? "Auto lets temporary overrides and the weekly schedule decide the public status."
        : `${forceLabel(activeForceMode)} has top priority and expires automatically after today in ${profile.defaultTimezone || "America/Bogota"}.`;
    }

    if (!scheduleInitialized || refreshSchedule) renderSchedule(profile);
    currentProfile = profile;
    syncDisabledState();
  }

  async function load() {
    try {
      const data = await request();
      errorNode.hidden = true;
      render(data, { refreshSchedule: true });
    } catch (error) {
      errorNode.textContent = error.message || "Could not load Availability";
      errorNode.hidden = false;
    }
  }

  async function saveTemporary(mode) {
    if (busy || activeForceMode !== "auto") return;
    setBusy(true);
    errorNode.hidden = true;
    const payload = mode === "auto"
      ? { action: "override", mode: "auto" }
      : {
          action: "override",
          mode,
          durationMinutes: Number(durationSelect.value) || 120
        };

    try {
      const data = await request(payload);
      render(data);
    } catch (error) {
      errorNode.textContent = error.message || "Could not save Availability";
      errorNode.hidden = false;
    } finally {
      setBusy(false);
    }
  }

  async function applyForce() {
    if (busy) return;
    setBusy(true);
    errorNode.hidden = true;
    if (forceFeedback) forceFeedback.textContent = "Applying…";
    try {
      const data = await request({ action: "force", mode: selectedForceMode });
      render(data);
      if (forceFeedback) forceFeedback.textContent = "Applied to the public Availability state.";
    } catch (error) {
      errorNode.textContent = error.message || "Could not apply Force Mode";
      errorNode.hidden = false;
      if (forceFeedback) forceFeedback.textContent = "";
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule() {
    if (busy) return;
    let weeklySchedule;
    try {
      weeklySchedule = collectSchedule();
    } catch (error) {
      if (scheduleFeedback) scheduleFeedback.textContent = error.message;
      return;
    }

    setBusy(true);
    errorNode.hidden = true;
    if (scheduleFeedback) scheduleFeedback.textContent = "Saving schedule…";
    try {
      const data = await request({
        action: "profile",
        defaultTimezone: currentProfile?.defaultTimezone || "America/Bogota",
        weeklySchedule
      });
      render(data, { refreshSchedule: true });
      if (scheduleFeedback) scheduleFeedback.textContent = "Weekly schedule saved. Auto now follows these windows.";
    } catch (error) {
      errorNode.textContent = error.message || "Could not save weekly schedule";
      errorNode.hidden = false;
      if (scheduleFeedback) scheduleFeedback.textContent = "Schedule was not saved.";
    } finally {
      setBusy(false);
    }
  }

  function buildCard() {
    const metrics = document.querySelector(".metrics");
    if (!metrics || document.getElementById("availabilityAdminCard")) return false;

    card = document.createElement("article");
    card.className = "metric availability-admin-card";
    card.id = "availabilityAdminCard";
    card.innerHTML = `
      <div class="availability-admin-card__head">
        <div>
          <span>Availability</span>
          <strong class="availability-admin-card__status"><i aria-hidden="true"></i>Checking</strong>
          <small class="availability-admin-card__meta">Reading SD.Live Availability Core…</small>
        </div>
      </div>

      <section class="availability-admin-section availability-force">
        <div class="availability-admin-section__head">
          <div>
            <strong>Backend force mode</strong>
            <small>QA / emergency layer · highest priority</small>
          </div>
        </div>
        <div class="availability-admin-card__controls" role="group" aria-label="Availability backend force mode">
          <button type="button" data-force-mode="auto" aria-pressed="true">Auto</button>
          <button type="button" data-force-mode="force_on" aria-pressed="false">Force On</button>
          <button type="button" data-force-mode="force_off" aria-pressed="false">Force Off</button>
          <button type="button" class="availability-admin-card__apply" id="availabilityForceApply">Apply force</button>
        </div>
        <small class="availability-admin-section__meta" id="availabilityForceMeta"></small>
        <small class="availability-admin-section__feedback" id="availabilityForceFeedback" role="status" aria-live="polite"></small>
      </section>

      <section class="availability-admin-section availability-temporary">
        <div class="availability-admin-section__head">
          <div>
            <strong>Temporary status</strong>
            <small>Operational override · always expires</small>
          </div>
        </div>
        <div class="availability-admin-card__controls" aria-label="Availability temporary controls">
          <button type="button" data-mode="auto">Auto</button>
          <button type="button" data-mode="available">Available</button>
          <button type="button" data-mode="limited">Limited</button>
          <button type="button" data-mode="away">Away</button>
          <select aria-label="Override duration" id="availabilityDuration">
            <option value="60">1 hour</option>
            <option value="120" selected>2 hours</option>
            <option value="240">4 hours</option>
            <option value="480">8 hours</option>
          </select>
        </div>
        <small class="availability-admin-section__meta" id="availabilityTemporaryMeta"></small>
      </section>

      <details class="availability-admin-section availability-schedule">
        <summary>
          <span>Weekly schedule</span>
          <small id="availabilityScheduleSummary">Not configured</small>
        </summary>
        <div class="availability-schedule__body">
          <p>Base timezone: <code id="availabilityTimezone">America/Bogota</code>. Auto is Available only inside saved service windows; days without windows are Away.</p>
          <div class="availability-schedule__grid" id="availabilityScheduleGrid"></div>
          <div class="availability-schedule__footer">
            <button type="button" class="availability-admin-card__apply" id="availabilityScheduleSave">Save weekly schedule</button>
            <small id="availabilityScheduleFeedback" role="status" aria-live="polite"></small>
          </div>
        </div>
      </details>

      <small class="availability-admin-card__error" hidden></small>
    `;

    metrics.append(card);
    statusNode = card.querySelector(".availability-admin-card__status");
    metaNode = card.querySelector(".availability-admin-card__meta");
    errorNode = card.querySelector(".availability-admin-card__error");
    durationSelect = card.querySelector("#availabilityDuration");
    temporaryMeta = card.querySelector("#availabilityTemporaryMeta");
    forceMeta = card.querySelector("#availabilityForceMeta");
    forceFeedback = card.querySelector("#availabilityForceFeedback");
    forceApply = card.querySelector("#availabilityForceApply");
    scheduleGrid = card.querySelector("#availabilityScheduleGrid");
    scheduleSummary = card.querySelector("#availabilityScheduleSummary");
    scheduleFeedback = card.querySelector("#availabilityScheduleFeedback");
    scheduleSave = card.querySelector("#availabilityScheduleSave");
    timezoneNode = card.querySelector("#availabilityTimezone");

    overrideControls = Array.from(card.querySelectorAll("button[data-mode]"));
    forceControls = Array.from(card.querySelectorAll("button[data-force-mode]"));

    overrideControls.forEach((button) => {
      button.addEventListener("click", () => saveTemporary(button.dataset.mode));
    });
    forceControls.forEach((button) => {
      button.addEventListener("click", () => {
        setForceSelection(button.dataset.forceMode);
        if (forceFeedback) forceFeedback.textContent = "Not applied yet.";
      });
    });
    forceApply?.addEventListener("click", applyForce);
    scheduleSave?.addEventListener("click", saveSchedule);

    buildScheduleShell();
    return true;
  }

  function init() {
    if (!buildCard()) return;
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
