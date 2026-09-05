(() => {
  const ROOT_ID = "financePassThroughCalculator";
  const CARD_ID = "financeThirdPartyCard";
  const MAX_PARTIES = 8;
  let nextPartyId = 2;
  let thirdPartySummary = null;

  const copy = {
    en: {
      eyebrow: "Pass-through money",
      title: "Retention & third-party payout calculator",
      intro: "Use this when one client payment includes money you collected for someone else. The calculator separates your share from pass-through funds without writing anything back to SD.Live Track.",
      currency: "Currency",
      invoiced: "Total invoiced",
      received: "Total received",
      parties: "Third parties included in the invoice",
      partyName: "Name / reference",
      partyAmount: "Gross amount",
      addParty: "+ Add third party",
      clear: "Clear",
      remove: "Remove",
      totalRetention: "Total retentions",
      retentionRate: "Effective retention rate",
      myGross: "My gross amount",
      myRetention: "My allocated retentions",
      myNet: "My net received",
      thirdPartyGross: "Third-party gross",
      thirdPartyRetention: "Third-party allocated retentions",
      thirdPartyPayable: "Total payable to third parties",
      perParty: "Third-party payout detail",
      payable: "Payable",
      retention: "Retention",
      idle: "Enter the invoiced and received totals to calculate.",
      errorReceived: "Total received cannot be greater than total invoiced for this calculator.",
      errorParties: "Third-party gross cannot exceed the total invoiced.",
      assumption: "Management allocation only: retentions are prorated across your gross share and each third-party gross share. This does not change the legal/tax owner of a withholding certificate.",
      noPersist: "Calculator only · nothing is saved or sent to Google Sheets.",
      unnamed: "Third party",
      cardLabel: "Third-party payments",
      cardGross: "Gross collected",
      cardOpen: "Open calculator",
      cardLoading: "Loading third-party totals…",
      cardUnavailable: "Third-party totals unavailable"
    },
    es: {
      eyebrow: "Dinero de terceros",
      title: "Calculador de retenciones y pagos a terceros",
      intro: "Úsalo cuando un pago del cliente incluye dinero que cobraste por cuenta de otra persona. Separa tu parte del dinero de terceros sin escribir nada en SD.Live Track.",
      currency: "Moneda",
      invoiced: "Total facturado / cobrado",
      received: "Total recibido en banco",
      parties: "Terceros incluidos en el cobro",
      partyName: "Nombre / referencia",
      partyAmount: "Valor bruto",
      addParty: "+ Agregar tercero",
      clear: "Limpiar",
      remove: "Quitar",
      totalRetention: "Retenciones totales",
      retentionRate: "Tasa efectiva de retención",
      myGross: "Mi valor bruto",
      myRetention: "Mis retenciones asignadas",
      myNet: "Mi valor neto recibido",
      thirdPartyGross: "Bruto de terceros",
      thirdPartyRetention: "Retenciones asignadas a terceros",
      thirdPartyPayable: "Total a pagar a terceros",
      perParty: "Detalle por tercero",
      payable: "A pagar",
      retention: "Retención",
      idle: "Ingresa el total cobrado y el total recibido para calcular.",
      errorReceived: "El total recibido no puede ser mayor que el total cobrado en este calculador.",
      errorParties: "El bruto de terceros no puede superar el total cobrado.",
      assumption: "Asignación interna de gestión: las retenciones se prorratean entre tu parte bruta y la parte bruta de cada tercero. Esto no cambia el titular legal/tributario de un certificado de retención.",
      noPersist: "Solo calculador · no guarda ni envía datos a Google Sheets.",
      unnamed: "Tercero",
      cardLabel: "Pagos a terceros",
      cardGross: "Bruto cobrado",
      cardOpen: "Abrir calculadora",
      cardLoading: "Cargando totales de terceros…",
      cardUnavailable: "Totales de terceros no disponibles"
    }
  };

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function t(key) {
    return copy[language()][key] || copy.en[key] || key;
  }

  function numberFromInput(input) {
    const value = Number(String(input?.value || "").replace(/,/g, ""));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function formatMoney(currency, value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "COP" ? 0 : 2,
      minimumFractionDigits: currency === "COP" ? 0 : 2
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  function moneyPair(totals = {}) {
    return `COP ${formatMoney("COP", totals.COP)} · USD ${formatMoney("USD", totals.USD)}`;
  }

  function partyRows(root) {
    return [...root.querySelectorAll(".pass-through-party")];
  }

  function partyData(root) {
    return partyRows(root).map((row, index) => ({
      name: row.querySelector("[data-party-name]")?.value.trim() || `${t("unnamed")} ${index + 1}`,
      amount: numberFromInput(row.querySelector("[data-party-amount]"))
    }));
  }

  function setMetric(root, key, value) {
    const element = root.querySelector(`[data-result="${key}"]`);
    if (element) element.textContent = value;
  }

  function clearMetrics(root) {
    ["totalRetention", "retentionRate", "myGross", "myRetention", "myNet", "thirdPartyGross", "thirdPartyRetention", "thirdPartyPayable"].forEach((key) => setMetric(root, key, "—"));
    const breakdown = root.querySelector("[data-party-breakdown]");
    if (breakdown) breakdown.innerHTML = "";
  }

  function renderPartyBreakdown(root, result, currency) {
    const target = root.querySelector("[data-party-breakdown]");
    if (!target) return;
    target.innerHTML = "";
    result.thirdParties.filter((party) => party.gross > 0).forEach((party) => {
      const row = document.createElement("div");
      row.className = "pass-through-breakdown__row";
      row.innerHTML = `<div><strong></strong><small></small></div><span></span>`;
      row.querySelector("strong").textContent = party.name;
      row.querySelector("small").textContent = `${t("retention")}: ${formatMoney(currency, party.retention)}`;
      row.querySelector("span").textContent = `${t("payable")}: ${formatMoney(currency, party.payable)}`;
      target.appendChild(row);
    });
  }

  function calculate(root) {
    const currency = root.querySelector("[data-currency]")?.value || "COP";
    const status = root.querySelector("[data-status]");
    const calculator = window.SDLivePassThroughMath?.calculate;
    if (!calculator) {
      status.textContent = "Calculator unavailable";
      status.classList.add("is-error");
      return;
    }

    const result = calculator({
      invoiced: numberFromInput(root.querySelector("[data-invoiced]")),
      received: numberFromInput(root.querySelector("[data-received]")),
      thirdParties: partyData(root)
    });

    if (!result.ok) {
      clearMetrics(root);
      status.classList.toggle("is-error", result.code !== "missing_totals");
      status.textContent = result.code === "received_exceeds_invoiced"
        ? t("errorReceived")
        : result.code === "third_parties_exceed_invoiced"
          ? t("errorParties")
          : t("idle");
      return;
    }

    status.textContent = "";
    status.classList.remove("is-error");
    setMetric(root, "totalRetention", formatMoney(currency, result.totalRetention));
    setMetric(root, "retentionRate", `${(result.retentionRate * 100).toFixed(2)}%`);
    setMetric(root, "myGross", formatMoney(currency, result.myGross));
    setMetric(root, "myRetention", formatMoney(currency, result.myRetention));
    setMetric(root, "myNet", formatMoney(currency, result.myNet));
    setMetric(root, "thirdPartyGross", formatMoney(currency, result.thirdPartyGross));
    setMetric(root, "thirdPartyRetention", formatMoney(currency, result.thirdPartyRetention));
    setMetric(root, "thirdPartyPayable", formatMoney(currency, result.thirdPartyPayable));
    renderPartyBreakdown(root, result, currency);
  }

  function partyRow(id) {
    const row = document.createElement("div");
    row.className = "pass-through-party";
    row.dataset.partyId = String(id);
    row.innerHTML = `
      <label><span data-label="partyName"></span><input type="text" data-party-name autocomplete="off" /></label>
      <label><span data-label="partyAmount"></span><input type="number" min="0" step="0.01" inputmode="decimal" data-party-amount /></label>
      <button type="button" class="pass-through-remove" data-remove-party></button>
    `;
    return row;
  }

  function renderThirdPartyCard() {
    const card = document.getElementById(CARD_ID);
    if (!card) return;
    card.querySelector("[data-third-party-label]").textContent = t("cardLabel");
    card.setAttribute("aria-label", `${t("cardLabel")}. ${t("cardOpen")}`);

    const count = card.querySelector("[data-third-party-count]");
    const money = card.querySelector("[data-third-party-money]");
    const detail = card.querySelector("[data-third-party-detail]");
    if (!thirdPartySummary) {
      if (count) count.textContent = "—";
      if (money) money.textContent = t("cardLoading");
      if (detail) detail.textContent = `${t("cardOpen")} →`;
      return;
    }

    if (count) count.textContent = String(thirdPartySummary.paymentCount || 0);
    if (money) money.textContent = moneyPair(thirdPartySummary.payableByCurrency);
    if (detail) {
      detail.textContent = `${t("cardGross")}: ${moneyPair(thirdPartySummary.grossByCurrency)} · ${t("cardOpen")} →`;
    }
  }

  async function loadThirdPartyCard() {
    try {
      const response = await fetch("/api/admin/finance/summary", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false || !data?.summary?.thirdParty) throw new Error("third-party summary unavailable");
      thirdPartySummary = data.summary.thirdParty;
      renderThirdPartyCard();
    } catch (error) {
      const card = document.getElementById(CARD_ID);
      if (!card) return;
      const count = card.querySelector("[data-third-party-count]");
      const money = card.querySelector("[data-third-party-money]");
      const detail = card.querySelector("[data-third-party-detail]");
      if (count) count.textContent = "—";
      if (money) money.textContent = t("cardUnavailable");
      if (detail) detail.textContent = `${t("cardOpen")} →`;
    }
  }

  function focusCalculator(root) {
    root.scrollIntoView?.({ behavior: "smooth", block: "start" });
    root.querySelector("[data-invoiced]")?.focus?.({ preventScroll: true });
  }

  function ensureThirdPartyCard(root) {
    if (document.getElementById(CARD_ID)) return;
    const metrics = document.querySelector(".finance-metrics");
    if (!metrics) return;

    const card = document.createElement("article");
    card.className = "finance-card finance-card--warning";
    card.id = CARD_ID;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.style.cursor = "pointer";
    card.innerHTML = `
      <span class="finance-card__label" data-third-party-label></span>
      <strong data-third-party-count>—</strong>
      <div class="finance-money" data-third-party-money></div>
      <small data-third-party-detail></small>
    `;

    const activate = () => focusCalculator(root);
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
    metrics.appendChild(card);
    renderThirdPartyCard();
    loadThirdPartyCard();
  }

  function refreshCopy(root) {
    root.querySelectorAll("[data-copy]").forEach((element) => { element.textContent = t(element.dataset.copy); });
    root.querySelectorAll("[data-label]").forEach((element) => { element.textContent = t(element.dataset.label); });
    root.querySelectorAll("[data-remove-party]").forEach((button) => {
      button.textContent = t("remove");
      button.setAttribute("aria-label", t("remove"));
    });
    renderThirdPartyCard();
    calculate(root);
  }

  function resetCalculator(root) {
    const currency = root.querySelector("[data-currency]");
    const invoiced = root.querySelector("[data-invoiced]");
    const received = root.querySelector("[data-received]");
    const partiesRoot = root.querySelector("[data-parties]");
    if (currency) currency.value = "COP";
    if (invoiced) invoiced.value = "";
    if (received) received.value = "";
    if (partiesRoot) {
      partiesRoot.innerHTML = "";
      partiesRoot.appendChild(partyRow(1));
    }
    nextPartyId = 2;
    clearMetrics(root);
    refreshCopy(root);
    invoiced?.focus?.();
  }

  function build() {
    if (document.getElementById(ROOT_ID)) return;
    const finance = document.getElementById("financeOverview");
    if (!finance) {
      window.requestAnimationFrame(build);
      return;
    }

    const section = document.createElement("section");
    section.className = "finance-pass-through";
    section.id = ROOT_ID;
    section.innerHTML = `
      <div class="finance-section-title finance-pass-through__title"><div><span class="eyebrow" data-copy="eyebrow"></span><h4 data-copy="title"></h4></div></div>
      <article class="finance-panel finance-pass-through__panel">
        <p class="finance-pass-through__intro" data-copy="intro"></p>
        <div class="finance-pass-through__inputs">
          <label><span data-copy="currency"></span><select data-currency><option value="COP">COP</option><option value="USD">USD</option></select></label>
          <label><span data-copy="invoiced"></span><input type="number" min="0" step="0.01" inputmode="decimal" data-invoiced /></label>
          <label><span data-copy="received"></span><input type="number" min="0" step="0.01" inputmode="decimal" data-received /></label>
        </div>
        <div class="finance-pass-through__parties-head">
          <strong data-copy="parties"></strong>
          <div class="finance-pass-through__party-actions">
            <button type="button" data-add-party data-copy="addParty"></button>
            <button type="button" class="finance-pass-through__clear" data-clear-calculator data-copy="clear"></button>
          </div>
        </div>
        <div class="finance-pass-through__parties" data-parties></div>
        <div class="finance-pass-through__status" data-status></div>
        <div class="finance-pass-through__results">
          <div class="finance-pass-through__result"><span data-copy="totalRetention"></span><strong data-result="totalRetention">—</strong></div>
          <div class="finance-pass-through__result"><span data-copy="retentionRate"></span><strong data-result="retentionRate">—</strong></div>
          <div class="finance-pass-through__result"><span data-copy="myGross"></span><strong data-result="myGross">—</strong></div>
          <div class="finance-pass-through__result finance-pass-through__result--accent"><span data-copy="myRetention"></span><strong data-result="myRetention">—</strong></div>
          <div class="finance-pass-through__result finance-pass-through__result--accent"><span data-copy="myNet"></span><strong data-result="myNet">—</strong></div>
          <div class="finance-pass-through__result"><span data-copy="thirdPartyGross"></span><strong data-result="thirdPartyGross">—</strong></div>
          <div class="finance-pass-through__result"><span data-copy="thirdPartyRetention"></span><strong data-result="thirdPartyRetention">—</strong></div>
          <div class="finance-pass-through__result finance-pass-through__result--warning"><span data-copy="thirdPartyPayable"></span><strong data-result="thirdPartyPayable">—</strong></div>
        </div>
        <div class="finance-pass-through__breakdown"><strong data-copy="perParty"></strong><div data-party-breakdown></div></div>
        <p class="finance-pass-through__assumption" data-copy="assumption"></p>
        <small class="finance-pass-through__privacy" data-copy="noPersist"></small>
      </article>
    `;

    const taxTitle = [...finance.querySelectorAll(".finance-section-title")].find((node) => node.textContent.includes("Tax reserve") || node.textContent.includes("Reserva fiscal"));
    if (taxTitle) taxTitle.insertAdjacentElement("beforebegin", section);
    else finance.appendChild(section);

    const partiesRoot = section.querySelector("[data-parties]");
    partiesRoot.appendChild(partyRow(1));

    section.addEventListener("input", () => calculate(section));
    section.addEventListener("change", () => calculate(section));
    section.addEventListener("click", (event) => {
      if (event.target.closest("[data-clear-calculator]")) {
        resetCalculator(section);
        return;
      }
      if (event.target.closest("[data-add-party]")) {
        if (partyRows(section).length < MAX_PARTIES) {
          partiesRoot.appendChild(partyRow(nextPartyId++));
          refreshCopy(section);
        }
        return;
      }
      const remove = event.target.closest("[data-remove-party]");
      if (!remove) return;
      const rows = partyRows(section);
      if (rows.length === 1) {
        rows[0].querySelector("[data-party-name]").value = "";
        rows[0].querySelector("[data-party-amount]").value = "";
      } else {
        remove.closest(".pass-through-party")?.remove();
      }
      calculate(section);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".finance-language-control button[data-lang]")) window.setTimeout(() => refreshCopy(section), 0);
    });

    ensureThirdPartyCard(section);
    refreshCopy(section);
  }

  build();
})();