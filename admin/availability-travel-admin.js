(() => {
  const ENDPOINT = "/api/admin/availability";
  const COMMON_TIMEZONES = [
    "America/Bogota",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/Madrid",
    "Europe/London",
    "Australia/Sydney",
    "Asia/Singapore"
  ];

  let card = null;
  let section = null;
  let timezoneInput = null;
  let endDateInput = null;
  let statusNode = null;
  let metaNode = null;
  let feedbackNode = null;
  let startButton = null;
  let stopButton = null;
  let busy = false;

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
    return dateIsoInZone(new Date(Date.now() + 7 * 86400000), timeZone || "America/Bogota");
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
    [timezoneInput, endDateInput, startButton, stopButton].forEach((control) => {
      if (control) control.disabled = next;
    });
  }

  function render(data, { preserveDraft = false } = {}) {
    const travel = data?.travel || {};
    const profile = data?.profile || {};
    const effective = data?.effective || {};

    section.dataset.travelActive = travel.active ? "true" : "false";
    statusNode.textContent = travel.active ? "On" : "Off";

    if (travel.active) {
      metaNode.textContent = `${travel.timezone} · through ${formatExpiry(travel.expiresAt, travel.timezone) || "expiry"}`;
      if (!preserveDraft) {
        timezoneInput.value = travel.timezone || "";
        endDateInput.value = dateIsoInZone(new Date(travel.expiresAt), travel.timezone) || "";
      }
      startButton.textContent = "Update travel mode";
      stopButton.hidden = false;
    } else {
      metaNode.textContent = `Off · weekly schedule uses ${profile.defaultTimezone || "America/Bogota"}`;
      if (!preserveDraft) {
        const fallbackZone = timezoneInput.value || "Europe/Madrid";
        timezoneInput.value = fallbackZone;
        if (!endDateInput.value) endDateInput.value = defaultEndDate(fallbackZone);
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
    const timezone = String(timezoneInput.value || "").trim();
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
        ? "Use a valid IANA timezone, for example Europe/Madrid."
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
        <label>
          <span>Timezone</span>
          <input id="availabilityTravelTimezone" list="availabilityTravelTimezones" autocomplete="off" spellcheck="false" placeholder="Europe/Madrid" />
        </label>
        <label>
          <span>Through</span>
          <input id="availabilityTravelEndDate" type="date" />
        </label>
      </div>

      <datalist id="availabilityTravelTimezones">
        ${COMMON_TIMEZONES.map((zone) => `<option value="${zone}"></option>`).join("")}
      </datalist>

      <div class="availability-travel__actions">
        <button type="button" class="availability-admin-card__apply" id="availabilityTravelStart">Start travel mode</button>
        <button type="button" class="availability-travel__stop" id="availabilityTravelStop" hidden>Turn off</button>
      </div>

      <small class="availability-admin-section__feedback availability-travel__feedback" id="availabilityTravelFeedback" role="status" aria-live="polite"></small>
    `;

    schedule.before(section);
    timezoneInput = section.querySelector("#availabilityTravelTimezone");
    endDateInput = section.querySelector("#availabilityTravelEndDate");
    statusNode = section.querySelector("#availabilityTravelStatus");
    metaNode = section.querySelector("#availabilityTravelMeta");
    feedbackNode = section.querySelector("#availabilityTravelFeedback");
    startButton = section.querySelector("#availabilityTravelStart");
    stopButton = section.querySelector("#availabilityTravelStop");

    timezoneInput.value = "Europe/Madrid";
    endDateInput.value = defaultEndDate(timezoneInput.value);
    timezoneInput.addEventListener("change", () => {
      if (!endDateInput.value) endDateInput.value = defaultEndDate(timezoneInput.value);
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
