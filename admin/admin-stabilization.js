(() => {
  if (window.SDLiveAdminStabilization) return;
  window.SDLiveAdminStabilization = true;

  const MOBILE_QUERY = "(max-width: 820px)";
  const EDITOR_EXTENSION_VERSION = "20260831-4";
  const NAVIGATION_VERSION = "20260927-1";
  const shell = document.querySelector(".backoffice");
  const sidebar = document.querySelector(".app-sidebar");
  const nav = sidebar?.querySelector(".app-nav") || null;

  const PRIMARY_NAV = Object.freeze([
    Object.freeze({
      label: "Dashboard",
      href: "/admin/",
      icon: "M12 3 3 10.1V21h7v-6h4v6h7V10.1L12 3Zm0 2.1 7 5.6v8.8h-3.5v-6h-7v6H5v-8.8l7-5.6Z",
      active: (path) => path === "/admin" || path === "/admin/"
    }),
    Object.freeze({
      label: "Finance",
      href: "/admin/finance/",
      small: "SD.Live Track",
      icon: "M4 5h16v14H4V5Zm2 2v10h12V7H6Zm1.5 7.5h2V16h-2v-1.5Zm3.5-3h2V16h-2v-4.5Zm3.5-3h2V16h-2V8.5Z",
      active: (path) => path.startsWith("/admin/finance")
    }),
    Object.freeze({
      label: "Documents",
      href: "/admin/documents/",
      small: "Docs",
      icon: "M5 3h10l4 4v14H5V3Zm2 2v14h10V8h-3V5H7Zm2 6h6v1.5H9V11Zm0 3h6v1.5H9V14Z",
      active: (path) => path.startsWith("/admin/documents")
    }),
    Object.freeze({
      label: "Calendar",
      href: "/admin/calendar/",
      small: "Operations",
      icon: "M5 3h1.5v2H17V3h1.5v2H21v16H3V5h2V3Zm-0.5 7v9h15v-9h-15Z",
      active: (path) => path.startsWith("/admin/calendar")
    }),
    Object.freeze({
      label: "Site Editor",
      href: "/admin/editor/",
      icon: "m5 3 13.2 8-6.1 1.3 3.8 6-2.1 1.3-3.8-6.1L6 18 5 3Z",
      active: (path) => path.startsWith("/admin/editor")
    }),
    Object.freeze({
      label: "Inbox",
      href: "https://mail.google.com/",
      small: "Gmail ↗",
      external: true,
      icon: "M3 5h18v14H3V5Zm2.2 2 6.8 5.1L18.8 7H5.2ZM5 17h14V9.4l-7 5.2-7-5.2V17Z",
      active: () => false
    })
  ]);

  function itemLabel(item) {
    return item?.querySelector?.("span")?.textContent?.trim() || "";
  }

  function findNavItem(label) {
    return [...(nav?.querySelectorAll(".app-nav__item") || [])].find(
      (item) => itemLabel(item) === label
    ) || null;
  }

  function ensurePrimaryNavItem(config) {
    if (!nav) return null;
    let item = findNavItem(config.label);

    if (!item || item.tagName !== "A") {
      const link = document.createElement("a");
      link.className = (item?.className || "app-nav__item").replace(/\bis-disabled\b/g, "").trim();
      if (item) item.replaceWith(link);
      else nav.appendChild(link);
      item = link;
    }

    item.classList.remove("is-disabled");
    item.removeAttribute("disabled");
    item.setAttribute("href", config.href);
    if (config.external) {
      item.setAttribute("target", "_blank");
      item.setAttribute("rel", "noopener");
    } else {
      item.removeAttribute("target");
      item.removeAttribute("rel");
    }

    if (!item.querySelector("svg")) {
      item.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${config.icon}"/></svg>`);
    }

    let label = item.querySelector("span");
    if (!label) {
      label = document.createElement("span");
      item.appendChild(label);
    }
    label.textContent = config.label;

    let small = item.querySelector("small");
    if (config.small) {
      if (!small) {
        small = document.createElement("small");
        item.appendChild(small);
      }
      small.textContent = config.small;
    } else if (small) {
      small.remove();
    }

    const path = window.location.pathname;
    item.classList.toggle("is-active", Boolean(config.active?.(path)));
    return item;
  }

  function normalizeNavigation() {
    if (!nav) return;
    const primary = PRIMARY_NAV.map(ensurePrimaryNavItem).filter(Boolean);
    findNavItem("Media")?.remove();

    const firstLabel = nav.querySelector(".nav-label");
    primary.forEach((item) => nav.insertBefore(item, firstLabel || null));
  }

  function normalizeDocumentsBrandCopy() {
    if (!window.location.pathname.startsWith("/admin/documents")) return;
    ["draftBrandLabel", "issuerBrandLabel"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.placeholder = "SD.Live · Creative Audio";
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
    loadScript(`/admin/editor/site-presentation-editor.js?v=${EDITOR_EXTENSION_VERSION}`, "sdlive-site-presentation-editor");
    loadScript(`/admin/editor/rental-stabilization-editor.js?v=${EDITOR_EXTENSION_VERSION}`, "sdlive-rental-stabilization-editor");
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

  loadStyle(`/admin/navigation.css?v=${NAVIGATION_VERSION}`, "sdlive-admin-navigation");
  normalizeNavigation();
  normalizeDocumentsBrandCopy();
  normalizeContextActions();
  createMobileNavigation();
  createEditorMobileGate();
  loadEditorExtensions();
  loadPathExtensions();
})();