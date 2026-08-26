(() => {
  const state = window.__SDLiveRentalPresentation;
  if (!state || window.SDLiveRentalPresentationRuntime) return;
  window.SDLiveRentalPresentationRuntime = true;

  const rental = document.getElementById("rental");
  if (!rental) return;

  const lang = String(document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const localized = (value) => value?.[lang] || value?.en || value?.es || "";

  function renderCards() {
    const grid = rental.querySelector(".rental-config-grid");
    if (!grid) return;
    const templates = new Map(
      [...grid.querySelectorAll("[data-rental-preset]")].map((card) => [card.dataset.rentalPreset, card.cloneNode(true)])
    );
    const cards = Array.isArray(state.recommended?.cards) && state.recommended.cards.length
      ? state.recommended.cards
      : Object.keys(state.presets || {}).map((presetKey) => ({
          id: `preset-${presetKey}`,
          presetKey,
          kicker: state.presets[presetKey]?.kicker,
          title: state.presets[presetKey]?.title,
          action: state.presets[presetKey]?.action,
          visible: true
        }));

    const rendered = [];
    cards.filter((card) => card.visible !== false).forEach((card) => {
      const template = templates.get(card.presetKey);
      if (!template) return;
      const clone = template.cloneNode(true);
      clone.dataset.rentalPresentationCardId = card.id;
      const kicker = clone.querySelector(".rental-config-kicker");
      const title = clone.querySelector("strong");
      const action = clone.querySelector("small");
      if (kicker) {
        kicker.dataset.en = card.kicker?.en || "";
        kicker.dataset.es = card.kicker?.es || "";
        kicker.textContent = localized(card.kicker);
      }
      if (title) {
        title.dataset.en = card.title?.en || "";
        title.dataset.es = card.title?.es || "";
        title.textContent = localized(card.title);
      }
      if (action) {
        action.dataset.en = card.action?.en || "";
        action.dataset.es = card.action?.es || "";
        action.textContent = localized(card.action);
      }
      rendered.push(clone);
    });
    if (rendered.length) grid.replaceChildren(...rendered);
  }

  function reorderEquipment() {
    const order = state.recommended?.itemOrder;
    if (!order || typeof order !== "object") return;
    Object.values(order).forEach((ids) => {
      if (!Array.isArray(ids) || !ids.length) return;
      const cards = ids.map((id) => rental.querySelector(`[data-rental-item="${CSS.escape(id)}"]`)).filter(Boolean);
      const grid = cards[0]?.parentElement;
      if (!grid || !cards.every((card) => card.parentElement === grid)) return;
      cards.forEach((card) => grid.appendChild(card));
    });
  }

  renderCards();
  reorderEquipment();
})();
