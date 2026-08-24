(() => {
  const shell = document.querySelector(".backoffice");
  const collapse = document.getElementById("collapseSidebar");
  const identity = document.getElementById("identity");
  const d1Status = document.getElementById("d1Status");
  const d1Detail = document.getElementById("d1Detail");
  const heroState = document.getElementById("heroState");
  const heroDetail = document.getElementById("heroDetail");
  const lastPublish = document.getElementById("lastPublish");
  const revisionCount = document.getElementById("revisionCount");
  const activity = document.getElementById("activity");
  const systemPill = document.getElementById("systemPill");

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
      // Storage preference is non-critical. The Admin must keep working.
    }
  }

  const collapsed = safeStorageGet("sdlive-admin-dashboard-collapsed") === "true";
  shell?.classList.toggle("is-collapsed", collapsed);

  collapse?.addEventListener("click", () => {
    const next = !shell?.classList.contains("is-collapsed");
    shell?.classList.toggle("is-collapsed", next);
    safeStorageSet("sdlive-admin-dashboard-collapsed", String(next));
    collapse.textContent = next ? "Expand" : "Collapse";
  });

  if (collapsed && collapse) collapse.textContent = "Expand";

  function activateCalendarWorkspace() {
    const navItems = [...document.querySelectorAll(".app-nav__item")];
    const calendarButton = navItems.find(
      (item) => item.tagName === "BUTTON" && item.querySelector("span")?.textContent?.trim() === "Calendar"
    );

    if (calendarButton) {
      const calendarLink = document.createElement("a");
      calendarLink.className = "app-nav__item";
      calendarLink.href = "./calendar/";
      calendarLink.innerHTML = calendarButton.innerHTML;
      const status = calendarLink.querySelector("small");
      if (status) status.textContent = "Operations";
      calendarButton.replaceWith(calendarLink);
    }

    const workspaceGrid = document.querySelector(".workspace-grid");
    if (!workspaceGrid || workspaceGrid.querySelector('[data-workspace="calendar"]')) return;

    const calendarModule = document.createElement("a");
    calendarModule.className = "module";
    calendarModule.href = "./calendar/";
    calendarModule.dataset.workspace = "calendar";
    calendarModule.innerHTML = `
      <div class="module-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h1.5v2H17V3h1.5v2H21v16H3V5h2V3Zm-0.5 7v9h15v-9h-15Z"/></svg>
      </div>
      <div>
        <span class="module-status is-live">Live · Operations</span>
        <h4>Calendar</h4>
        <p>View SD.Live Track jobs and multi-day events, with controlled new-work creation into the same REGISTRO source used by AppSheet.</p>
      </div>
      <span class="arrow">→</span>
    `;

    const firstComingSoon = workspaceGrid.querySelector(".module.is-coming");
    if (firstComingSoon) {
      workspaceGrid.insertBefore(calendarModule, firstComingSoon);
    } else {
      workspaceGrid.appendChild(calendarModule);
    }
  }

  activateCalendarWorkspace();

  async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.headers || {})
        },
        signal: controller.signal
      });

      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");

      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        const error = new Error(data?.error || `Request failed (${response.status})`);
        error.fields = data?.fields || null;
        throw error;
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Admin API timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function formatTimestamp(value) {
    if (!value) return "Not published yet";
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function installShowDayControl() {
    const metrics = document.querySelector(".metrics");
    if (!metrics || document.getElementById("showDayQaControl")) return null;

    const panel = document.createElement("section");
    panel.className = "section panel showday-control";
    panel.id = "showDayQaControl";
    panel.innerHTML = `
      <div class="section-head showday-control__head">
        <div>
          <span class="eyebrow">Visual QA</span>
          <h3>Show Day mode</h3>
        </div>
        <span class="showday-control__status" id="showDayQaStatus">Loading…</span>
      </div>
      <p class="showday-control__intro">Temporarily override the public Show Day state to compare Normal and ON AIR layouts. Force modes expire at the end of today in Bogotá and never edit Site Schedule, REGISTRO or AppSheet.</p>
      <div class="showday-control__row">
        <div class="showday-mode-toggle" role="group" aria-label="Show Day QA mode">
          <button type="button" data-showday-mode="auto" aria-pressed="true">Auto</button>
          <button type="button" data-showday-mode="force_on" aria-pressed="false">Force On</button>
          <button type="button" data-showday-mode="force_off" aria-pressed="false">Force Off</button>
        </div>
        <label class="showday-location" id="showDayLocationWrap" hidden>
          <span>Test location</span>
          <input id="showDayQaLocation" type="text" maxlength="160" autocomplete="off" placeholder="QA · Bogotá" />
        </label>
        <button class="button showday-control__apply" id="showDayQaApply" type="button">Apply mode</button>
      </div>
      <div class="showday-control__meta">
        <span id="showDayQaDetail">Reading automatic state…</span>
        <span id="showDayQaFeedback" role="status" aria-live="polite"></span>
      </div>
    `;
    metrics.insertAdjacentElement("afterend", panel);
    return panel;
  }

  const showDayPanel = installShowDayControl();
  const showDayButtons = [...(showDayPanel?.querySelectorAll("[data-showday-mode]") || [])];
  const showDayLocationWrap = document.getElementById("showDayLocationWrap");
  const showDayLocation = document.getElementById("showDayQaLocation");
  const showDayApply = document.getElementById("showDayQaApply");
  const showDayStatus = document.getElementById("showDayQaStatus");
  const showDayDetail = document.getElementById("showDayQaDetail");
  const showDayFeedback = document.getElementById("showDayQaFeedback");
  let selectedShowDayMode = "auto";

  function setShowDaySelection(mode) {
    selectedShowDayMode = ["auto", "force_on", "force_off"].includes(mode) ? mode : "auto";
    showDayButtons.forEach((button) => {
      const selected = button.dataset.showdayMode === selectedShowDayMode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (showDayLocationWrap) showDayLocationWrap.hidden = selectedShowDayMode !== "force_on";
  }

  function renderShowDayState(data) {
    const mode = data?.override?.mode || "auto";
    const effective = data?.effective || {};
    setShowDaySelection(mode);

    if (mode === "force_on" && showDayLocation) {
      showDayLocation.value = data.override?.location || "";
    }

    if (showDayStatus) {
      if (mode === "force_on") showDayStatus.textContent = "Forced ON";
      else if (mode === "force_off") showDayStatus.textContent = "Forced OFF";
      else showDayStatus.textContent = effective.active ? "Auto · ON AIR" : "Auto · Normal";
      showDayStatus.classList.toggle("is-forced", mode !== "auto");
    }

    if (showDayDetail) {
      const automaticLabel = data?.automatic?.active
        ? `Automatic: ON AIR${data.automatic.location ? ` · ${data.automatic.location}` : ""}`
        : "Automatic: Normal";
      showDayDetail.textContent = mode === "auto"
        ? automaticLabel
        : `${automaticLabel} · override expires after ${data.date} Bogotá`;
    }
  }

  showDayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setShowDaySelection(button.dataset.showdayMode);
      if (showDayFeedback) showDayFeedback.textContent = "";
      if (selectedShowDayMode === "force_on") showDayLocation?.focus();
    });
  });

  async function loadShowDayControl() {
    if (!showDayPanel) return;
    try {
      const data = await api("/api/admin/showday-override");
      renderShowDayState(data);
    } catch (error) {
      if (showDayStatus) showDayStatus.textContent = "Unavailable";
      if (showDayDetail) showDayDetail.textContent = error.message;
    }
  }

  showDayApply?.addEventListener("click", async () => {
    const location = showDayLocation?.value?.trim() || "";
    if (selectedShowDayMode === "force_on" && !location) {
      if (showDayFeedback) showDayFeedback.textContent = "Add a test location before forcing Show Day on.";
      showDayLocation?.focus();
      return;
    }

    const originalLabel = showDayApply.textContent;
    showDayApply.disabled = true;
    showDayApply.textContent = "Applying…";
    if (showDayFeedback) showDayFeedback.textContent = "";

    try {
      const data = await api("/api/admin/showday-override", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedShowDayMode,
          location: selectedShowDayMode === "force_on" ? location : ""
        })
      });
      renderShowDayState(data);
      if (showDayFeedback) showDayFeedback.textContent = "Applied to the public site.";
    } catch (error) {
      if (showDayFeedback) {
        showDayFeedback.textContent = error?.fields?.location === "required_for_force_on"
          ? "A test location is required for Force On."
          : error.message;
      }
    } finally {
      showDayApply.disabled = false;
      showDayApply.textContent = originalLabel;
    }
  });

  async function load() {
    try {
      const [health, whoami, hero, revisions] = await Promise.all([
        api("/api/health"),
        api("/api/admin/whoami"),
        api("/api/admin/content/hero"),
        api("/api/admin/content/hero/revisions")
      ]);

      if (identity) identity.textContent = whoami.email || "Authenticated";
      if (d1Status) d1Status.textContent = health.ok ? "Online" : "Issue";
      if (d1Detail) d1Detail.textContent = health.database || "D1";

      const hasDraft = Boolean(hero.entry?.hasUnpublishedChanges);
      if (heroState) heroState.textContent = hasDraft ? "Draft pending" : "Published";
      if (heroDetail) {
        heroDetail.textContent = hasDraft
          ? "Draft differs from Published"
          : "Draft and Published are in sync";
      }

      if (lastPublish) {
        lastPublish.textContent = hero.entry?.publishedAt
          ? formatTimestamp(hero.entry.publishedAt)
          : "Not yet";
      }
      if (revisionCount) revisionCount.textContent = String(revisions.revisions?.length || 0);

      if (systemPill?.querySelector("span")) {
        systemPill.querySelector("span").textContent = hasDraft
          ? "CMS online · draft pending"
          : "CMS online · synced";
        systemPill.classList.toggle("is-warning", hasDraft);
      }

      const rows = revisions.revisions || [];
      if (activity) {
        if (!rows.length) {
          activity.innerHTML = '<div class="activity-empty">No revisions yet.</div>';
        } else {
          activity.innerHTML = "";
          rows.slice(0, 8).forEach((row) => {
            const item = document.createElement("div");
            item.className = "activity-row";

            const type = document.createElement("span");
            type.className = "activity-type";
            type.textContent = row.revision_type || "change";

            const meta = document.createElement("span");
            meta.className = "activity-meta";
            meta.textContent = row.actor_email || "SD.Live Admin";

            const time = document.createElement("span");
            time.className = "activity-time";
            time.textContent = formatTimestamp(row.created_at);

            item.append(type, meta, time);
            activity.appendChild(item);
          });
        }
      }
    } catch (error) {
      if (d1Status) d1Status.textContent = "Check";
      if (d1Detail) d1Detail.textContent = error.message;
      if (heroState) heroState.textContent = "Unavailable";
      if (heroDetail) heroDetail.textContent = "Could not read CMS";
      if (systemPill) {
        systemPill.classList.add("is-error");
        if (systemPill.querySelector("span")) systemPill.querySelector("span").textContent = "Admin API check failed";
      }
      if (activity) activity.innerHTML = '<div class="activity-empty">Could not load CMS activity.</div>';
    }
  }

  load();
  loadShowDayControl();
})();