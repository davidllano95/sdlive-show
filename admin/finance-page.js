(() => {
  const shell = document.querySelector(".backoffice");
  const collapse = document.getElementById("collapseSidebar");
  const identity = document.getElementById("identity");
  const status = document.getElementById("financeWorkspaceStatus");
  const mount = document.getElementById("financeMount");

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
      // Sidebar preference is non-critical.
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

  function activateCalendarNav() {
    const calendarButton = [...document.querySelectorAll(".app-nav__item")].find(
      (item) => item.tagName === "BUTTON" && item.querySelector("span")?.textContent?.trim() === "Calendar"
    );
    if (!calendarButton) return;

    const calendarLink = document.createElement("a");
    calendarLink.className = "app-nav__item";
    calendarLink.href = "/admin/calendar/";
    calendarLink.innerHTML = calendarButton.innerHTML;
    const small = calendarLink.querySelector("small");
    if (small) small.textContent = "Operations";
    calendarButton.replaceWith(calendarLink);
  }

  activateCalendarNav();

  async function loadIdentity() {
    try {
      const response = await fetch("/api/admin/whoami", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error("Access check failed");
      if (identity) identity.textContent = data.email || "Authenticated";
    } catch {
      if (identity) identity.textContent = "Authenticated Admin";
    }
  }

  async function loadFinance() {
    if (!window.SDLiveFinanceDashboard?.load) {
      if (status) {
        status.classList.add("is-error");
        status.querySelector("span").textContent = "Finance module unavailable";
      }
      return;
    }

    try {
      const loading = window.SDLiveFinanceDashboard.load();
      const section = document.getElementById("financeOverview");
      if (mount && section && section.parentElement !== mount) mount.appendChild(section);
      await loading;
      window.SDLiveFinanceI18n?.refresh?.();
      if (status?.querySelector("span")) status.querySelector("span").textContent = "Finance online · read-only source";
    } catch (error) {
      status?.classList.add("is-error");
      if (status?.querySelector("span")) status.querySelector("span").textContent = error?.message || "Finance unavailable";
    }
  }

  function loadStabilization() {
    if (document.querySelector('script[data-finance-stabilization]')) return;

    const rules = document.createElement("script");
    rules.src = "/admin/finance-cycle-rules.js?v=20260826-1";
    rules.dataset.financeCycleRules = "true";
    rules.onload = () => {
      if (document.querySelector('script[data-finance-stabilization]')) return;
      const script = document.createElement("script");
      script.src = "/admin/finance-stabilization.js?v=20260826-1";
      script.dataset.financeStabilization = "true";
      document.body.appendChild(script);
    };
    document.body.appendChild(rules);
  }

  loadIdentity();
  loadFinance();
  loadStabilization();
})();