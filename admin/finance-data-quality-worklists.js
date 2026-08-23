(() => {
  const API_URL = "/api/admin/finance/dashboard";
  const QUALITY_TARGETS = Object.freeze([
    { key: "missingReceivedAmount", countPath: "paidMissingReceivedAmountCount" },
    { key: "unsupportedCurrency", countPath: "unsupportedCurrencyCount" },
    { key: "missingAging", countPath: "unpaidMissingAgingCount" },
    { key: "missingPaymentDate", countPath: "paidMissingPaymentDateCount" },
    { key: "invalidPaymentDuration", countPath: "invalidPaymentDurationCount" }
  ]);

  const TEXT = Object.freeze({
    en: {
      close: "Close",
      loading: "Loading records…",
      error: "Could not load the affected records.",
      empty: "No affected records were found.",
      pending: "affected record",
      pendings: "affected records",
      action: "What to correct",
      workDate: "Work date",
      state: "State",
      currency: "Currency",
      gross: "Gross",
      net: "Net",
      received: "Received",
      sentDate: "Invoice sent",
      paymentDate: "Payment date",
      daysUnpaid: "Days unpaid",
      duration: "Payment duration",
      missingReceivedAmount: "Paid rows missing received amount",
      unsupportedCurrency: "Unsupported currencies",
      missingAging: "Unpaid rows missing aging",
      missingPaymentDate: "Paid rows missing payment date",
      invalidPaymentDuration: "Invalid payment durations",
      openMissingReceivedAmount: "Open paid rows missing received amount",
      openUnsupportedCurrency: "Open unsupported currencies",
      openMissingAging: "Open unpaid rows missing aging",
      openMissingPaymentDate: "Open paid rows missing payment date",
      openInvalidPaymentDuration: "Open invalid payment durations",
      actionMissingReceivedAmount: "Enter the amount actually received",
      actionUnsupportedCurrency: "Correct Currency to COP or USD",
      actionMissingAging: "Review Days unpaid / Aging range in SD.Live Track",
      actionMissingPaymentDate: "Enter or correct the payment date",
      actionInvalidPaymentDuration: "Review invoice-sent and payment dates"
    },
    es: {
      close: "Cerrar",
      loading: "Cargando registros…",
      error: "No se pudieron cargar los registros afectados.",
      empty: "No se encontraron registros afectados.",
      pending: "registro afectado",
      pendings: "registros afectados",
      action: "Qué debes corregir",
      workDate: "Fecha de trabajo",
      state: "Estado",
      currency: "Moneda",
      gross: "Bruto",
      net: "Neto",
      received: "Recibido",
      sentDate: "Cuenta enviada",
      paymentDate: "Fecha de pago",
      daysUnpaid: "Días sin pagar",
      duration: "Duración del pago",
      missingReceivedAmount: "Filas pagadas sin valor recibido",
      unsupportedCurrency: "Monedas no admitidas",
      missingAging: "Filas no pagadas sin antigüedad",
      missingPaymentDate: "Filas pagadas sin fecha de pago",
      invalidPaymentDuration: "Duraciones de pago inválidas",
      openMissingReceivedAmount: "Abrir filas pagadas sin valor recibido",
      openUnsupportedCurrency: "Abrir monedas no admitidas",
      openMissingAging: "Abrir filas no pagadas sin antigüedad",
      openMissingPaymentDate: "Abrir filas pagadas sin fecha de pago",
      openInvalidPaymentDuration: "Abrir duraciones de pago inválidas",
      actionMissingReceivedAmount: "Registrar el valor realmente recibido",
      actionUnsupportedCurrency: "Corregir Moneda a COP o USD",
      actionMissingAging: "Revisar Días sin pagar / Rango Aging en SD.Live Track",
      actionMissingPaymentDate: "Registrar o corregir la fecha de pago",
      actionInvalidPaymentDuration: "Revisar las fechas de cuenta enviada y pago"
    }
  });

  let dialog = null;
  let titleNode = null;
  let subtitleNode = null;
  let listNode = null;
  let closeButton = null;
  let activeTrigger = null;

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function copy() {
    return TEXT[language()];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeText(value, fallback = "—") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function formatMoney(value, currency) {
    if (value === null || value === undefined || value === "") return "—";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    if (currency !== "COP" && currency !== "USD") {
      return `${currency || ""} ${amount.toLocaleString()}`.trim();
    }
    try {
      return new Intl.NumberFormat(language() === "es" ? "es-CO" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "USD" ? 2 : 0
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }

  function actionFor(key) {
    const t = copy();
    const map = {
      missingReceivedAmount: t.actionMissingReceivedAmount,
      unsupportedCurrency: t.actionUnsupportedCurrency,
      missingAging: t.actionMissingAging,
      missingPaymentDate: t.actionMissingPaymentDate,
      invalidPaymentDuration: t.actionInvalidPaymentDuration
    };
    return map[key] || "—";
  }

  function metaField(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<span><b>${escapeHtml(label)}</b>${escapeHtml(String(value))}</span>`;
  }

  function moneyField(label, value, currency) {
    if (value === null || value === undefined || value === "") return "";
    return metaField(label, formatMoney(value, currency));
  }

  function rowMarkup(key, item) {
    const t = copy();
    const clientFallback = language() === "es" ? "Cliente sin nombre" : "Unnamed client";
    const projectFallback = language() === "es" ? "Sin proyecto" : "No project";
    const duration = Number.isFinite(Number(item?.paymentDurationDays))
      ? `${item.paymentDurationDays} ${language() === "es" ? "días" : "days"}`
      : null;

    return `
      <article class="finance-action-item finance-quality-item">
        <div class="finance-action-item__heading">
          <div>
            <strong>${escapeHtml(safeText(item?.client, clientFallback))}</strong>
            <span>${escapeHtml(safeText(item?.project, projectFallback))}</span>
          </div>
          <em>${escapeHtml(safeText(item?.currency))}</em>
        </div>
        <div class="finance-action-item__meta">
          ${metaField(t.workDate, item?.workDate)}
          ${metaField(t.state, item?.state)}
          ${metaField(t.currency, item?.currency)}
          ${moneyField(t.gross, item?.grossAmount, item?.currency)}
          ${moneyField(t.net, item?.netAmount, item?.currency)}
          ${moneyField(t.received, item?.receivedAmount, item?.currency)}
          ${metaField(t.sentDate, item?.invoiceSentDate)}
          ${metaField(t.paymentDate, item?.paymentDate)}
          ${metaField(t.daysUnpaid, item?.daysUnpaid)}
          ${metaField(t.duration, duration)}
        </div>
        <div class="finance-action-item__todo">
          <b>${escapeHtml(t.action)}</b>
          <ul><li>${escapeHtml(actionFor(key))}</li></ul>
        </div>
      </article>
    `;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("div");
    dialog.className = "finance-action-dialog finance-quality-dialog";
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="finance-action-dialog__backdrop" data-finance-quality-close></div>
      <section class="finance-action-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="financeQualityDialogTitle" tabindex="-1">
        <header class="finance-action-dialog__header">
          <div>
            <h2 id="financeQualityDialogTitle"></h2>
            <p id="financeQualityDialogSubtitle"></p>
          </div>
          <button class="finance-action-dialog__close" type="button" data-finance-quality-close aria-label="Close">×</button>
        </header>
        <div class="finance-action-dialog__list" id="financeQualityDialogList" aria-live="polite"></div>
      </section>
    `;
    document.body.appendChild(dialog);
    titleNode = dialog.querySelector("#financeQualityDialogTitle");
    subtitleNode = dialog.querySelector("#financeQualityDialogSubtitle");
    listNode = dialog.querySelector("#financeQualityDialogList");
    closeButton = dialog.querySelector(".finance-action-dialog__close");
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-finance-quality-close]")) closeDialog();
    });
    return dialog;
  }

  async function loadQueue(key) {
    const response = await fetch(API_URL, {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.error || "Finance source unavailable");
    const rows = data?.summary?.dataQuality?.queues?.[key];
    return Array.isArray(rows) ? rows : [];
  }

  async function openDialog(key, trigger) {
    activeTrigger = trigger;
    ensureDialog();
    const t = copy();
    titleNode.textContent = t[key] || key;
    subtitleNode.textContent = t.loading;
    listNode.innerHTML = `<p class="finance-action-dialog__state">${escapeHtml(t.loading)}</p>`;
    closeButton.setAttribute("aria-label", t.close);
    dialog.hidden = false;
    document.documentElement.classList.add("finance-action-dialog-open");
    dialog.querySelector(".finance-action-dialog__panel")?.focus();

    try {
      const rows = await loadQueue(key);
      const current = copy();
      subtitleNode.textContent = `${rows.length} ${rows.length === 1 ? current.pending : current.pendings}`;
      listNode.innerHTML = rows.length
        ? rows.map((item) => rowMarkup(key, item)).join("")
        : `<p class="finance-action-dialog__state">${escapeHtml(current.empty)}</p>`;
    } catch {
      subtitleNode.textContent = "";
      listNode.innerHTML = `<p class="finance-action-dialog__state is-error">${escapeHtml(copy().error)}</p>`;
    }
  }

  function closeDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.documentElement.classList.remove("finance-action-dialog-open");
    activeTrigger?.focus?.();
    activeTrigger = null;
  }

  function openLabel(key) {
    const t = copy();
    const map = {
      missingReceivedAmount: t.openMissingReceivedAmount,
      unsupportedCurrency: t.openUnsupportedCurrency,
      missingAging: t.openMissingAging,
      missingPaymentDate: t.openMissingPaymentDate,
      invalidPaymentDuration: t.openInvalidPaymentDuration
    };
    return map[key] || key;
  }

  function makeInteractive(row, key) {
    if (!row || row.dataset.financeQualityKey || !row.classList.contains("is-warning")) return;
    const count = Number(row.querySelector("strong")?.textContent || 0);
    if (!Number.isFinite(count) || count <= 0) return;

    row.dataset.financeQualityKey = key;
    row.classList.add("finance-quality-row--interactive");
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-haspopup", "dialog");
    row.setAttribute("aria-label", openLabel(key));

    const marker = document.createElement("span");
    marker.className = "finance-quality-row__drilldown";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "↗";
    row.appendChild(marker);

    const activate = () => openDialog(key, row);
    row.addEventListener("click", activate);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  }

  function attachRows() {
    const rows = [...document.querySelectorAll("#financeQuality .finance-quality-row")];
    if (rows.length < QUALITY_TARGETS.length) return false;
    QUALITY_TARGETS.forEach((target, index) => makeInteractive(rows[index], target.key));
    return true;
  }

  function updateLabels() {
    document.querySelectorAll("#financeQuality .finance-quality-row[data-finance-quality-key]").forEach((row) => {
      row.setAttribute("aria-label", openLabel(row.dataset.financeQualityKey));
    });
    if (closeButton) closeButton.setAttribute("aria-label", copy().close);
  }

  function start() {
    ensureDialog();
    let attempts = 0;
    const attach = () => {
      attempts += 1;
      if (attachRows() || attempts >= 50) return;
      window.setTimeout(attach, 100);
    };
    attach();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDialog();
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".finance-language-control button[data-lang]")) {
        window.setTimeout(updateLabels, 0);
      }
    });
  }

  start();
})();