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

  async function api(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
})();