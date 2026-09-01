(() => {
  const ENDPOINT = "/api/admin/availability";
  const DEVICE_ZONE_VALUE = "__device__";
  const CUSTOM_ZONE_VALUE = "__custom__";
  const TIMEZONE_GROUPS = [
    {
      label: "Americas",
      zones: [
        ["Bogotá", "America/Bogota"],
        ["New York", "America/New_York"],
        ["Chicago", "America/Chicago"],
        ["Denver", "America/Denver"],
        ["Los Angeles", "America/Los_Angeles"],
        ["Mexico City", "America/Mexico_City"],
        ["Toronto", "America/Toronto"],
        ["Vancouver", "America/Vancouver"],
        ["São Paulo", "America/Sao_Paulo"],
        ["Buenos Aires", "America/Argentina/Buenos_Aires"]
      ]
    },
    {
      label: "Europe",
      zones: [
        ["Madrid", "Europe/Madrid"],
        ["London", "Europe/London"],
        ["Lisbon", "Europe/Lisbon"],
        ["Paris", "Europe/Paris"],
        ["Berlin", "Europe/Berlin"],
        ["Amsterdam", "Europe/Amsterdam"],
        ["Rome", "Europe/Rome"],
        ["Athens", "Europe/Athens"]
      ]
    },
    {
      label: "Asia & Middle East",
      zones: [
        ["Singapore", "Asia/Singapore"],
        ["Tokyo", "Asia/Tokyo"],
        ["Seoul", "Asia/Seoul"],
        ["Hong Kong", "Asia/Hong_Kong"],
        ["Bangkok", "Asia/Bangkok"],
        ["Dubai", "Asia/Dubai"],
        ["Delhi", "Asia/Kolkata"]
      ]
    },
    {
      label: "Australia & Pacific",
      zones: [
        ["Sydney", "Australia/Sydney"],
        ["Melbourne", "Australia/Melbourne"],
        ["Brisbane", "Australia/Brisbane"],
        ["Perth", "Australia/Perth"],
        ["Auckland", "Pacific/Auckland"]
      ]
    }
  ];

  let card = null;
  let section = null;
  let timezoneSelect = null;
  let customTimezoneInput = null;
  let timezoneHint = null;
  let endDateInput = null;
  let statusNode = null;
  let metaNode = null;
  let feedbackNode = null;
  let startButton = null;
  let stopButton = null;
  let busy = false;

  function deviceTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
    } catch {
      return "America/Bogota";
    }
  }

  function allKnownZones() {
    return TIMEZONE_GROUPS.flatMap((group) => group.zones);
  }

  function labelForTimezone(timeZone) {
    const match = allKnownZones().find(([, zone]) => zone === timeZone);
    return match ? `${match[0]} · ${match[1]}` : timeZone;
  }

  function dateIsoInZone(date, timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(date);
      const get = (type) => parts.find((part) => part.type === type)?.value || "";
      return `${get("year")}-${get("month")}-${get("day")}`;
    } catch {
      return "";
    }
  }

  function defaultEndDate(timeZone) {
    return dateIsoInZone(new Date(), timeZone || "America/Bogota");
  }

  function formatExpiry(value, timeZone) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en", {
        timeZone: timeZone || undefined,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    }
  }

  function timezoneOptionsMarkup() {
    const groups = TIMEZONE_GROUPS.map((group) => `
      <optgroup label="${group.label}">
        ${group.zones.map(([label, zone]) => `<option value="${zone}">${label} · ${zone}</option>`).join("")}
      </optgroup>
    `).join("");

    return `
      <option value="${DEVICE_ZONE_VALUE}">Use device timezone</option>
      ${groups}
      <option value="${CUSTOM_ZONE_VALUE}">Other IANA timezone…</option>
    `;
  }

  function selectedTimezone() {
    if (!timezoneSelect) return "";
    if (timezoneSelect.value === DEVICE_ZONE_VALUE) return deviceTimeZone();
    if (timezoneSelect.value === CUSTOM_ZONE_VALUE) return String(customTimezoneInput?.value || "").trim();
    return String(timezoneSelect.value || "").trim();
  }

  function syncTimezoneUi({ resetDate = false } = {}) {
    if (!timezoneSelect) return;
    const custom = timezoneSelect.value === CUSTOM_ZONE_VALUE;
    if (customTimezoneInput) {
      customTimezoneInput.hidden = !custom;
      customTimezoneInput.disabled = busy || !custom;
    }

    const zone = selectedTimezone();
    if (timezoneHint) {
      timezoneHint.textContent = timezoneSelect.value === DEVICE_ZONE_VALUE
        ? `This device reports ${deviceTimeZone()}.`
        : custom
          ? "Enter a valid IANA timezone, for example Pacific/Honolulu."
          : "Your weekly service hours will be evaluated in this local time.";
    }

    if (resetDate && zone && endDateInput) {
      endDateInput.value = defaultEndDate(zone);
    }
  }

  function selectTimezone(timeZone) {
    if (!timezoneSelect || !timeZone) return;
    const exact = Array.from(timezoneSelect.options).some((option) => option.value === timeZone);
    if (exact) {
      timezoneSelect.value = timeZone;
      if (customTimezoneInput) customTimezoneInput.value = "";
    } else {
      timezoneSelect.value = CUSTOM_ZONE_VALUE;
      if (customTimezoneInput) customTimezoneInput.value = timeZone;
    }
    syncTimezoneUi();
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
      const error = new Error(data?.error || "Could not update Travel Mode");
      error.code = data?.code || "";
      throw error;
    }
    return data;
  }

  function setBusy(next) {
    busy = next;
    section?.classList.toggle("is-busy", next);
    [timezoneSelect, customTimezoneInput, endDateInput, startButton, stopButton].forEach((control) => {
      if (control) control.disabled = next;
    });
    syncTimezoneUi();
  }

  function render(data, { preserveDraft = false } = {}) {
    const travel = data?.travel || {};
    const profile = data?.profile || {};
    const effective = data?.effective || {};

    section.dataset.travelActive = travel.active ? "true" : "false";
    statusNode.textContent = travel.active ? "On" : "Off";

    if (travel.active) {
      metaNode.textContent = `${labelForTimezone(travel.timezone)} · through ${formatExpiry(travel.expiresAt, travel.timezone) || "expiry"}`;
      if (!preserveDraft) {
        selectTimezone(travel.timezone || "");
        endDateInput.value = dateIsoInZone(new Date(travel.expiresAt), travel.timezone) || "";
      }
      startButton.textContent = "Update travel mode";
      stopButton.hidden = false;
    } else {
      metaNode.textContent = `Off · weekly schedule uses ${profile.defaultTimezone || "America/Bogota"}`;
      if (!preserveDraft) {
        timezoneSelect.value = DEVICE_ZONE_VALUE;
        if (customTimezoneInput) customTimezoneInput.value = "";
        syncTimezoneUi();
        endDateInput.value = defaultEndDate(deviceTimeZone());
      }
      startButton.textContent = "Start travel mode";
      stopButton.hidden = true;
    }

    const coreMeta = card.querySelector(".availability-admin-card__meta");
    if (coreMeta && effective.source === "weekly-schedule") {
      coreMeta.textContent = `Auto · weekly schedule · ${effective.timeZone || profile.defaultTimezone || "America/Bogota"}`;
    }
  }

  async function load() {
    try {
      const data = await request();
      render(data);
    } catch (error) {
      feedbackNode.textContent = error.message || "Could not load Travel Mode";
      feedbackNode.dataset.state = "error";
    }
  }

  async function saveTravel() {
    if (busy) return;
    const timezone = selectedTimezone();
    const endDate = String(endDateInput.value || "").trim();
    if (!timezone || !endDate) {
      feedbackNode.textContent = "Choose a timezone and an end date.";
      feedbackNode.dataset.state = "error";
      return;
    }

    setBusy(true);
    feedbackNode.textContent = "Saving travel mode…";
    feedbackNode.dataset.state = "";
    try {
      const data = await request({
        action: "travel",
        enabled: true,
        timezone,
        endDate
      });
      render(data);
      feedbackNode.textContent = "Travel Mode saved. Weekly service hours now use this timezone until the end date.";
      feedbackNode.dataset.state = "success";
    } catch (error) {
      feedbackNode.textContent = error.code === "invalid_travel_timezone"
        ? "Choose a listed timezone or enter a valid IANA timezone under Other."
        : error.code === "invalid_travel_end_date"
          ? "Choose today or a future date within 90 days."
          : (error.message || "Could not save Travel Mode");
      feedbackNode.dataset.state = "error";
    } finally {
      setBusy(false);
    }
  }

  async function stopTravel() {
    if (busy) return;
    setBusy(true);
    feedbackNode.textContent = "Turning Travel Mode off…";
    feedbackNode.dataset.state = "";
    try {
      const data = await request({ action: "travel", enabled: false });
      render(data, { preserveDraft: true });
      feedbackNode.textContent = "Travel Mode off. Weekly service hours are back on the base timezone.";
      feedbackNode.dataset.state = "success";
    } catch (error) {
      feedbackNode.textContent = error.message || "Could not turn Travel Mode off";
      feedbackNode.dataset.state = "error";
    } finally {
      setBusy(false);
    }
  }

  function buildSection() {
    card = document.getElementById("availabilityAdminCard");
    if (!card || document.getElementById("availabilityTravelSection")) return false;

    const schedule = card.querySelector(".availability-schedule");
    if (!schedule) return false;

    section = document.createElement("section");
    section.className = "availability-admin-section availability-travel";
    section.id = "availabilityTravelSection";
    section.innerHTML = `
      <div class="availability-admin-section__head availability-travel__head">
        <div>
          <strong>Travel mode</strong>
          <small>Temporary timezone · does not force Away</small>
        </div>
        <span class="availability-travel__status" id="availabilityTravelStatus">Off</span>
      </div>

      <small class="availability-admin-section__meta availability-travel__meta" id="availabilityTravelMeta"></small>

      <div class="availability-travel__controls">
        <label class="availability-travel__field">
          <span>Timezone</span>
          <select id="availabilityTravelTimezone" aria-describedby="availabilityTravelTimezoneHint">
            ${timezoneOptionsMarkup()}
          </select>
          <input id="availabilityTravelTimezoneCustom" class="availability-travel__custom-zone" autocomplete="off" spellcheck="false" placeholder="Pacific/Honolulu" hidden />
          <small class="availability-travel__field-hint" id="availabilityTravelTimezoneHint"></small>
        </label>
        <label class="availability-travel__field">
          <span>Through</span>
          <input id="availabilityTravelEndDate" type="date" />
          <small class="availability-travel__field-hint">Travel Mode ends at 11:59 PM in the selected timezone.</small>
        </label>
      </div>

      <div class="availability-travel__actions">
        <button type="button" class="availability-admin-card__apply" id="availabilityTravelStart">Start travel mode</button>
        <button type="button" class="availability-travel__stop" id="availabilityTravelStop" hidden>Turn off</button>
      </div>

      <small class="availability-admin-section__feedback availability-travel__feedback" id="availabilityTravelFeedback" role="status" aria-live="polite"></small>
    `;

    schedule.before(section);
    timezoneSelect = section.querySelector("#availabilityTravelTimezone");
    customTimezoneInput = section.querySelector("#availabilityTravelTimezoneCustom");
    timezoneHint = section.querySelector("#availabilityTravelTimezoneHint");
    endDateInput = section.querySelector("#availabilityTravelEndDate");
    statusNode = section.querySelector("#availabilityTravelStatus");
    metaNode = section.querySelector("#availabilityTravelMeta");
    feedbackNode = section.querySelector("#availabilityTravelFeedback");
    startButton = section.querySelector("#availabilityTravelStart");
    stopButton = section.querySelector("#availabilityTravelStop");

    timezoneSelect.value = DEVICE_ZONE_VALUE;
    syncTimezoneUi({ resetDate: true });
    timezoneSelect.addEventListener("change", () => {
      syncTimezoneUi({ resetDate: section.dataset.travelActive !== "true" });
      if (timezoneSelect.value === CUSTOM_ZONE_VALUE) customTimezoneInput?.focus();
    });
    customTimezoneInput?.addEventListener("change", () => {
      if (section.dataset.travelActive !== "true" && selectedTimezone()) {
        endDateInput.value = defaultEndDate(selectedTimezone());
      }
    });
    startButton.addEventListener("click", saveTravel);
    stopButton.addEventListener("click", stopTravel);
    return true;
  }

  function init() {
    if (!buildSection()) return;
    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    queueMicrotask(init);
  }
})();
