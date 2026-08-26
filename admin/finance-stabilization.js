(() => {
  if (window.SDLiveFinanceStabilization) return;
  window.SDLiveFinanceStabilization = true;

  const rules = window.SDLiveFinanceCycleRules || {
    urgencyFor(day) {
      if (day >= 5 && day <= 19) return "low";
      if (day >= 20 && day <= 25) return "medium";
      return "high";
    }
  };

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function bogotaDay() {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        day: "numeric"
      }).formatToParts(new Date());
      return Number(parts.find((part) => part.type === "day")?.value || 1);
    } catch {
      return new Date().getDate();
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

  function syncCard(card) {
    const metrics = document.querySelector(".finance-metrics");
    if (!metrics || !card) return false;
    if (card.parentElement !== metrics) metrics.appendChild(card);

    const count = Number(card.querySelector("#financeLiventXSignCount")?.textContent || 0);
    const actionable = Number.isFinite(count) && count > 0;
    const level = rules.urgencyFor(bogotaDay());
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
  link.href = "/admin/finance-stabilization.css?v=20260826-2";
  link.dataset.financeStabilizationStyles = "true";
  document.head.appendChild(link);
  findCard();
})();