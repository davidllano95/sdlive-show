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

  const DAY_MS = 86400000;
  let events = [];
  let visibleMonth = monthStart(dateFromIso(bogotaTodayIso()));

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

  async function api(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Calendar API timed out");
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
    const upcoming = events.find((event) => event.endDate >= todayIso);
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

  async function load() {
    try {
      const [whoami, calendar] = await Promise.all([
        api("/api/admin/whoami"),
        api("/api/admin/calendar/events")
      ]);
      if (identity) identity.textContent = whoami.email || "Authenticated";
      events = Array.isArray(calendar.events) ? calendar.events : [];
      const issueCount = Object.values(calendar.quality || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );
      setStatus(
        issueCount ? `Calendar online · ${issueCount} date warning${issueCount === 1 ? "" : "s"}` : "Calendar online · read-only",
        issueCount ? "is-warning" : ""
      );
      render();
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
