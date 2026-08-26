(() => {
  if (window.SDLiveAdminStabilization) return;
  window.SDLiveAdminStabilization = true;

  const MOBILE_QUERY = "(max-width: 820px)";
  const shell = document.querySelector(".backoffice");
  const sidebar = document.querySelector(".app-sidebar");
  const nav = sidebar?.querySelector(".app-nav") || null;

  function itemLabel(item) {
    return item?.querySelector?.("span")?.textContent?.trim() || "";
  }

  function findNavItem(label) {
    return [...(nav?.querySelectorAll(".app-nav__item") || [])].find(
      (item) => itemLabel(item) === label
    ) || null;
  }

  function ensureCalendarLink() {
    if (!nav) return null;
    const existing = findNavItem("Calendar");
    if (!existing) return null;
    if (existing.tagName === "A") return existing;

    const link = document.createElement("a");
    link.className = existing.className.replace(/\bis-disabled\b/g, "").trim();
    link.href = "/admin/calendar/";
    link.innerHTML = existing.innerHTML;
    const small = link.querySelector("small");
    if (small) small.textContent = "Operations";
    if (window.location.pathname.startsWith("/admin/calendar/")) link.classList.add("is-active");
    existing.replaceWith(link);
    return link;
  }

  function normalizeNavigation() {
    if (!nav) return;
    ensureCalendarLink();
    findNavItem("Media")?.remove();
    const firstLabel = nav.querySelector(".nav-label");
    if (!firstLabel) return;
    ["Dashboard", "Calendar", "Finance", "Inbox", "Site Editor"].forEach((label) => {
      const item = findNavItem(label);
      if (item) nav.insertBefore(item, firstLabel);
    });
  }

  function normalizeContextActions() {
    document.querySelectorAll(".top-actions, .toolbar").forEach((zone) => {
      zone.dataset.adminActionZone = "true";
    });
    document.querySelectorAll(".top-actions a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (["/admin/", "/admin/calendar/", "../", "./"].includes(href)) {
        link.dataset.contextRole = "parent";
        link.classList.add("button--ghost");
      }
    });
  }

  function createMobileNavigation() {
    if (!shell || !sidebar || document.querySelector(".admin-mobile-menu-toggle")) return;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "admin-mobile-menu-toggle";
    toggle.setAttribute("aria-label", "Open Admin navigation");
    toggle.setAttribute("aria-controls", sidebar.id || "appSidebar");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>';

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "admin-mobile-menu-backdrop";
    backdrop.setAttribute("aria-label", "Close Admin navigation");
    document.body.append(toggle, backdrop);

    const close = () => {
      document.body.classList.remove("admin-mobile-nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open Admin navigation");
    };
    const open = () => {
      document.body.classList.add("admin-mobile-nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close Admin navigation");
    };

    toggle.addEventListener("click", () => {
      document.body.classList.contains("admin-mobile-nav-open") ? close() : open();
    });
    backdrop.addEventListener("click", close);
    nav?.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });

    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => { if (!media.matches) close(); };
    media.addEventListener?.("change", sync);
    sync();
  }

  function createEditorMobileGate() {
    if (!document.querySelector(".editor-backoffice") || document.querySelector(".admin-editor-mobile-gate")) return;
    const gate = document.createElement("section");
    gate.className = "admin-editor-mobile-gate";
    gate.setAttribute("aria-label", "Site Editor desktop-only notice");
    gate.innerHTML = `
      <div class="admin-editor-mobile-gate__card">
        <span class="eyebrow">SD.Live Admin</span>
        <h1>Site Editor is desktop-only</h1>
        <p>The operational Admin remains available on mobile, but editing the public site needs the full desktop workspace.</p>
        <a href="/admin/">Back to Admin</a>
      </div>
    `;
    document.body.appendChild(gate);
  }

  function loadScript(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute(`data-${marker}`, "true");
    document.body.appendChild(script);
  }

  function loadStyle(href, marker) {
    if (document.querySelector(`link[data-${marker}]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(`data-${marker}`, "true");
    document.head.appendChild(link);
  }

  function loadEditorExtensions() {
    if (!document.querySelector(".editor-backoffice")) return;
    loadScript("/admin/editor/site-presentation-editor.js?v=20260825-1", "sdlive-site-presentation-editor");
    loadScript("/admin/editor/rental-stabilization-editor.js?v=20260825-1", "sdlive-rental-stabilization-editor");
  }

  function loadPathExtensions() {
    const path = window.location.pathname;
    if (path === "/admin/calendar/" || path === "/admin/calendar") {
      loadStyle("/admin/calendar-stabilization.css?v=20260826-1", "sdlive-calendar-stabilization");
      loadScript("/admin/calendar-google-integration.js?v=20260826-1", "sdlive-calendar-google-integration");
    }
    if (path.startsWith("/admin/calendar/site-schedule")) {
      loadStyle("/admin/site-schedule-stabilization.css?v=20260825-1", "sdlive-site-schedule-stabilization");
      loadScript("/admin/site-schedule-stabilization.js?v=20260825-1", "sdlive-site-schedule-stabilization");
    }
  }

  normalizeNavigation();
  normalizeContextActions();
  createMobileNavigation();
  createEditorMobileGate();
  loadEditorExtensions();
  loadPathExtensions();
})();