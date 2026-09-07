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
      empty: "No third-party balances in COP.",
      cardLabel: "Third-party obligations",
      cardWaiting: "Waiting for client payment",
      cardReady: "Ready to pay",
      cardNone: "No pending third-party obligations",
      cardOpen: "View obligations",
      dialogTitle: "Third-party obligations",
      dialogNote: "Only obligations already in collection or ready to pay are shown.",
      statusWaiting: "Waiting for client",
      statusReady: "Ready to pay",
      markPaid: "Mark paid",
      markingPaid: "Saving…",
      needsBreakdown: "Break down in AppSheet",
      close: "Close",
      confirmPaid: "Confirm this third-party balance was paid?",
      paymentFailed: "Could not mark this payment as paid",
      operationalUnavailable: "Third-party obligations unavailable"
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
      empty: "No hay saldos de terceros en COP.",
      cardLabel: "Obligaciones a terceros",
      cardWaiting: "Esperando pago del cliente",
      cardReady: "Listo para pagar",
      cardNone: "Sin obligaciones pendientes a terceros",
      cardOpen: "Ver obligaciones",
      dialogTitle: "Obligaciones a terceros",
      dialogNote: "Solo aparecen obligaciones que ya están en cobro o listas para pagar.",
      statusWaiting: "Esperando pago del cliente",
      statusReady: "Listo para pagar",
      markPaid: "Marcar pagado",
      markingPaid: "Guardando…",
      needsBreakdown: "Desglosar en AppSheet",
      close: "Cerrar",
      confirmPaid: "¿Confirmas que ya pagaste este saldo al tercero?",
      paymentFailed: "No se pudo marcar este pago como pagado",
      operationalUnavailable: "Obligaciones a terceros no disponibles"
    }
  };

  const state = {
    payload: null,
    operations: null,
    markingRef: null
  };
  let cardObserver = null;
  let cardInstalled = false;

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

  function formatCop(value) {
    return formatMoney("COP", value);
  }

  function moneyPair(totals = {}) {
    return `COP ${formatMoney("COP", totals.COP)} · USD ${formatMoney("USD", totals.USD)}`;
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

      #financeThirdPartyCard.finance-third-party-card--waiting {
        border-color: rgba(245, 158, 11, .52);
        background: linear-gradient(145deg, rgba(245, 158, 11, .12), rgba(255,255,255,.025));
      }
      #financeThirdPartyCard.finance-third-party-card--ready {
        border-color: rgba(74, 222, 128, .55);
        background: linear-gradient(145deg, rgba(74, 222, 128, .13), rgba(255,255,255,.025));
      }
      #financeThirdPartyCard [data-third-party-detail] { line-height: 1.45; }
      .finance-third-party-card-status--waiting { color: #fbbf24; }
      .finance-third-party-card-status--ready { color: #86efac; }

      .finance-third-party-dialog {
        width: min(820px, calc(100vw - 28px));
        max-height: min(78vh, 760px);
        overflow: auto;
        border: 1px solid var(--line, rgba(255,255,255,.16));
        border-radius: 18px;
        background: #10131a;
        color: inherit;
        padding: 0;
        box-shadow: 0 24px 80px rgba(0,0,0,.55);
      }
      .finance-third-party-dialog::backdrop { background: rgba(0,0,0,.64); backdrop-filter: blur(4px); }
      .finance-third-party-dialog__inner { padding: 22px; }
      .finance-third-party-dialog__head { display:flex; gap:16px; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
      .finance-third-party-dialog__head h3 { margin: 3px 0 0; }
      .finance-third-party-dialog__close { border:1px solid var(--line, rgba(255,255,255,.14)); border-radius:10px; padding:7px 10px; background:transparent; color:inherit; cursor:pointer; }
      .finance-third-party-obligation-list { display:grid; gap:10px; }
      .finance-third-party-obligation {
        display:grid;
        grid-template-columns:minmax(0, 1fr) auto auto;
        gap:14px;
        align-items:center;
        padding:13px 14px;
        border:1px solid var(--line, rgba(255,255,255,.09));
        border-radius:12px;
      }
      .finance-third-party-obligation strong { display:block; }
      .finance-third-party-obligation small { display:block; opacity:.68; margin-top:3px; }
      .finance-third-party-obligation__amount { font-weight:700; white-space:nowrap; }
      .finance-third-party-badge { display:inline-flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; font-weight:650; }
      .finance-third-party-badge--waiting { color:#fbbf24; }
      .finance-third-party-badge--ready { color:#86efac; }
      .finance-third-party-pay-button {
        border:1px solid rgba(74,222,128,.5);
        border-radius:10px;
        padding:8px 10px;
        background:rgba(74,222,128,.12);
        color:#bbf7d0;
        cursor:pointer;
        white-space:nowrap;
      }
      .finance-third-party-pay-button:disabled { opacity:.5; cursor:wait; }
      .finance-third-party-needs-breakdown { font-size:12px; opacity:.6; white-space:nowrap; }
      .finance-third-party-dialog__error { color:#fca5a5; margin:10px 0 0; min-height:1em; }
      @media (max-width: 680px) {
        .finance-third-party-obligation { grid-template-columns:1fr; }
        .finance-third-party-obligation__amount { justify-self:start; }
        .finance-third-party-pay-button { justify-self:start; }
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

  function renderReconciliation() {
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

  function ensureDialog() {
    let dialog = document.getElementById("financeThirdPartyObligationsDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "financeThirdPartyObligationsDialog";
    dialog.className = "finance-third-party-dialog";
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function renderDialog() {
    const dialog = ensureDialog();
    const operations = state.operations;
    const items = Array.isArray(operations?.items) ? operations.items : [];
    const rows = items.map((item) => {
      const waiting = item.status === "waiting_client";
      const statusClass = waiting ? "waiting" : "ready";
      const statusText = waiting ? text("statusWaiting") : text("statusReady");
      const action = item.canMarkPaid
        ? `<button type="button" class="finance-third-party-pay-button" data-third-party-pay="${item.ref}" ${state.markingRef === item.ref ? "disabled" : ""}>${state.markingRef === item.ref ? text("markingPaid") : text("markPaid")}</button>`
        : (!waiting ? `<span class="finance-third-party-needs-breakdown">${text("needsBreakdown")}</span>` : "");
      const context = [item.client, item.project].filter(Boolean).join(" · ");
      return `
        <div class="finance-third-party-obligation">
          <div>
            <strong>${displayThirdPartyName(item.name)}</strong>
            <small>${context}</small>
            <span class="finance-third-party-badge finance-third-party-badge--${statusClass}">${waiting ? "🟠" : "🟢"} ${statusText}</span>
          </div>
          <div class="finance-third-party-obligation__amount">${item.currency} ${formatMoney(item.currency, item.amount)}</div>
          <div>${action}</div>
        </div>
      `;
    }).join("");

    dialog.innerHTML = `
      <div class="finance-third-party-dialog__inner">
        <div class="finance-third-party-dialog__head">
          <div><span class="eyebrow">${text("cardLabel")}</span><h3>${text("dialogTitle")}</h3><p class="finance-section-note">${text("dialogNote")}</p></div>
          <button class="finance-third-party-dialog__close" type="button" data-third-party-close>${text("close")}</button>
        </div>
        <div class="finance-third-party-obligation-list">${rows || `<div class="finance-third-party-status">${text("cardNone")}</div>`}</div>
        <div class="finance-third-party-dialog__error" data-third-party-error></div>
      </div>
    `;
    dialog.querySelector("[data-third-party-close]")?.addEventListener("click", () => dialog.close());
  }

  function renderOperationalCard() {
    const card = document.getElementById("financeThirdPartyCard");
    if (!card) return;
    cardObserver?.disconnect();

    const count = card.querySelector("[data-third-party-count]");
    const money = card.querySelector("[data-third-party-money]");
    const detail = card.querySelector("[data-third-party-detail]");
    card.querySelector("[data-third-party-label]").textContent = text("cardLabel");
    card.setAttribute("aria-label", `${text("cardLabel")}. ${text("cardOpen")}`);
    card.classList.remove("finance-card--warning", "finance-third-party-card--waiting", "finance-third-party-card--ready");

    if (!state.operations) {
      if (count) count.textContent = "—";
      if (money) money.textContent = text("operationalUnavailable");
      if (detail) detail.textContent = `${text("cardOpen")} →`;
    } else {
      const waiting = state.operations.totals?.waitingClient || { count: 0, COP: 0, USD: 0 };
      const ready = state.operations.totals?.readyToPay || { count: 0, COP: 0, USD: 0 };
      const openTotals = {
        COP: Number(waiting.COP || 0) + Number(ready.COP || 0),
        USD: Number(waiting.USD || 0) + Number(ready.USD || 0)
      };
      if (count) count.textContent = String(state.operations.count || 0);
      if (money) money.textContent = state.operations.count ? moneyPair(openTotals) : text("cardNone");
      if (detail) {
        detail.innerHTML = `<span class="finance-third-party-card-status--waiting">🟠 ${text("cardWaiting")}: ${waiting.count || 0}</span> · <span class="finance-third-party-card-status--ready">🟢 ${text("cardReady")}: ${ready.count || 0}</span> · ${text("cardOpen")} →`;
      }
      if (Number(ready.count || 0) > 0) card.classList.add("finance-third-party-card--ready");
      else if (Number(waiting.count || 0) > 0) card.classList.add("finance-third-party-card--waiting");
    }

    queueMicrotask(() => {
      cardObserver?.observe(card, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
    });
  }

  function openOperations() {
    renderDialog();
    const dialog = ensureDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function installCardOverride() {
    const card = document.getElementById("financeThirdPartyCard");
    if (!card) return false;
    if (!cardInstalled) {
      cardInstalled = true;
      cardObserver = new MutationObserver(() => renderOperationalCard());
      card.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openOperations();
      }, true);
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openOperations();
      }, true);
    }
    renderOperationalCard();
    return true;
  }

  async function loadDashboard() {
    const response = await fetch("/api/admin/finance/dashboard", {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${response.status})`);
    state.payload = data;
  }

  async function loadOperations() {
    const response = await fetch("/api/admin/finance/third-party/obligations", {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    state.operations = data;
  }

  async function load() {
    ensureStyles();
    renderReconciliation();
    const results = await Promise.allSettled([loadDashboard(), loadOperations()]);
    const dashboardFailed = results[0].status === "rejected";
    const operationsFailed = results[1].status === "rejected";

    if (dashboardFailed) {
      const section = ensureSection();
      if (section) section.innerHTML = `<div class="finance-third-party-status">${text("unavailable")}: ${String(results[0].reason?.message || results[0].reason)}</div>`;
    } else {
      renderReconciliation();
    }

    if (operationsFailed) state.operations = null;
    installCardOverride();
    renderOperationalCard();
    const dialog = document.getElementById("financeThirdPartyObligationsDialog");
    if (dialog?.open) renderDialog();
  }

  async function markPaid(ref, button) {
    if (!ref || state.markingRef) return;
    if (!window.confirm(text("confirmPaid"))) return;
    state.markingRef = ref;
    renderDialog();
    renderOperationalCard();
    try {
      const response = await fetch("/api/admin/finance/third-party/mark-paid", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref })
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
      state.operations = data;
      state.markingRef = null;
      await loadDashboard();
      renderReconciliation();
      renderOperationalCard();
      renderDialog();
    } catch (error) {
      state.markingRef = null;
      renderDialog();
      const target = ensureDialog().querySelector("[data-third-party-error]");
      if (target) target.textContent = `${text("paymentFailed")}: ${String(error?.message || error)}`;
      if (button) button.disabled = false;
    }
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.(".finance-language-control button[data-lang]")) {
        setTimeout(() => {
          renderReconciliation();
          renderOperationalCard();
          if (document.getElementById("financeThirdPartyObligationsDialog")?.open) renderDialog();
        }, 0);
        return;
      }
      const payButton = event.target?.closest?.("[data-third-party-pay]");
      if (payButton) {
        event.preventDefault();
        markPaid(payButton.dataset.thirdPartyPay, payButton);
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

  const cardTimer = setInterval(() => {
    if (installCardOverride()) clearInterval(cardTimer);
  }, 100);
  setTimeout(() => clearInterval(cardTimer), 12000);
})();