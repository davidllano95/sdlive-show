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

  const collapsed = localStorage.getItem("sdlive-admin-dashboard-collapsed") === "true";
  shell.classList.toggle("is-collapsed", collapsed);

  collapse?.addEventListener("click", () => {
    const next = !shell.classList.contains("is-collapsed");
    shell.classList.toggle("is-collapsed", next);
    localStorage.setItem("sdlive-admin-dashboard-collapsed", String(next));
    collapse.textContent = next ? "Expand" : "Collapse";
  });

  if (collapsed && collapse) collapse.textContent = "Expand";

  async function api(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store"
    });

    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      throw new Error("Unexpected response");
    }

    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
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

      identity.textContent = whoami.email || "Authenticated";

      d1Status.textContent = health.ok ? "Online" : "Issue";
      d1Detail.textContent = health.database || "D1";

      const hasDraft = Boolean(hero.entry?.hasUnpublishedChanges);
      heroState.textContent = hasDraft ? "Draft pending" : "Published";
      heroDetail.textContent = hasDraft
        ? "Draft differs from Published"
        : "Draft and Published are in sync";

      lastPublish.textContent = hero.entry?.publishedAt
        ? formatTimestamp(hero.entry.publishedAt)
        : "Not yet";
      revisionCount.textContent = String(revisions.revisions?.length || 0);

      systemPill.querySelector("span").textContent = hasDraft
        ? "CMS online · draft pending"
        : "CMS online · synced";
      systemPill.classList.toggle("is-warning", hasDraft);

      const rows = revisions.revisions || [];
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
    } catch (error) {
      d1Status.textContent = "Check";
      d1Detail.textContent = error.message;
      heroState.textContent = "Unavailable";
      heroDetail.textContent = "Could not read CMS";
      systemPill.classList.add("is-error");
      systemPill.querySelector("span").textContent = "Admin API check failed";
      activity.innerHTML = '<div class="activity-empty">Could not load CMS activity.</div>';
    }
  }

  load();
})();
