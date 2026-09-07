(() => {
  const COPY = {
    en: {
      eyebrow: "Third-party reconciliation",
      title: "Third-party balances",
      note: "COP only · current balance, money collected for each third party, and actual payments made",
      thirdParty: "Third party",
      debt: "Amount owed",
      collected: "Collected for third party",
      paid: "Paid to third party",
      total: "Total",
      unassigned: "Unassigned",
      loading: "Loading third-party reconciliation…",
      unavailable: "Third-party reconciliation unavailable",
      empty: "No third-party balances in COP."
    },
    es: {
      eyebrow: "Conciliación de terceros",
      title: "Saldos con terceros",
      note: "Solo COP · saldo actual, dinero cobrado para cada tercero y pagos realmente realizados",
      thirdParty: "Tercero",
      debt: "Deuda a terceros",
      collected: "Cobrado de terceros",
      paid: "Pagado a terceros",
      total: "Total",
      unassigned: "Sin desglose",
      loading: "Cargando conciliación de terceros…",
      unavailable: "Conciliación de terceros no disponible",
      empty: "No hay saldos de terceros en COP."
    }
  };

  const state = { payload: null };

  function language() {
    const active = window.SDLiveFinanceI18n?.language;
    if (active === "es" || active === "en") return active;
    return String(navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function text(key) {
    return COPY[language()][key] || COPY.en[key] || key;
  }

  function formatCop(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  function displayThirdPartyName(value) {
    const name = String(value || "").trim();
    if (name === "Sin desglose") return text("unassigned");
    return name || text("unassigned");
  }

  function ensureStyles() {
    if (document.getElementById("financeThirdPartyReconciliationStyles")) return;
    const style = document.createElement("style");
    style.id = "financeThirdPartyReconciliationStyles";
    style.textContent = `
      .finance-third-party-reconciliation { margin-top: 26px; }
      .finance-third-party-table-wrap { overflow-x: auto; margin-top: 14px; }
      .finance-third-party-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .finance-third-party-table th,
      .finance-third-party-table td { padding: 11px 9px; border-top: 1px solid var(--line, rgba(255,255,255,.08)); text-align: right; white-space: nowrap; }
      .finance-third-party-table th:first-child,
      .finance-third-party-table td:first-child { text-align: left; }
      .finance-third-party-table tbody tr:first-child td { border-top-color: var(--line, rgba(255,255,255,.12)); }
      .finance-third-party-table tfoot td { font-weight: 700; border-top: 1px solid var(--line, rgba(255,255,255,.18)); }
      .finance-third-party-name { font-weight: 650; }
      .finance-third-party-status { padding: 14px; opacity: .72; }
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    let section = document.getElementById("financeThirdPartyReconciliation");
    if (section) return section;
    const overview = document.getElementById("financeOverview");
    if (!overview) return null;

    section = document.createElement("section");
    section.id = "financeThirdPartyReconciliation";
    section.className = "finance-third-party-reconciliation";

    const clientTitle = [...overview.querySelectorAll(".finance-section-title")]
      .find((node) => node.querySelector(".eyebrow")?.textContent?.trim() === "Clients" ||
        node.querySelector(".eyebrow")?.textContent?.trim() === "Clientes");
    if (clientTitle) overview.insertBefore(section, clientTitle);
    else overview.appendChild(section);
    return section;
  }

  function render() {
    const section = ensureSection();
    if (!section) return;
    if (!state.payload) {
      section.innerHTML = `<div class="finance-third-party-status">${text("loading")}</div>`;
      return;
    }

    const entries = Array.isArray(state.payload.thirdPartyLedger?.copByThirdParty)
      ? state.payload.thirdPartyLedger.copByThirdParty
      : [];

    const totals = entries.reduce((sum, entry) => ({
      debt: sum.debt + Number(entry?.debt || 0),
      collected: sum.collected + Number(entry?.collected || 0),
      paid: sum.paid + Number(entry?.paid || 0)
    }), { debt: 0, collected: 0, paid: 0 });

    const rows = entries.map((entry) => `
      <tr>
        <td class="finance-third-party-name">${displayThirdPartyName(entry?.name)}</td>
        <td>${formatCop(entry?.debt)}</td>
        <td>${formatCop(entry?.collected)}</td>
        <td>${formatCop(entry?.paid)}</td>
      </tr>
    `).join("");

    section.innerHTML = `
      <div class="finance-section-title">
        <div><span class="eyebrow">${text("eyebrow")}</span><h4>${text("title")}</h4></div>
        <span class="finance-currency-tag">COP</span>
      </div>
      <p class="finance-section-note">${text("note")}</p>
      ${entries.length ? `
        <div class="finance-third-party-table-wrap">
          <table class="finance-third-party-table">
            <thead><tr>
              <th>${text("thirdParty")}</th>
              <th>${text("debt")}</th>
              <th>${text("collected")}</th>
              <th>${text("paid")}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr>
              <td>${text("total")}</td>
              <td>${formatCop(totals.debt)}</td>
              <td>${formatCop(totals.collected)}</td>
              <td>${formatCop(totals.paid)}</td>
            </tr></tfoot>
          </table>
        </div>
      ` : `<div class="finance-third-party-status">${text("empty")}</div>`}
    `;
  }

  async function load() {
    ensureStyles();
    render();
    try {
      const response = await fetch("/api/admin/finance/dashboard", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${response.status})`);
      state.payload = data;
      render();
    } catch (error) {
      const section = ensureSection();
      if (section) section.innerHTML = `<div class="finance-third-party-status">${text("unavailable")}: ${String(error?.message || error)}</div>`;
    }
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.(".finance-language-control button[data-lang]")) {
        setTimeout(render, 0);
      }
    });
  }

  bind();
  const timer = setInterval(() => {
    if (!document.getElementById("financeOverview")) return;
    clearInterval(timer);
    load();
  }, 50);
  setTimeout(() => clearInterval(timer), 10000);
})();
