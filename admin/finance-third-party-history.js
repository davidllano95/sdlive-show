(() => {
  const COPY = {
    en: {
      eyebrow: "Third-party payment history",
      title: "Registered payments to third parties",
      note: "Read-only · current cumulative paid fact per obligation. This is not an event-level log of every partial payment.",
      year: "Year",
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
      empty: "No registered third-party payments match these filters."
    },
    es: {
      eyebrow: "Historial de pagos a terceros",
      title: "Pagos registrados a terceros",
      note: "Solo lectura · monto pagado acumulado actual por obligación. No es un log de eventos de cada pago parcial.",
      year: "Año",
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
      empty: "No hay pagos registrados a terceros con estos filtros."
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
    else {
      const clientTitle = [...overview.querySelectorAll(".finance-section-title")]
        .find((node) => ["Clients", "Clientes"].includes(node.querySelector(".eyebrow")?.textContent?.trim()));
      if (clientTitle) overview.insertBefore(section, clientTitle);
      else overview.appendChild(section);
    }
    return section;
  }

  function filteredItems() {
    const items = Array.isArray(state.history?.items) ? state.history.items : [];
    const locale = language() === "es" ? "es-CO" : "en-US";
    const query = state.query.trim().toLocaleLowerCase(locale);
    return items.filter((item) => {
      if (state.year && !String(item.date || "").startsWith(`${state.year}-`)) return false;
      if (state.currency && item.currency !== state.currency) return false;
      if (query && !String(item.name || "").toLocaleLowerCase(locale).includes(query)) return false;
      return true;
    });
  }

  function buildControls(section, items) {
    const years = [...new Set(items.map((item) => String(item.date || "").slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))]
      .sort((a, b) => Number(b) - Number(a));

    const controls = document.createElement("div");
    controls.className = "finance-third-party-history__controls";

    const yearLabel = document.createElement("label");
    yearLabel.append(document.createTextNode(text("year")));
    const yearSelect = document.createElement("select");
    const allYearsOption = document.createElement("option");
    allYearsOption.value = "";
    allYearsOption.textContent = text("allYears");
    yearSelect.appendChild(allYearsOption);
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
    yearSelect.value = state.year;
    yearSelect.addEventListener("change", () => {
      state.year = yearSelect.value;
      render();
    });
    yearLabel.appendChild(yearSelect);

    const currencyLabel = document.createElement("label");
    currencyLabel.append(document.createTextNode(text("currency")));
    const currencySelect = document.createElement("select");
    [["", text("allCurrencies")], ["COP", "COP"], ["USD", "USD"]].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      currencySelect.appendChild(option);
    });
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
    section.innerHTML = "";

    const title = document.createElement("div");
    title.className = "finance-section-title";
    const titleText = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = text("eyebrow");
    const heading = document.createElement("h4");
    heading.textContent = text("title");
    titleText.append(eyebrow, heading);
    const count = document.createElement("span");
    count.className = "finance-records";
    count.textContent = String(state.history.count || 0);
    title.append(titleText, count);

    const note = document.createElement("p");
    note.className = "finance-section-note";
    note.textContent = text("note");
    const summary = document.createElement("div");
    summary.className = "finance-third-party-history__summary";
    summary.dataset.thirdPartyHistorySummary = "true";
    section.append(title, note, summary);

    buildControls(section, items);

    const wrap = document.createElement("div");
    wrap.className = "finance-third-party-history__table-wrap";
    const table = document.createElement("table");
    table.className = "finance-third-party-history__table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    [text("date"), text("name"), text("client"), text("project"), text("currency"), text("amount")].forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    const body = document.createElement("tbody");
    body.dataset.thirdPartyHistoryBody = "true";
    table.append(head, body);
    wrap.appendChild(table);
    section.appendChild(wrap);
    renderRows();
  }

  function renderPayload(data) {
    state.history = data?.thirdPartyPaidHistory || {
      count: 0,
      items: [],
      totalsByCurrency: { COP: 0, USD: 0 }
    };
    render();
  }

  document.addEventListener("click", (event) => {
    if (!event.target?.closest?.(".finance-language-control button[data-lang]")) return;
    setTimeout(render, 0);
  });

  window.SDLiveFinanceThirdPartyHistory = {
    renderPayload,
    refresh: render
  };
})();
