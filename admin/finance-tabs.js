(() => {
  if (window.SDLiveFinanceTabs) return;

  const COPY = Object.freeze({
    en: { overview: "Overview", thirdParty: "Third parties" },
    es: { overview: "Resumen", thirdParty: "Terceros" }
  });
  const THIRD_PARTY_SECTION_IDS = new Set([
    "financeThirdPartyReconciliation",
    "financeThirdPartyHistory"
  ]);

  const state = {
    active: "overview",
    root: null,
    observer: null
  };

  function language() {
    const active = window.SDLiveFinanceI18n?.language;
    if (active === "es" || active === "en") return active;
    return String(navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function text(key) {
    return COPY[language()][key] || COPY.en[key] || key;
  }

  function ensureStyles() {
    if (document.getElementById("financeTabsStyles")) return;
    const style = document.createElement("style");
    style.id = "financeTabsStyles";
    style.textContent = `
      .finance-tabs {
        display: inline-flex;
        gap: 4px;
        margin: 4px 0 24px;
        padding: 4px;
        border: 1px solid var(--line, rgba(255,255,255,.1));
        border-radius: 12px;
        background: rgba(255,255,255,.025);
      }
      .finance-tab {
        appearance: none;
        border: 0;
        border-radius: 9px;
        padding: 8px 13px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
        opacity: .64;
      }
      .finance-tab:hover { opacity: .9; background: rgba(255,255,255,.04); }
      .finance-tab[aria-selected="true"] {
        opacity: 1;
        background: rgba(255,255,255,.09);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
      }
      .finance-tab:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      @media (max-width: 680px) {
        .finance-tabs { width: 100%; }
        .finance-tab { flex: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function tabNameFor(element) {
    return THIRD_PARTY_SECTION_IDS.has(element.id) ? "thirdParty" : "overview";
  }

  function classifyDirectChild(element) {
    const root = state.root;
    if (!root || !(element instanceof Element) || element.parentElement !== root) return;
    if (element.classList.contains("finance-heading") || element.id === "financeTabs") return;
    element.dataset.financeTabContent = tabNameFor(element);
  }

  function classifyExistingChildren() {
    if (!state.root) return;
    [...state.root.children].forEach(classifyDirectChild);
  }

  function updateLabels() {
    const nav = document.getElementById("financeTabs");
    if (!nav) return;
    const overview = nav.querySelector('[data-finance-tab="overview"]');
    const thirdParty = nav.querySelector('[data-finance-tab="thirdParty"]');
    if (overview) overview.textContent = text("overview");
    if (thirdParty) thirdParty.textContent = text("thirdParty");
  }

  function applyVisibility() {
    const root = state.root;
    if (!root) return;

    root.querySelectorAll(":scope > [data-finance-tab-content]").forEach((element) => {
      element.hidden = element.dataset.financeTabContent !== state.active;
    });

    const nav = document.getElementById("financeTabs");
    nav?.querySelectorAll("[data-finance-tab]").forEach((button) => {
      const active = button.dataset.financeTab === state.active;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function select(tab) {
    if (tab !== "overview" && tab !== "thirdParty") return;
    state.active = tab;
    classifyExistingChildren();
    applyVisibility();
    document.dispatchEvent(new CustomEvent("sdlive:finance-tab-change", { detail: { tab } }));
  }

  function createTabNav(root) {
    let nav = document.getElementById("financeTabs");
    if (nav) return nav;

    nav = document.createElement("div");
    nav.id = "financeTabs";
    nav.className = "finance-tabs";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Finance views");

    ["overview", "thirdParty"].forEach((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "finance-tab";
      button.dataset.financeTab = tab;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", "false");
      button.addEventListener("click", () => select(tab));
      nav.appendChild(button);
    });

    const heading = root.querySelector(":scope > .finance-heading");
    if (heading) heading.insertAdjacentElement("afterend", nav);
    else root.prepend(nav);
    return nav;
  }

  function install() {
    if (state.root?.isConnected) return true;
    const root = document.getElementById("financeOverview");
    if (!root) return false;

    state.root = root;
    ensureStyles();
    classifyExistingChildren();
    createTabNav(root);
    updateLabels();
    applyVisibility();

    state.observer?.disconnect();
    state.observer = new MutationObserver((mutations) => {
      let changed = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          classifyDirectChild(node);
          changed = true;
        });
      });
      if (changed) applyVisibility();
    });
    state.observer.observe(root, { childList: true });
    return true;
  }

  document.addEventListener("click", (event) => {
    if (!event.target?.closest?.(".finance-language-control button[data-lang]")) return;
    setTimeout(updateLabels, 0);
  });

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 25);
  setTimeout(() => clearInterval(timer), 10000);

  window.SDLiveFinanceTabs = {
    get active() { return state.active; },
    select,
    install
  };
})();
