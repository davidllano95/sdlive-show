(() => {
  const COPY = {
    en: {
      eyebrow: "Third-party payment history",
      title: "Registered payments to third parties",
      note: "Read-only · current cumulative paid fact per obligation. This is not an event-level log of every partial payment.",
      allYears: "All years",
      allCurrencies: "All currencies",
      search: "Filter by third party",
      date: "Payment date",
      name: "Third party",
      client: "Client",
      project: "Project / Show",
      currency: "Currency",
      amount: "Registered paid",
      total: "Filtered total",
      empty: "No registered third-party payments match these filters.",
      unavailable: "Third-party payment history unavailable"
    },
    es: {
      eyebrow: "Historial de pagos a terceros",
      title: "Pagos registrados a terceros",
      note: "Solo lectura · monto pagado acumulado actual por obligación. No es un log de eventos de cada pago parcial.",
      allYears: "Todos los años",
      allCurrencies: "Todas las monedas",
      search: "Filtrar por tercero",
      date: "Fecha de pago",
      name: "Tercero",
      client: "Cliente",
      project: "Proyecto / Show",
      currency: "Moneda",
      amount: "Pagado registrado",
      total: "Total filtrado",
      empty: "No hay pagos registrados a terceros con estos filtros.",
      unavailable: "Historial de pagos a terceros no disponible"
    }
  };

  const state = {
    history: null,
    year: "",
    currency: "",
    query: ""
  };

  function language() {
    const active = window.SDLiveFinanceI18n?.language;
    if (active === "es" || active === "en") return active;
    return String(navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function text(key) {
    return COPY[language()][key] || COPY.en[key] || key;
  }

  function formatMoney(currency, value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "COP" ? 0 : 2,
      maximumFractionDigits: currency === "COP" ? 0 : 2
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  function ensureStyles() {
    if (document.getElementById("financeThirdPartyHistoryStyles")) return;
    const style = document.createElement("style");
    style.id = "financeThirdPartyHistoryStyles";
    style.textContent = `
      .finance-third-party-history { margin-top: 26px; }
      .finance-third-party-history__controls { display:flex; flex-wrap:wrap; gap:10px; align-items:end; margin:14px 0; }
      .finance-third-party-history__controls label { display:grid; gap:5px; min-width:145px; font-size:12px; opacity:.9; }
      .finance-third-party-history__controls input,
      .finance-third-party-history__controls select { border:1px solid var(--line, rgba(255,255,255,.12)); border-radius:9px; background:rgba(255,255,255,.035); color:inherit; padding:8px 9px; }
      .finance-third-party-history__controls input { min-width:min(260px, 80vw); }
      .finance-third-party-history__summary { display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; margin:10px 0; }
      .finance-third-party-history__summary strong { font-size:14px; }
      .finance-third-party-history__table-wrap { overflow-x:auto; margin-top:10px; }
      .finance-third-party-history__table { width:100%; border-collapse:collapse; font-size:13px; }
      .finance-third-party-history__table th,
      .finance-third-party-history__table td { padding:10px 9px; border-top:1px solid var(--line, rgba(255,255,255,.08)); text-align:left; white-space:nowrap; }
      .finance-third-party-history__table th:last-child,
      .finance-third-party-history__table td:last-child { text-align:right; }
      .finance-third-party-history__table td:nth-child(3),
      .finance-third-party-history__table td:nth-child(4) { white-space:normal; min-width:150px; }
      .finance-third-party-history__empty { padding:14px 0; opacity:.68; }
      @media (max-width:680px) {
        .finance-third-party-history__controls label,
        .finance-third-party-history__controls input { width:100%; min-width:0; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    let section = document.getElementById("financeThirdPartyHistory");
    if (section) return section;
    const overview = document.getElementById("financeOverview");
    if (!overview) return null;
    section = document.createElement("section");
    section.id = "financeThirdPartyHistory";
    section.className = "finance-third-party-history";
    const reconciliation = document.getElementById("financeThirdPartyReconciliation");
    if (reconciliation?.parentElement === overview) reconciliation.insertAdjacentElement("afterend", section);
    else overview.appendChild(section);
    return section;
  }

  function filteredItems() {
    const items = Array.isArray(state.history?.items) ? state.history.items : [];
    const query = state.query.trim().toLocaleLowerCase(language() === "es" ? "es-CO" : "en-US");
    return items.filter((item) => {
      if (state.year && !String(item.date || "").startsWith(`${state.year}-`)) return false;
      if (state.currency && item.currency !== state.currency) return false;
      if (query && !String(item.name || "").toLocaleLowerCase(language() === "es" ? "es-CO" : "en-US").includes(query)) return false;
      return true;
    });
  }

  function buildControls(section, items) {
    const years = [...new Set(items.map((item) => String(item.date || "").slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))]
      .sort((a, b) => Number(b) - Number(a));

    const controls = document.createElement("div");
    controls.className = "finance-third-party-history__controls";

    const yearLabel = document.createElement("label");
    yearLabel.append(document.createTextNode("Year"));
    const yearSelect = document.createElement("select");
    yearSelect.innerHTML = `<option value="">${text("allYears")}</option>${years.map((year) => `<option value="${year}">${year}</option>`).join("")}`;
    yearSelect.value = state.year;
    yearSelect.addEventListener("change", () => {
      state.year = yearSelect.value;
      render();
    });
    yearLabel.appendChild(yearSelect);

    const currencyLabel = document.createElement("label");
    currencyLabel.append(document.createTextNode(text("currency")));
    const currencySelect = document.createElement("select");
    currencySelect.innerHTML = `<option value="">${text("allCurrencies")}</option><option value="COP">COP</option><option value="USD">USD</option>`;
    currencySelect.value = state.currency;
    currencySelect.addEventListener("change", () => {
      state.currency = currencySelect.value;
      render();
    });
    currencyLabel.appendChild(currencySelect);

    const queryLabel = document.createElement("label");
    queryLabel.append(document.createTextNode(text("search")));
    const queryInput = document.createElement("input");
    queryInput.type = "search";
    queryInput.value = state.query;
    queryInput.placeholder = text("search");
    queryInput.addEventListener("input", () => {
      state.query = queryInput.value;
      renderRows();
    });
    queryLabel.appendChild(queryInput);

    controls.append(yearLabel, currencyLabel, queryLabel);
    section.appendChild(controls);
  }

  function renderRows() {
    const body = document.querySelector("#financeThirdPartyHistory [data-third-party-history-body]");
    const summary = document.querySelector("#financeThirdPartyHistory [data-third-party-history-summary]");
    if (!body || !summary) return;

    const items = filteredItems();
    const totals = items.reduce((acc, item) => {
      if (item.currency === "COP" || item.currency === "USD") acc[item.currency] += Number(item.amount || 0);
      return acc;
    }, { COP: 0, USD: 0 });

    summary.textContent = `${text("total")}: ${formatMoney("COP", totals.COP)} · ${formatMoney("USD", totals.USD)} · ${items.length}`;
    body.innerHTML = "";

    if (!items.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "finance-third-party-history__empty";
      cell.textContent = text("empty");
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("tr");
      const values = [
        item.date || "—",
        item.name || "—",
        item.client || "—",
        item.project || "—",
        item.currency || "—",
        formatMoney(item.currency === "USD" ? "USD" : "COP", item.amount)
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function render() {
    const section = ensureSection();
    if (!section || !state.history) return;
    ensureStyles();
    const items = Array.isArray(state.history.items) ? state.history.items : [];
    section.innerHTML = `
      <div class="finance-section-title">
        <div><span class="eyebrow">${text("eyebrow")}</span><h4>${text("title")}</h4></div>
        <span class="finance-records">${state.history.count || 0}</span>
      </div>
      <p class="finance-section-note">${text("note")}</p>
      <div class="finance-third-party-history__summary" data-third-party-history-summary></div>
    `;
    buildControls(section, items);
    const wrap = document.createElement("div");
    wrap.className = "finance-third-party-history__table-wrap";
    wrap.innerHTML = `
      <table class="finance-third-party-history__table">
        <thead><tr>
          <th>${text("date")}</th>
          <th>${text("name")}</th>
          <th>${text("client")}</th>
          <th>${text("project")}</th>
          <th>${text("currency")}</th>
          <th>${text("amount")}</th>
        </tr></thead>
        <tbody data-third-party-history-body></tbody>
      </table>
    `;
    section.appendChild(wrap);
    renderRows();
  }

  async function load() {
    const section = ensureSection();
    if (!section) return;
    try {
      const response = await fetch("/api/admin/finance/dashboard", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${response.status})`);
      state.history = data.thirdPartyPaidHistory || { count: 0, items: [], totalsByCurrency: { COP: 0, USD: 0 } };
      render();
    } catch (error) {
      section.innerHTML = `<div class="finance-third-party-history__empty">${text("unavailable")}: ${error.message}</div>`;
    }
  }

  function init() {
    if (document.getElementById("financeOverview")) {
      load();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.getElementById("financeOverview")) return;
      observer.disconnect();
      load();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
