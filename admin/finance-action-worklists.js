(() => {
  const API_URL = "/api/admin/finance/dashboard";
  const CARD_TARGETS = Object.freeze([
    { countId: "financeToInvoiceCount", queue: "toInvoice" },
    { countId: "financeReceivableCount", queue: "collectible" },
    { countId: "financeBlockedCount", queue: "blocked" }
  ]);
  const AGING_BUCKETS = Object.freeze([
    { key: "0-30", en: "0–30 days", es: "0–30 días" },
    { key: "31-60", en: "31–60 days", es: "31–60 días" },
    { key: "61+", en: "61+ days", es: "61+ días" }
  ]);

  const TEXT = Object.freeze({
    en: {
      toInvoice: "To invoice",
      collectible: "Collectible now",
      blocked: "Workflow blocked",
      aging: "Aging",
      close: "Close",
      loading: "Loading work list…",
      error: "Could not load the work list.",
      empty: "Nothing is pending in this queue.",
      workDate: "Work date",
      sentDate: "Invoice sent",
      daysUnpaid: "Days unpaid",
      gross: "Gross",
      net: "Net",
      action: "What to do",
      workflow: "Workflow",
      collectibleStatus: "Collectible now",
      blockedStatus: "Workflow blocked",
      openToInvoice: "Open To invoice work list",
      openCollectible: "Open Collectible now work list",
      openBlocked: "Open Workflow blocked work list",
      openAging: "Open aging bucket",
      send_invoice: "Send the invoice / account for payment",
      collect: "Follow up and collect payment",
      invalid_work_date: "Correct the work date before invoicing",
      work_date_today: "Wait until tomorrow; today’s work is not invoice-ready yet",
      work_date_future: "Wait until after the work date before invoicing",
      missing_evaluation: "Send evaluation",
      missing_signature: "Sign invoice",
      invoice_not_ready: "Complete the invoicing prerequisites",
      workflow_incomplete: "Complete the pending workflow"
    },
    es: {
      toInvoice: "Por facturar",
      collectible: "Cobrable ahora",
      blocked: "Flujo bloqueado",
      aging: "Antigüedad",
      close: "Cerrar",
      loading: "Cargando lista de trabajo…",
      error: "No se pudo cargar la lista de trabajo.",
      empty: "No hay nada pendiente en esta lista.",
      workDate: "Fecha de trabajo",
      sentDate: "Cuenta enviada",
      daysUnpaid: "Días sin pagar",
      gross: "Bruto",
      net: "Neto",
      action: "Qué debes hacer",
      workflow: "Flujo",
      collectibleStatus: "Cobrable ahora",
      blockedStatus: "Flujo bloqueado",
      openToInvoice: "Abrir lista de Por facturar",
      openCollectible: "Abrir lista de Cobrable ahora",
      openBlocked: "Abrir lista de Flujo bloqueado",
      openAging: "Abrir rango de antigüedad",
      send_invoice: "Enviar la cuenta de cobro / factura",
      collect: "Hacer seguimiento y cobrar",
      invalid_work_date: "Corregir la fecha de trabajo antes de facturar",
      work_date_today: "Esperar hasta mañana; el trabajo de hoy aún no está listo para facturar",
      work_date_future: "Esperar hasta después de la fecha de trabajo para facturar",
      missing_evaluation: "Enviar evaluación",
      missing_signature: "Firmar factura",
      invoice_not_ready: "Completar los requisitos antes de facturar",
      workflow_incomplete: "Completar el flujo pendiente"
    }
  });

  let activeTrigger = null;
  let dialog = null;
  let titleNode = null;
  let subtitleNode = null;
  let listNode = null;
  let closeButton = null;

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function copy() {
    return TEXT[language()];
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

  function safeText(value, fallback = "—") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function agingKeyFromDays(value) {
    const days = Number(value);
    if (!Number.isFinite(days) || days < 0) return null;
    if (days <= 30) return "0-30";
    if (days <= 60) return "31-60";
    return "61+";
  }

  function agingBucketLabel(key) {
    const bucket = AGING_BUCKETS.find((entry) => entry.key === key);
    return bucket?.[language()] || key;
  }

  function actionLabels(queue, item) {
    const t = copy();
    if (queue === "toInvoice") return [t.send_invoice];
    if (queue === "collectible") return [t.collect];
    if (queue === "aging" && item?.workflowType === "collectible") return [t.collect];
    const codes = Array.isArray(item?.reasonCodes) && item.reasonCodes.length
      ? item.reasonCodes
      : ["workflow_incomplete"];
    return codes.map((code) => t[code] || t.workflow_incomplete);
  }

  function itemAmount(queue, item) {
    if (queue === "toInvoice") return formatMoney(item?.grossAmount, item?.currency);
    return formatMoney(item?.netAmount, item?.currency);
  }

  function itemAmountLabel(queue) {
    return queue === "toInvoice" ? copy().gross : copy().net;
  }

  function workflowMarkup(queue, item) {
    if (queue !== "aging") return "";
    const t = copy();
    const blocked = item?.workflowType === "blocked";
    const label = blocked ? t.blockedStatus : t.collectibleStatus;
    return `<span class="finance-action-item__workflow ${blocked ? "is-blocked" : "is-collectible"}"><b>${escapeHtml(t.workflow)}</b>${escapeHtml(label)}</span>`;
  }

  function rowMarkup(queue, item) {
    const t = copy();
    const actions = actionLabels(queue, item)
      .map((label) => `<li>${escapeHtml(label)}</li>`)
      .join("");
    const sent = queue === "collectible" || queue === "aging" || (queue === "blocked" && item?.invoiceSentDate)
      ? `<span><b>${escapeHtml(t.sentDate)}</b>${escapeHtml(safeText(item?.invoiceSentDate))}</span>`
      : "";
    const hasDays = item?.daysUnpaid !== null && item?.daysUnpaid !== undefined && item?.daysUnpaid !== "" && Number.isFinite(Number(item.daysUnpaid));
    const days = hasDays
      ? `<span><b>${escapeHtml(t.daysUnpaid)}</b>${escapeHtml(String(item.daysUnpaid))}</span>`
      : "";

    return `
      <article class="finance-action-item">
        <div class="finance-action-item__heading">
          <div>
            <strong>${escapeHtml(safeText(item?.client, language() === "es" ? "Cliente sin nombre" : "Unnamed client"))}</strong>
            <span>${escapeHtml(safeText(item?.project, language() === "es" ? "Sin proyecto" : "No project"))}</span>
          </div>
          <em>${escapeHtml(itemAmount(queue, item))}</em>
        </div>
        <div class="finance-action-item__meta">
          <span><b>${escapeHtml(t.workDate)}</b>${escapeHtml(safeText(item?.workDate))}</span>
          <span><b>${escapeHtml(itemAmountLabel(queue))}</b>${escapeHtml(itemAmount(queue, item))}</span>
          ${sent}
          ${days}
          ${workflowMarkup(queue, item)}
        </div>
        <div class="finance-action-item__todo">
          <b>${escapeHtml(t.action)}</b>
          <ul>${actions}</ul>
        </div>
      </article>
    `;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("div");
    dialog.className = "finance-action-dialog";
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="finance-action-dialog__backdrop" data-finance-action-close></div>
      <section class="finance-action-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="financeActionTitle" tabindex="-1">
        <header class="finance-action-dialog__header">
          <div>
            <h2 id="financeActionTitle"></h2>
            <p id="financeActionSubtitle"></p>
          </div>
          <button class="finance-action-dialog__close" type="button" data-finance-action-close aria-label="Close">×</button>
        </header>
        <div class="finance-action-dialog__list" id="financeActionList" aria-live="polite"></div>
      </section>
    `;
    document.body.appendChild(dialog);
    titleNode = dialog.querySelector("#financeActionTitle");
    subtitleNode = dialog.querySelector("#financeActionSubtitle");
    listNode = dialog.querySelector("#financeActionList");
    closeButton = dialog.querySelector(".finance-action-dialog__close");
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-finance-action-close]")) closeDialog();
    });
    return dialog;
  }

  function queueTitle(queue) {
    return copy()[queue] || queue;
  }

  function updateCardLabels() {
    const t = copy();
    CARD_TARGETS.forEach(({ countId, queue }) => {
      const card = document.getElementById(countId)?.closest(".finance-card");
      if (!card) return;
      const key = queue === "toInvoice"
        ? "openToInvoice"
        : queue === "collectible"
          ? "openCollectible"
          : "openBlocked";
      card.setAttribute("aria-label", t[key]);
    });
    if (closeButton) closeButton.setAttribute("aria-label", t.close);
  }

  async function loadDashboard() {
    const response = await fetch(API_URL, {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.error || "Finance source unavailable");
    return data;
  }

  async function loadQueue(queue) {
    const data = await loadDashboard();
    return Array.isArray(data?.summary?.workQueues?.[queue])
      ? data.summary.workQueues[queue]
      : [];
  }

  function agingRows(data, currency, bucketKey) {
    const queues = data?.summary?.workQueues || {};
    const collectible = Array.isArray(queues.collectible) ? queues.collectible : [];
    const blocked = Array.isArray(queues.blocked) ? queues.blocked : [];
    return [
      ...collectible.map((item) => ({ ...item, workflowType: "collectible" })),
      ...blocked.map((item) => ({ ...item, workflowType: "blocked" }))
    ]
      .filter((item) => item.currency === currency && agingKeyFromDays(item.daysUnpaid) === bucketKey)
      .sort((a, b) => {
        const daysA = Number(a.daysUnpaid || 0);
        const daysB = Number(b.daysUnpaid || 0);
        if (daysB !== daysA) return daysB - daysA;
        return String(a.client || "").localeCompare(String(b.client || ""));
      });
  }

  function setLoadingDialog(title, trigger) {
    activeTrigger = trigger;
    ensureDialog();
    const t = copy();
    titleNode.textContent = title;
    subtitleNode.textContent = t.loading;
    listNode.innerHTML = `<p class="finance-action-dialog__state">${escapeHtml(t.loading)}</p>`;
    closeButton.setAttribute("aria-label", t.close);
    dialog.hidden = false;
    document.documentElement.classList.add("finance-action-dialog-open");
    dialog.querySelector(".finance-action-dialog__panel")?.focus();
  }

  function renderDialogRows(queue, rows, currency = null) {
    const current = copy();
    const total = currency
      ? rows.reduce((sum, item) => sum + (Number(item?.netAmount) || 0), 0)
      : null;
    const countText = `${rows.length} ${language() === "es" ? (rows.length === 1 ? "pendiente" : "pendientes") : (rows.length === 1 ? "item" : "items")}`;
    subtitleNode.textContent = currency ? `${countText} · ${formatMoney(total, currency)}` : countText;
    listNode.innerHTML = rows.length
      ? rows.map((item) => rowMarkup(queue, item)).join("")
      : `<p class="finance-action-dialog__state">${escapeHtml(current.empty)}</p>`;
  }

  async function openDialog(queue, trigger) {
    setLoadingDialog(queueTitle(queue), trigger);
    try {
      const rows = await loadQueue(queue);
      renderDialogRows(queue, rows);
    } catch {
      subtitleNode.textContent = "";
      listNode.innerHTML = `<p class="finance-action-dialog__state is-error">${escapeHtml(copy().error)}</p>`;
    }
  }

  async function openAgingDialog(currency, bucketKey, trigger) {
    const title = `${copy().aging} · ${currency} · ${agingBucketLabel(bucketKey)}`;
    setLoadingDialog(title, trigger);
    try {
      const data = await loadDashboard();
      const rows = agingRows(data, currency, bucketKey);
      renderDialogRows("aging", rows, currency);
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

  function makeInteractive(card, queue) {
    if (card.dataset.financeActionQueue) return;
    card.dataset.financeActionQueue = queue;
    card.classList.add("finance-card--interactive");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-haspopup", "dialog");
    const marker = document.createElement("span");
    marker.className = "finance-card__drilldown";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "↗";
    card.appendChild(marker);

    const activate = () => openDialog(queue, card);
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  }

  function attachCards() {
    let attached = 0;
    CARD_TARGETS.forEach(({ countId, queue }) => {
      const card = document.getElementById(countId)?.closest(".finance-card");
      if (!card) return;
      makeInteractive(card, queue);
      attached += 1;
    });
    if (attached) updateCardLabels();
    return attached === CARD_TARGETS.length;
  }

  function agingTarget(bar) {
    const root = bar?.closest(".finance-aging-chart");
    if (!root) return null;
    const currency = root.id === "financeAgingUsd" ? "USD" : root.id === "financeAgingCop" ? "COP" : null;
    if (!currency) return null;
    const bars = [...root.querySelectorAll(".finance-aging-bar")];
    const index = bars.indexOf(bar);
    const bucket = AGING_BUCKETS[index];
    return bucket ? { currency, bucketKey: bucket.key } : null;
  }

  function decorateAgingBars() {
    const bars = [...document.querySelectorAll("#financeAgingCop .finance-aging-bar, #financeAgingUsd .finance-aging-bar")];
    bars.forEach((bar) => {
      const target = agingTarget(bar);
      if (!target) return;
      bar.classList.add("finance-aging-bar--interactive");
      bar.setAttribute("role", "button");
      bar.setAttribute("tabindex", "0");
      bar.setAttribute("aria-haspopup", "dialog");
      bar.setAttribute("aria-label", `${copy().openAging}: ${target.currency} ${agingBucketLabel(target.bucketKey)}`);
    });
    return bars.length >= 6;
  }

  function activateAgingBar(bar) {
    const target = agingTarget(bar);
    if (!target) return false;
    openAgingDialog(target.currency, target.bucketKey, bar);
    return true;
  }

  function start() {
    ensureDialog();
    let attempts = 0;
    const attach = () => {
      attempts += 1;
      const cardsReady = attachCards();
      const agingReady = decorateAgingBars();
      if ((cardsReady && agingReady) || attempts >= 60) return;
      window.setTimeout(attach, 100);
    };
    attach();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const bar = event.target.closest?.(".finance-aging-bar");
      if (!bar) return;
      event.preventDefault();
      activateAgingBar(bar);
    });

    document.addEventListener("click", (event) => {
      const agingBar = event.target.closest(".finance-aging-bar");
      if (agingBar) {
        activateAgingBar(agingBar);
        return;
      }
      if (event.target.closest(".finance-language-control button[data-lang]")) {
        window.setTimeout(() => {
          updateCardLabels();
          decorateAgingBars();
        }, 0);
      }
    });

    document.addEventListener("submit", (event) => {
      if (event.target?.id !== "financeTaxForm") return;
      let refreshAttempts = 0;
      const refreshAging = () => {
        refreshAttempts += 1;
        if (decorateAgingBars() || refreshAttempts >= 20) return;
        window.setTimeout(refreshAging, 150);
      };
      window.setTimeout(refreshAging, 250);
    });
  }

  start();
})();