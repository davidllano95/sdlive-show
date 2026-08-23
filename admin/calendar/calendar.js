(() => {
  const shell = document.querySelector(".backoffice");
  const collapse = document.getElementById("collapseSidebar");
  const identity = document.getElementById("identity");
  const statusPill = document.getElementById("calendarStatus");
  const grid = document.getElementById("calendarGrid");
  const agenda = document.getElementById("calendarAgenda");
  const empty = document.getElementById("calendarEmpty");
  const monthTitle = document.getElementById("calendarMonthTitle");
  const monthCount = document.getElementById("monthCount");
  const multiDayCount = document.getElementById("multiDayCount");
  const nextDate = document.getElementById("nextDate");
  const nextLabel = document.getElementById("nextLabel");
  const previousButton = document.getElementById("calendarPrev");
  const todayButton = document.getElementById("calendarToday");
  const nextButton = document.getElementById("calendarNext");
  const openCreateButton = document.getElementById("openCreateWork");
  const createDialog = document.getElementById("createWorkDialog");
  const createForm = document.getElementById("createWorkForm");
  const closeCreateButton = document.getElementById("closeCreateWork");
  const cancelCreateButton = document.getElementById("cancelCreateWork");
  const createSubmitButton = document.getElementById("createWorkSubmit");
  const createMessage = document.getElementById("createWorkMessage");
  const startInput = document.getElementById("workStartDate");
  const endInput = document.getElementById("workEndDate");

  const DAY_MS = 86400000;
  let events = [];
  let visibleMonth = monthStart(dateFromIso(bogotaTodayIso()));
  let createRequestId = null;
  let previousStartDate = "";
  let isCreating = false;

  function safeStorageGet(key) {
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // Layout preference is non-critical.
    }
  }

  const collapsed = safeStorageGet("sdlive-admin-dashboard-collapsed") === "true";
  shell?.classList.toggle("is-collapsed", collapsed);
  if (collapsed && collapse) collapse.textContent = "Expand";

  collapse?.addEventListener("click", () => {
    const next = !shell?.classList.contains("is-collapsed");
    shell?.classList.toggle("is-collapsed", next);
    safeStorageSet("sdlive-admin-dashboard-collapsed", String(next));
    collapse.textContent = next ? "Expand" : "Collapse";
  });

  function bogotaTodayIso() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
        .formatToParts(new Date())
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function monthStart(value) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  function addDays(value, amount) {
    return new Date(value.getTime() + amount * DAY_MS);
  }

  function addMonths(value, amount) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
  }

  function isoFromDate(value) {
    return value.toISOString().slice(0, 10);
  }

  function dateFromIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dayOrdinal(value) {
    return Math.floor(value.getTime() / DAY_MS);
  }

  function monthBounds(value) {
    const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
    const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
    return { start, end };
  }

  function overlaps(event, start, end) {
    return event.startDate <= isoFromDate(end) && event.endDate >= isoFromDate(start);
  }

  function eventLabel(event) {
    return event.project || event.client || "Untitled work";
  }

  function eventTitle(event) {
    const dateLabel = event.multiDay
      ? `${event.startDate} → ${event.endDate}`
      : event.startDate;
    return [
      eventLabel(event),
      event.client && event.client !== eventLabel(event) ? event.client : "",
      event.role,
      dateLabel,
      event.state
    ].filter(Boolean).join(" · ");
  }

  async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }

    try {
      const response = await fetch(url, {
        ...options,
        method,
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
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("Calendar API timed out");
        timeoutError.code = "timeout";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function setStatus(text, className = "") {
    if (!statusPill) return;
    statusPill.classList.remove("is-warning", "is-error");
    if (className) statusPill.classList.add(className);
    const textNode = statusPill.querySelector("span");
    if (textNode) textNode.textContent = text;
  }

  function weekSegments(weekStart, weekEnd, monthEvents) {
    const weekStartIso = isoFromDate(weekStart);
    const weekEndIso = isoFromDate(weekEnd);
    const segments = monthEvents
      .filter((event) => event.startDate <= weekEndIso && event.endDate >= weekStartIso)
      .map((event) => {
        const eventStart = dateFromIso(event.startDate);
        const eventEnd = dateFromIso(event.endDate);
        const clippedStart = eventStart < weekStart ? weekStart : eventStart;
        const clippedEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
        return {
          event,
          startCol: dayOrdinal(clippedStart) - dayOrdinal(weekStart),
          endCol: dayOrdinal(clippedEnd) - dayOrdinal(weekStart),
          clippedBefore: eventStart < weekStart,
          clippedAfter: eventEnd > weekEnd,
          lane: 0
        };
      })
      .sort((a, b) => {
        if (a.startCol !== b.startCol) return a.startCol - b.startCol;
        return (b.endCol - b.startCol) - (a.endCol - a.startCol);
      });

    const laneEnds = [];
    for (const segment of segments) {
      let lane = laneEnds.findIndex((endCol) => endCol < segment.startCol);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(segment.endCol);
      } else {
        laneEnds[lane] = segment.endCol;
      }
      segment.lane = lane;
    }

    return { segments, laneCount: laneEnds.length };
  }

  function renderWeek(weekStart, currentMonth, monthEvents) {
    const weekEnd = addDays(weekStart, 6);
    const { segments, laneCount } = weekSegments(weekStart, weekEnd, monthEvents);
    const week = document.createElement("div");
    week.className = "calendar-week";
    week.style.setProperty("--calendar-lanes", String(laneCount));

    const days = document.createElement("div");
    days.className = "calendar-days";
    const todayIso = bogotaTodayIso();

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(weekStart, offset);
      const cell = document.createElement("div");
      cell.className = "calendar-day";
      if (date.getUTCMonth() !== currentMonth.getUTCMonth()) cell.classList.add("is-outside");
      if (isoFromDate(date) === todayIso) cell.classList.add("is-today");

      const number = document.createElement("span");
      number.className = "calendar-day__number";
      number.textContent = String(date.getUTCDate());
      cell.appendChild(number);
      days.appendChild(cell);
    }

    const eventLayer = document.createElement("div");
    eventLayer.className = "calendar-events";

    segments.forEach((segment) => {
      const pill = document.createElement("div");
      pill.className = "calendar-event";
      pill.dataset.multiday = String(segment.event.multiDay);
      pill.tabIndex = 0;
      pill.textContent = eventLabel(segment.event);
      pill.title = eventTitle(segment.event);
      pill.style.gridColumn = `${segment.startCol + 1} / span ${segment.endCol - segment.startCol + 1}`;
      pill.style.gridRow = String(segment.lane + 1);
      if (segment.clippedBefore) pill.classList.add("is-clipped-start");
      if (segment.clippedAfter) pill.classList.add("is-clipped-end");
      eventLayer.appendChild(pill);
    });

    week.append(days, eventLayer);
    return week;
  }

  function renderAgenda(monthEvents) {
    if (!agenda) return;
    agenda.innerHTML = "";

    const grouped = new Map();
    monthEvents.forEach((event) => {
      const key = event.startDate;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    });

    for (const [dateKey, dayEvents] of grouped) {
      const section = document.createElement("section");
      section.className = "calendar-agenda__day";
      const date = dateFromIso(dateKey);
      const heading = document.createElement("div");
      heading.className = "calendar-agenda__date";
      heading.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      }).format(date);
      section.appendChild(heading);

      dayEvents.forEach((event) => {
        const item = document.createElement("article");
        item.className = "calendar-agenda__item";
        item.dataset.multiday = String(event.multiDay);
        const strong = document.createElement("strong");
        strong.textContent = eventLabel(event);
        const meta = document.createElement("span");
        const range = event.multiDay ? `${event.startDate} → ${event.endDate}` : event.startDate;
        meta.textContent = [event.client, event.role, range, event.state].filter(Boolean).join(" · ");
        item.append(strong, meta);
        section.appendChild(item);
      });

      agenda.appendChild(section);
    }
  }

  function renderMetrics(monthEvents) {
    if (monthCount) monthCount.textContent = String(monthEvents.length);
    if (multiDayCount) {
      multiDayCount.textContent = String(monthEvents.filter((event) => event.multiDay).length);
    }

    const todayIso = bogotaTodayIso();
    const upcoming = events.find((event) => event.startDate >= todayIso);
    if (!upcoming) {
      if (nextDate) nextDate.textContent = "—";
      if (nextLabel) nextLabel.textContent = "No upcoming event";
      return;
    }

    const start = dateFromIso(upcoming.startDate);
    if (nextDate) {
      nextDate.textContent = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      }).format(start);
    }
    if (nextLabel) nextLabel.textContent = eventLabel(upcoming);
  }

  function render() {
    if (!grid || !monthTitle) return;
    const { start, end } = monthBounds(visibleMonth);
    const monthEvents = events.filter((event) => overlaps(event, start, end));

    monthTitle.textContent = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(visibleMonth);

    grid.innerHTML = "";
    const gridStart = addDays(start, -start.getUTCDay());
    const gridEnd = addDays(end, 6 - end.getUTCDay());
    for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 7)) {
      grid.appendChild(renderWeek(cursor, visibleMonth, monthEvents));
    }

    renderAgenda(monthEvents);
    renderMetrics(monthEvents);
    if (empty) empty.hidden = monthEvents.length !== 0;
  }

  function applyCalendarData(calendar, statusText = null) {
    events = Array.isArray(calendar?.events) ? calendar.events : [];
    const issueCount = Object.values(calendar?.quality || {}).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0
    );
    setStatus(
      statusText || (issueCount
        ? `Calendar online · ${issueCount} date warning${issueCount === 1 ? "" : "s"}`
        : "Calendar online · operations"),
      issueCount && !statusText ? "is-warning" : ""
    );
    render();
  }

  async function refreshCalendar(statusText = null) {
    const calendar = await api("/api/admin/calendar/events");
    applyCalendarData(calendar, statusText);
    return calendar;
  }

  previousButton?.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, -1);
    render();
  });

  nextButton?.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, 1);
    render();
  });

  todayButton?.addEventListener("click", () => {
    visibleMonth = monthStart(dateFromIso(bogotaTodayIso()));
    render();
  });

  function newRequestId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  function setCreateMessage(text = "", className = "") {
    if (!createMessage) return;
    createMessage.classList.remove("is-error", "is-success");
    if (className) createMessage.classList.add(className);
    createMessage.textContent = text;
  }

  function validateCreateDates() {
    if (!startInput || !endInput) return true;
    endInput.setCustomValidity("");
    if (startInput.value && endInput.value && endInput.value < startInput.value) {
      endInput.setCustomValidity("Fecha fin must be the same day or later than Fecha trabajo.");
      return false;
    }
    return true;
  }

  function resetCreateForm() {
    createForm?.reset();
    createRequestId = null;
    previousStartDate = "";
    if (endInput) {
      endInput.min = "";
      endInput.setCustomValidity("");
    }
    setCreateMessage();
  }

  function openCreateDialog() {
    if (!createDialog || !createForm) return;
    resetCreateForm();
    if (typeof createDialog.showModal === "function") {
      createDialog.showModal();
    } else {
      createDialog.setAttribute("open", "");
    }
    requestAnimationFrame(() => startInput?.focus());
  }

  function closeCreateDialog() {
    if (!createDialog || isCreating) return;
    if (typeof createDialog.close === "function") {
      createDialog.close();
    } else {
      createDialog.removeAttribute("open");
    }
    resetCreateForm();
  }

  openCreateButton?.addEventListener("click", openCreateDialog);
  closeCreateButton?.addEventListener("click", closeCreateDialog);
  cancelCreateButton?.addEventListener("click", closeCreateDialog);

  createDialog?.addEventListener("cancel", (event) => {
    if (isCreating) {
      event.preventDefault();
      return;
    }
    createRequestId = null;
  });

  startInput?.addEventListener("input", () => {
    const start = startInput.value;
    if (endInput) {
      if (!endInput.value || endInput.value === previousStartDate) {
        endInput.value = start;
      }
      endInput.min = start;
    }
    previousStartDate = start;
    validateCreateDates();
  });

  endInput?.addEventListener("input", validateCreateDates);

  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isCreating) return;

    validateCreateDates();
    if (!createForm.reportValidity()) return;

    const formData = new FormData(createForm);
    if (!createRequestId) createRequestId = newRequestId();

    const payload = {
      requestId: createRequestId,
      startDate: String(formData.get("startDate") || ""),
      endDate: String(formData.get("endDate") || ""),
      client: String(formData.get("client") || ""),
      project: String(formData.get("project") || ""),
      role: String(formData.get("role") || ""),
      currency: String(formData.get("currency") || ""),
      grossAmount: String(formData.get("grossAmount") || ""),
      paymentMethod: String(formData.get("paymentMethod") || ""),
      notes: String(formData.get("notes") || ""),
      contactNumber: String(formData.get("contactNumber") || "")
    };

    isCreating = true;
    if (createSubmitButton) createSubmitButton.disabled = true;
    if (cancelCreateButton) cancelCreateButton.disabled = true;
    if (closeCreateButton) closeCreateButton.disabled = true;
    setCreateMessage("Creating work in REGISTRO…");

    try {
      await api("/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      visibleMonth = monthStart(dateFromIso(payload.startDate));
      await refreshCalendar("Work created · Calendar refreshed");
      setCreateMessage("Created successfully.", "is-success");

      if (typeof createDialog?.close === "function") createDialog.close();
      else createDialog?.removeAttribute("open");
      createForm.reset();
      previousStartDate = "";
      createRequestId = null;
    } catch (error) {
      const code = error?.data?.code || "";
      if (code === "sheets_write_http_403") {
        setCreateMessage(
          "Google Sheets write permission is not authorized for this connection yet.",
          "is-error"
        );
      } else if (error?.data?.fields?.endDate === "before_start") {
        setCreateMessage("Fecha fin cannot be earlier than Fecha trabajo.", "is-error");
      } else if (error?.status === 409) {
        setCreateMessage(
          "This submission was already used with different values. Close the form and start a new entry.",
          "is-error"
        );
      } else {
        setCreateMessage(error.message || "Could not create work.", "is-error");
      }
    } finally {
      isCreating = false;
      if (createSubmitButton) createSubmitButton.disabled = false;
      if (cancelCreateButton) cancelCreateButton.disabled = false;
      if (closeCreateButton) closeCreateButton.disabled = false;
    }
  });

  async function load() {
    try {
      const [whoami, calendar] = await Promise.all([
        api("/api/admin/whoami"),
        api("/api/admin/calendar/events")
      ]);
      if (identity) identity.textContent = whoami.email || "Authenticated";
      applyCalendarData(calendar);
    } catch (error) {
      setStatus("Calendar unavailable", "is-error");
      if (monthTitle) monthTitle.textContent = "Could not load Calendar";
      if (empty) {
        empty.hidden = false;
        empty.textContent = error.message || "Could not load Calendar data.";
      }
    }
  }

  load();
})();
