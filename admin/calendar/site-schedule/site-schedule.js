(() => {
  const identity = document.getElementById("identity");
  const statusPill = document.getElementById("scheduleStatus");
  const eventSearch = document.getElementById("eventSearch");
  const eventList = document.getElementById("eventList");
  const editorEmpty = document.getElementById("editorEmpty");
  const form = document.getElementById("scheduleForm");
  const editorTitle = document.getElementById("scheduleEditorTitle");
  const sourceRange = document.getElementById("sourceRange");
  const segmentList = document.getElementById("segmentList");
  const segmentTemplate = document.getElementById("segmentTemplate");
  const addSegmentButton = document.getElementById("addSegment");
  const resetButton = document.getElementById("resetSchedule");
  const saveButton = document.getElementById("saveSchedule");
  const message = document.getElementById("scheduleMessage");

  const DAY_MS = 86400000;
  let sourceEvents = [];
  let schedule = { version: 1, overrides: {} };
  let selectedEvent = null;
  let saving = false;

  async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        const error = new Error(data?.error || `Request failed (${response.status})`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function eventLabel(event) {
    return event?.project || event?.client || "Untitled work";
  }

  function formatRange(startDate, endDate) {
    return startDate === endDate ? startDate : `${startDate} → ${endDate}`;
  }

  function setStatus(text, className = "") {
    if (!statusPill) return;
    statusPill.classList.remove("is-warning", "is-error");
    if (className) statusPill.classList.add(className);
    const label = statusPill.querySelector("span");
    if (label) label.textContent = text;
  }

  function setMessage(text = "", className = "") {
    if (!message) return;
    message.classList.remove("is-error", "is-success");
    if (className) message.classList.add(className);
    message.textContent = text;
  }

  function overrideFor(event) {
    return event?.eventKey ? schedule?.overrides?.[event.eventKey] || null : null;
  }

  function renderEventList() {
    if (!eventList) return;
    const query = String(eventSearch?.value || "").trim().toLowerCase();
    const filtered = sourceEvents.filter((event) => {
      if (!query) return true;
      return [event.client, event.project, event.role, event.startDate, event.endDate]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });

    eventList.innerHTML = "";
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "schedule-list-empty";
      empty.textContent = "No matching work.";
      eventList.appendChild(empty);
      return;
    }

    filtered.forEach((event) => {
      const override = overrideFor(event);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "schedule-event";
      button.classList.toggle("is-selected", selectedEvent?.eventKey === event.eventKey);
      button.dataset.eventKey = event.eventKey;

      const heading = document.createElement("span");
      heading.className = "schedule-event__title";
      heading.textContent = eventLabel(event);

      const meta = document.createElement("span");
      meta.className = "schedule-event__meta";
      meta.textContent = [event.client, event.role, formatRange(event.startDate, event.endDate)]
        .filter(Boolean)
        .join(" · ");

      const badges = document.createElement("span");
      badges.className = "schedule-event__badges";
      if (override) {
        const split = document.createElement("em");
        split.textContent = `${override.segments?.length || 0} block${override.segments?.length === 1 ? "" : "s"}`;
        badges.appendChild(split);
        if (override.segments?.some((segment) => segment.showDay === true)) {
          const showDay = document.createElement("em");
          showDay.className = "is-showday";
          showDay.textContent = "Show Day";
          badges.appendChild(showDay);
        }
      }

      button.append(heading, meta, badges);
      button.addEventListener("click", () => selectEvent(event));
      eventList.appendChild(button);
    });
  }

  function dateFromIso(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  function isoFromDate(value) {
    return value.toISOString().slice(0, 10);
  }

  function addDaysIso(value, amount) {
    const date = dateFromIso(value);
    return date ? isoFromDate(new Date(date.getTime() + amount * DAY_MS)) : value;
  }

  function defaultSegment(event) {
    return {
      startDate: event.startDate,
      endDate: event.endDate,
      showDay: false,
      location: ""
    };
  }

  function segmentValues() {
    return Array.from(segmentList?.querySelectorAll(".schedule-segment") || []).map((row) => ({
      startDate: row.querySelector('[data-field="startDate"]')?.value || "",
      endDate: row.querySelector('[data-field="endDate"]')?.value || "",
      showDay: row.querySelector('[data-field="showDay"]')?.checked === true,
      location: row.querySelector('[data-field="location"]')?.value.trim() || ""
    }));
  }

  function updateLocationRequirement(row) {
    const showDay = row.querySelector('[data-field="showDay"]');
    const location = row.querySelector('[data-field="location"]');
    if (!showDay || !location) return;
    location.required = showDay.checked;
    row.classList.toggle("is-showday", showDay.checked);
  }

  function renderSegment(segment = {}) {
    if (!segmentTemplate || !segmentList || !selectedEvent) return;
    const fragment = segmentTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".schedule-segment");
    const start = row.querySelector('[data-field="startDate"]');
    const end = row.querySelector('[data-field="endDate"]');
    const showDay = row.querySelector('[data-field="showDay"]');
    const location = row.querySelector('[data-field="location"]');
    const remove = row.querySelector('[data-action="remove"]');

    start.min = selectedEvent.startDate;
    start.max = selectedEvent.endDate;
    end.min = selectedEvent.startDate;
    end.max = selectedEvent.endDate;
    start.value = segment.startDate || selectedEvent.startDate;
    end.value = segment.endDate || start.value;
    showDay.checked = segment.showDay === true;
    location.value = segment.location || "";

    const validateDates = () => {
      start.setCustomValidity("");
      end.setCustomValidity("");
      if (start.value && end.value && end.value < start.value) {
        end.setCustomValidity("End must be the same day or later than Start.");
      }
    };

    start.addEventListener("input", () => {
      end.min = start.value || selectedEvent.startDate;
      validateDates();
    });
    end.addEventListener("input", validateDates);
    showDay.addEventListener("change", () => updateLocationRequirement(row));
    remove.addEventListener("click", () => {
      row.remove();
      if (!segmentList.children.length) renderSegment(defaultSegment(selectedEvent));
    });

    updateLocationRequirement(row);
    segmentList.appendChild(fragment);
  }

  function selectEvent(event) {
    selectedEvent = event;
    editorEmpty.hidden = true;
    form.hidden = false;
    editorTitle.textContent = eventLabel(event);
    sourceRange.textContent = [
      event.client,
      event.role,
      `REGISTRO: ${formatRange(event.startDate, event.endDate)}`
    ].filter(Boolean).join(" · ");
    segmentList.innerHTML = "";
    const override = overrideFor(event);
    const segments = override?.segments?.length ? override.segments : [defaultSegment(event)];
    segments.forEach(renderSegment);
    setMessage();
    renderEventList();
    document.getElementById("scheduleEditor")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function nextSuggestedSegment() {
    const segments = segmentValues().sort((a, b) => a.startDate.localeCompare(b.startDate));
    const last = segments[segments.length - 1];
    let startDate = selectedEvent.startDate;
    if (last?.endDate) {
      const candidate = addDaysIso(last.endDate, 1);
      if (candidate <= selectedEvent.endDate) startDate = candidate;
    }
    return { startDate, endDate: startDate, showDay: false, location: "" };
  }

  function validateSegments(segments) {
    setMessage();
    const ordered = [...segments].sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.endDate.localeCompare(b.endDate);
    });

    for (const segment of ordered) {
      if (!segment.startDate || !segment.endDate) return "Every block needs Start and End dates.";
      if (segment.startDate < selectedEvent.startDate || segment.endDate > selectedEvent.endDate) {
        return "Every block must stay inside the original REGISTRO date range.";
      }
      if (segment.endDate < segment.startDate) return "A block cannot end before it starts.";
      if (segment.showDay && !segment.location) return "Location is required for every Show Day block.";
    }

    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].startDate <= ordered[index - 1].endDate) {
        return "Website blocks cannot overlap.";
      }
    }
    return "";
  }

  addSegmentButton?.addEventListener("click", () => {
    if (!selectedEvent) return;
    renderSegment(nextSuggestedSegment());
  });

  resetButton?.addEventListener("click", async () => {
    if (!selectedEvent || saving) return;
    const override = overrideFor(selectedEvent);
    if (!override) {
      segmentList.innerHTML = "";
      renderSegment(defaultSegment(selectedEvent));
      return;
    }
    if (!window.confirm("Remove the Site Schedule override and use the original REGISTRO dates?")) return;

    saving = true;
    resetButton.disabled = true;
    saveButton.disabled = true;
    setMessage("Removing Site Schedule override…");
    try {
      const result = await api(`/api/admin/site-schedule/events/${selectedEvent.eventKey}`, {
        method: "DELETE"
      });
      schedule = result.schedule || schedule;
      segmentList.innerHTML = "";
      renderSegment(defaultSegment(selectedEvent));
      renderEventList();
      setMessage("REGISTRO dates restored for the website.", "is-success");
    } catch (error) {
      setMessage(error.message || "Could not remove Site Schedule override.", "is-error");
    } finally {
      saving = false;
      resetButton.disabled = false;
      saveButton.disabled = false;
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedEvent || saving) return;
    if (!form.reportValidity()) return;

    const segments = segmentValues();
    const validationError = validateSegments(segments);
    if (validationError) {
      setMessage(validationError, "is-error");
      return;
    }

    saving = true;
    resetButton.disabled = true;
    saveButton.disabled = true;
    setMessage("Saving Site Schedule…");

    try {
      const result = await api(`/api/admin/site-schedule/events/${selectedEvent.eventKey}`, {
        method: "PUT",
        body: JSON.stringify({
          label: eventLabel(selectedEvent),
          client: selectedEvent.client || "",
          sourceStartDate: selectedEvent.startDate,
          sourceEndDate: selectedEvent.endDate,
          segments
        })
      });
      schedule.overrides[selectedEvent.eventKey] = result.override;
      renderEventList();
      setMessage("Saved. Admin Calendar and automatic Show Day now use these blocks.", "is-success");
      setStatus("Site Schedule online");
    } catch (error) {
      const fields = error?.data?.fields;
      const detail = fields ? ` (${Object.values(fields)[0]})` : "";
      setMessage(`${error.message || "Could not save Site Schedule."}${detail}`, "is-error");
    } finally {
      saving = false;
      resetButton.disabled = false;
      saveButton.disabled = false;
    }
  });

  eventSearch?.addEventListener("input", renderEventList);

  async function load() {
    try {
      const [whoami, calendar, siteSchedule] = await Promise.all([
        api("/api/admin/whoami"),
        api("/api/admin/calendar/events?view=source"),
        api("/api/admin/site-schedule")
      ]);
      if (identity) identity.textContent = whoami.email || "Authenticated";
      sourceEvents = Array.isArray(calendar.events) ? calendar.events : [];
      schedule = siteSchedule.schedule || { version: 1, overrides: {} };
      setStatus("Site Schedule online");
      renderEventList();
    } catch (error) {
      setStatus("Site Schedule unavailable", "is-error");
      if (eventList) {
        eventList.innerHTML = `<p class="schedule-list-empty">${error.message || "Could not load Site Schedule."}</p>`;
      }
    }
  }

  load();
})();
