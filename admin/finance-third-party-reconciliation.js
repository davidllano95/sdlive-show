(() => {
  const MONTHS = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  };

  const COPY = {
    en: {
      eyebrow: "Third-party reconciliation",
      title: "Own money vs pass-through money",
      note: "Management reconciliation only · tax/legal treatment is not determined here",
      current: "Current third-party outstanding",
      billed: "Client billed",
      ownGross: "Own gross",
      thirdGross: "Third-party gross",
      bank: "Bank received",
      ownCash: "Own cash",
      payable: "Est. third-party payable",
      actualPaid: "Actually paid to third parties",
      fees: "Fees / retentions",
      monthly: "Monthly reconciliation",
      month: "Month",
      loading: "Loading third-party reconciliation…",
      unavailable: "Third-party reconciliation unavailable",
      empty: "No reconciliation data for this year."
    },
    es: {
      eyebrow: "Conciliación de terceros",
      title: "Dinero propio vs dinero de terceros",
      note: "Conciliación de gestión · aquí no se determina el tratamiento tributario/legal",
      current: "Obligación actual con terceros",
      billed: "Facturado al cliente",
      ownGross: "Bruto propio",
      thirdGross: "Bruto de terceros",
      bank: "Recibido en banco",
      ownCash: "Flujo propio",
      payable: "Neto estimado a terceros",
      actualPaid: "Pagado realmente a terceros",
      fees: "Fees / retenciones",
      monthly: "Conciliación mensual",
      month: "Mes",
      loading: "Cargando conciliación de terceros…",
      unavailable: "Conciliación de terceros no disponible",
      empty: "No hay datos de conciliación para este año."
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
    if (document.getElementById("financeThirdPartyReconciliationStyles")) return;
    const style = document.createElement("style");
    style.id = "financeThirdPartyReconciliationStyles";
    style.textContent = `
      .finance-third-party-reconciliation { margin-top: 26px; }
      .finance-third-party-current { margin-left: auto; text-align: right; }
      .finance-third-party-current strong { display: block; margin-top: 4px; }
      .finance-third-party-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .finance-third-party-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0 16px; }
      .finance-third-party-metrics div { padding: 10px 12px; border: 1px solid var(--line, rgba(255,255,255,.1)); border-radius: 10px; }
      .finance-third-party-metrics span { display: block; font-size: 12px; opacity: .68; }
      .finance-third-party-metrics strong { display: block; margin-top: 4px; font-size: 14px; }
      .finance-third-party-table-wrap { overflow-x: auto; }
      .finance-third-party-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .finance-third-party-table th, .finance-third-party-table td { padding: 8px 7px; border-top: 1px solid var(--line, rgba(255,255,255,.08)); text-align: right; white-space: nowrap; }
      .finance-third-party-table th:first-child, .finance-third-party-table td:first-child { text-align: left; }
      .finance-third-party-status { padding: 14px; opacity: .72; }
      @media (max-width: 900px) {
        .finance-third-party-grid { grid-template-columns: 1fr; }
        .finance-third-party-current { margin-left: 0; text-align: left; }
      }
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

  function metric(label, value) {
    return `<div><span>${label}</span><strong>${value}</strong></div>`;
  }

  function currencyPanel(currency, data) {
    const monthly = data?.monthly || [];
    const rows = monthly.map((row) => `
      <tr>
        <td>${MONTHS[language()][Number(row.month || 1) - 1] || row.month}</td>
        <td>${formatMoney(currency, row.ownGross)}</td>
        <td>${formatMoney(currency, row.thirdPartyGross)}</td>
        <td>${formatMoney(currency, row.ownCashReceived)}</td>
        <td>${formatMoney(currency, row.actualThirdPartyPaid)}</td>
      </tr>
    `).join("");

    return `
      <article class="finance-panel">
        <div class="finance-panel__head"><div><span class="finance-currency-tag">${currency}</span><h4>${text("title")}</h4></div></div>
        <div class="finance-third-party-metrics">
          ${metric(text("billed"), formatMoney(currency, data?.billedGross))}
          ${metric(text("ownGross"), formatMoney(currency, data?.ownGross))}
          ${metric(text("thirdGross"), formatMoney(currency, data?.thirdPartyGross))}
          ${metric(text("bank"), formatMoney(currency, data?.bankReceived))}
          ${metric(text("ownCash"), formatMoney(currency, data?.ownCashReceived))}
          ${metric(text("payable"), formatMoney(currency, data?.estimatedThirdPartyPayable))}
          ${metric(text("actualPaid"), formatMoney(currency, data?.actualThirdPartyPaid))}
          ${metric(text("fees"), formatMoney(currency, data?.fees))}
        </div>
        <div class="finance-subsection"><span>${text("monthly")}</span></div>
        <div class="finance-third-party-table-wrap">
          <table class="finance-third-party-table">
            <thead><tr>
              <th>${text("month")}</th>
              <th>${text("ownGross")}</th>
              <th>${text("thirdGross")}</th>
              <th>${text("ownCash")}</th>
              <th>${text("actualPaid")}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }

  function render() {
    const section = ensureSection();
    if (!section) return;
    if (!state.payload) {
      section.innerHTML = `<div class="finance-third-party-status">${text("loading")}</div>`;
      return;
    }

    const year = Number(document.getElementById("financeYear")?.value || state.payload.analytics?.defaultYear);
    const data = state.payload.analytics?.thirdPartyReconciliation?.[String(year)];
    const outstanding = state.payload.thirdPartyLedger?.allTime?.currentOutstandingByCurrency || {};

    section.innerHTML = `
      <div class="finance-section-title">
        <div><span class="eyebrow">${text("eyebrow")}</span><h4>${text("title")}</h4></div>
        <div class="finance-third-party-current">
          <span class="finance-section-note">${text("current")}</span>
          <strong>COP ${formatMoney("COP", outstanding.COP)} · USD ${formatMoney("USD", outstanding.USD)}</strong>
        </div>
      </div>
      <p class="finance-section-note">${text("note")}</p>
      ${data ? `<div class="finance-third-party-grid">${currencyPanel("COP", data.COP)}${currencyPanel("USD", data.USD)}</div>` : `<div class="finance-third-party-status">${text("empty")}</div>`}
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
    document.addEventListener("change", (event) => {
      if (event.target?.id === "financeYear") render();
    });
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
