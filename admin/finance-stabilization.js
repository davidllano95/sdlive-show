(() => {
  if (window.SDLiveFinanceStabilization) return;
  window.SDLiveFinanceStabilization = true;

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function bogotaDay() {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        day: "numeric"
      }).formatToParts(new Date());
      return Number(parts.find((part) => part.type === "day")?.value || 1);
    } catch {
      return new Date().getDate();
    }
  }

  function urgencyFor(day) {
    if (day <= 19) return "low";
    if (day <= 25) return "medium";
    return "high";
  }

  function urgencyCopy(level) {
    const es = language() === "es";
    if (level === "high") {
      return es
        ? "Urgencia alta · cierra las firmas antes de terminar el mes."
        : "High urgency · close signatures before month end.";
    }
    if (level === "medium") {
      return es
        ? "Urgencia media · la ventana mensual de firma ya está activa."
        : "Medium urgency · the monthly signing window is active.";
    }
    return es
      ? "Urgencia baja · revisa los pendientes antes de la ventana de cierre."
      : "Low urgency · review pending signatures before the closing window.";
  }

  function syncCard(card) {
    const metrics = document.querySelector(".finance-metrics");
    if (!metrics || !card) return false;
    if (card.parentElement !== metrics) metrics.appendChild(card);

    const count = Number(card.querySelector("#financeLiventXSignCount")?.textContent || 0);
    const actionable = Number.isFinite(count) && count > 0;
    const level = urgencyFor(bogotaDay());
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

    // Deliberately observe this one card only. The previous Finance incident was
    // caused by a broad document-body observer loop; this must stay narrow and
    // idempotent.
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => syncCard(card));
    });
    observer.observe(card, { childList: true, characterData: true, subtree: true });

    document.addEventListener("sdlive:finance-language-change", () => syncCard(card));
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
  link.href = "/admin/finance-stabilization.css?v=20260825-1";
  link.dataset.financeStabilizationStyles = "true";
  document.head.appendChild(link);
  findCard();
})();
