(() => {
  const API_URL = "/api/admin/finance/dashboard";
  const CARD_TARGETS = Object.freeze([
    { countId: "financeToInvoiceCount", queue: "toInvoice" },
    { countId: "financeReceivableCount", queue: "collectible" },
    { countId: "financeBlockedCount", queue: "blocked" }
  ]);

  const TEXT = Object.freeze({
    en: {
      toInvoice: "To invoice",
      collectible: "Collectible now",
      blocked: "Workflow blocked",
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
      openToInvoice: "Open To invoice work list",
      openCollectible: "Open Collectible now work list",
      openBlocked: "Open Workflow blocked work list",
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
      openToInvoice: "Abrir lista de Por facturar",
      openCollectible: "Abrir lista de Cobrable ahora",
      openBlocked: "Abrir lista de Flujo bloqueado",
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

  let activeCard = null;
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

  function actionLabels(queue, item) {
    const t = copy();
    if (queue === "toInvoice") return [t.send_invoice];
    if (queue === "collectible") return [t.collect];
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

  function rowMarkup(queue, item) {
    const t = copy();
    const actions = actionLabels(queue, item)
      .map((label) => `<li>${escapeHtml(label)}</li>`)
      .join("");
    const sent = queue === "collectible" || (queue === "blocked" && item?.invoiceSentDate)
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

  async function loadQueue(queue) {
    const response = await fetch(API_URL, {
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.error || "Finance source unavailable");
    return Array.isArray(data?.summary?.workQueues?.[queue])
      ? data.summary.workQueues[queue]
      : [];
  }

  async function openDialog(queue, trigger) {
    activeCard = trigger;
    ensureDialog();
    const t = copy();
    titleNode.textContent = queueTitle(queue);
    subtitleNode.textContent = t.loading;
    listNode.innerHTML = `<p class="finance-action-dialog__state">${escapeHtml(t.loading)}</p>`;
    closeButton.setAttribute("aria-label", t.close);
    dialog.hidden = false;
    document.documentElement.classList.add("finance-action-dialog-open");
    dialog.querySelector(".finance-action-dialog__panel")?.focus();

    try {
      const rows = await loadQueue(queue);
      const current = copy();
      subtitleNode.textContent = `${rows.length} ${language() === "es" ? (rows.length === 1 ? "pendiente" : "pendientes") : (rows.length === 1 ? "item" : "items")}`;
      listNode.innerHTML = rows.length
        ? rows.map((item) => rowMarkup(queue, item)).join("")
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
    activeCard?.focus?.();
    activeCard = null;
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

  function start() {
    ensureDialog();
    let attempts = 0;
    const attach = () => {
      attempts += 1;
      if (attachCards() || attempts >= 40) return;
      window.setTimeout(attach, 100);
    };
    attach();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDialog();
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".finance-language-control button[data-lang]")) {
        window.setTimeout(updateCardLabels, 0);
      }
    });
  }

  start();
})();
