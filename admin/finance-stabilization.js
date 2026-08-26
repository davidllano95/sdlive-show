(() => {
  if (window.SDLiveFinanceStabilization) return;
  window.SDLiveFinanceStabilization = true;

  const rules = window.SDLiveFinanceCycleRules || {
    urgencyFor(day) {
      if (day >= 5 && day <= 19) return "low";
      if (day >= 20 && day <= 25) return "medium";
      return "high";
    },
    reminderKind(day) {
      if (day === 5) return "open";
      if (day === 19) return "close";
      return null;
    }
  };

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function bogotaDateParts() {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(new Date());
      const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return {
        year: Number(value.year),
        month: Number(value.month),
        day: Number(value.day),
        key: `${value.year}-${value.month}-${value.day}`
      };
    } catch {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      return {
        year,
        month,
        day,
        key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      };
    }
  }

  function urgencyCopy(level) {
    const es = language() === "es";
    if (level === "high") {
      return es
        ? "Urgencia alta · fuera de la ventana normal · días 26–4."
        : "High urgency · outside the normal window · days 26–4.";
    }
    if (level === "medium") {
      return es
        ? "Urgencia media · ventana cerrada · días 20–25."
        : "Medium urgency · window closed · days 20–25.";
    }
    return es
      ? "Ventana normal abierta · días 5–19."
      : "Normal window open · days 5–19.";
  }

  function reminderCopy(kind) {
    const es = language() === "es";
    if (kind === "open") {
      return es
        ? {
            eyebrow: "Cobranza · día 5",
            title: "Hoy abre la ventana de cobro",
            body: "Revisa Cobrable ahora y haz seguimiento a las cuentas pendientes.",
            action: "Abrir Cobrable ahora",
            dismiss: "Ocultar por hoy"
          }
        : {
            eyebrow: "Collections · day 5",
            title: "The collection window opens today",
            body: "Review Collectible now and follow up on outstanding accounts.",
            action: "Open Collectible now",
            dismiss: "Dismiss for today"
          };
    }
    return es
      ? {
          eyebrow: "Cobranza · día 19",
          title: "Hoy cierra la ventana de cobro",
          body: "Haz la última revisión de Cobrable ahora y contacta los pendientes antes del cierre.",
          action: "Abrir Cobrable ahora",
          dismiss: "Ocultar por hoy"
        }
      : {
          eyebrow: "Collections · day 19",
          title: "The collection window closes today",
          body: "Do a final Collectible now review and follow up before closing.",
          action: "Open Collectible now",
          dismiss: "Dismiss for today"
        };
  }

  function reminderStorageKey(kind, dateKey) {
    return `sdlive-finance-collection-reminder:${kind}:${dateKey}`;
  }

  function reminderDismissed(kind, dateKey) {
    try {
      return window.localStorage?.getItem(reminderStorageKey(kind, dateKey)) === "dismissed";
    } catch {
      return false;
    }
  }

  function dismissReminder(kind, dateKey) {
    try {
      window.localStorage?.setItem(reminderStorageKey(kind, dateKey), "dismissed");
    } catch {
      // Reminder persistence is convenience-only.
    }
  }

  function openCollectibleQueue() {
    const card = document.getElementById("financeReceivableCount")?.closest(".finance-card");
    if (!card) return false;
    card.focus?.({ preventScroll: true });
    card.click();
    return true;
  }

  function syncCollectionReminder() {
    const metrics = document.querySelector(".finance-metrics");
    if (!metrics) return false;

    const today = bogotaDateParts();
    const kind = rules.reminderKind(today.day);
    let reminder = document.getElementById("financeCollectionCycleReminder");

    if (!kind || reminderDismissed(kind, today.key)) {
      reminder?.remove();
      return true;
    }

    const text = reminderCopy(kind);
    if (!reminder) {
      reminder = document.createElement("aside");
      reminder.id = "financeCollectionCycleReminder";
      reminder.className = "finance-cycle-reminder";
      reminder.setAttribute("role", "status");
      reminder.innerHTML = `
        <div class="finance-cycle-reminder__copy">
          <span class="finance-cycle-reminder__eyebrow"></span>
          <strong class="finance-cycle-reminder__title"></strong>
          <p class="finance-cycle-reminder__body"></p>
        </div>
        <div class="finance-cycle-reminder__actions">
          <button class="button finance-cycle-reminder__open" type="button"></button>
          <button class="button button--ghost finance-cycle-reminder__dismiss" type="button"></button>
        </div>
      `;
      metrics.insertAdjacentElement("beforebegin", reminder);
    }

    reminder.dataset.collectionCycle = kind;
    reminder.querySelector(".finance-cycle-reminder__eyebrow").textContent = text.eyebrow;
    reminder.querySelector(".finance-cycle-reminder__title").textContent = text.title;
    reminder.querySelector(".finance-cycle-reminder__body").textContent = text.body;
    const open = reminder.querySelector(".finance-cycle-reminder__open");
    const dismiss = reminder.querySelector(".finance-cycle-reminder__dismiss");
    open.textContent = text.action;
    dismiss.textContent = text.dismiss;
    open.onclick = () => openCollectibleQueue();
    dismiss.onclick = () => {
      dismissReminder(kind, today.key);
      reminder.remove();
    };
    return true;
  }

  function syncCard(card) {
    const metrics = document.querySelector(".finance-metrics");
    if (!metrics || !card) return false;
    if (card.parentElement !== metrics) metrics.appendChild(card);

    const count = Number(card.querySelector("#financeLiventXSignCount")?.textContent || 0);
    const actionable = Number.isFinite(count) && count > 0;
    const level = rules.urgencyFor(bogotaDateParts().day);
    const next = actionable ? level : "clear";
    if (card.dataset.liventxUrgency !== next) card.dataset.liventxUrgency = next;

    const hint = card.querySelector("#financeLiventXSignHint");
    if (hint) {
      const desired = actionable
        ? urgencyCopy(level)
        : (language() === "es"
          ? "Sin pendientes de LiventX listos para firmar."
          : "No LiventX items are ready to sign.");
      if (hint.textContent !== desired) hint.textContent = desired;
    }
    return true;
  }

  function install(card) {
    if (!card || card.dataset.financeStabilizationBound === "true") return;
    card.dataset.financeStabilizationBound = "true";
    syncCard(card);
    syncCollectionReminder();

    // Deliberately observe this one card only. The previous Finance incident was
    // caused by a broad document-body observer loop; this must stay narrow and
    // idempotent.
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => syncCard(card));
    });
    observer.observe(card, { childList: true, characterData: true, subtree: true });

    document.addEventListener("sdlive:finance-language-change", () => {
      syncCard(card);
      syncCollectionReminder();
    });
  }

  function findCard(attempt = 0) {
    const card = document.getElementById("financeLiventXSigningCard");
    if (card) {
      install(card);
      return;
    }
    if (attempt < 80) window.setTimeout(() => findCard(attempt + 1), 125);
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/admin/finance-stabilization.css?v=20260826-1";
  link.dataset.financeStabilizationStyles = "true";
  document.head.appendChild(link);
  findCard();
})();