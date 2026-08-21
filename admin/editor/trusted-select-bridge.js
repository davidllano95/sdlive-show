(() => {
  if (window.SDLIVE_TRUSTED_SELECT_BRIDGE) return;
  window.SDLIVE_TRUSTED_SELECT_BRIDGE = true;

  const iframe = document.getElementById("sitePreview");
  const trustedSectionButton = document.querySelector(
    '[data-section="trustedTitle"]'
  );
  const editorBody = document.getElementById("editorBody");

  if (!iframe || !trustedSectionButton || !editorBody) return;

  let highlightTimer = 0;

  function clientIndexFromPreview(doc, clientId) {
    const firstSet = doc?.querySelector(".trusted-set");
    if (!firstSet || !clientId) return -1;

    const cards = Array.from(
      firstSet.querySelectorAll(":scope > .client-strip-card[data-client]")
    );

    return cards.findIndex((card) => card.dataset.client === clientId);
  }

  function findClientEditor({ clientId, clientName, index }) {
    const clients = Array.from(
      editorBody.querySelectorAll(".trusted-collection-item")
    );

    const byId = clientId
      ? clients.find((item) => item.dataset.trustedClientId === clientId)
      : null;
    if (byId) return byId;

    const byName = clientName
      ? clients.find((item) => {
          const name = item.querySelector(".trusted-item-head strong")?.textContent;
          return String(name || "").trim() === clientName;
        })
      : null;
    if (byName) return byName;

    return index >= 0 ? clients[index] || null : null;
  }

  function focusClientEditor(selection) {
    const deadline = performance.now() + 2500;

    const locate = () => {
      const target = findClientEditor(selection);

      if (!target) {
        if (performance.now() < deadline) {
          window.setTimeout(locate, 60);
        }
        return;
      }

      const clientsSection = target.closest("details.editor-section");
      if (clientsSection) clientsSection.open = true;

      editorBody
        .querySelectorAll(".sdlive-editor-jump-target")
        .forEach((item) => item.classList.remove("sdlive-editor-jump-target"));

      target.classList.add("sdlive-editor-jump-target");
      target.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      window.clearTimeout(highlightTimer);
      highlightTimer = window.setTimeout(() => {
        target.classList.remove("sdlive-editor-jump-target");
      }, 1800);
    };

    locate();
  }

  function bindPreviewWindow() {
    let win;
    let doc;

    try {
      win = iframe.contentWindow;
      doc = iframe.contentDocument;
    } catch {
      return;
    }

    if (!win || !doc || win.__sdliveTrustedSelectBridgeBound) return;
    win.__sdliveTrustedSelectBridgeBound = true;

    win.addEventListener(
      "click",
      (event) => {
        if (doc.documentElement?.dataset.sdliveAdminSelect !== "true") {
          return;
        }

        const card = event.target?.closest?.(
          ".client-strip-card[data-client]"
        );
        if (!card) return;

        const clientId = card.dataset.client || "";
        const clientName = String(
          card.querySelector("figcaption strong")?.textContent || ""
        ).trim();
        const index = clientIndexFromPreview(doc, clientId);

        window.setTimeout(() => {
          trustedSectionButton.click();
          focusClientEditor({ clientId, clientName, index });
        }, 0);
      },
      true
    );
  }

  iframe.addEventListener("load", () => {
    window.setTimeout(bindPreviewWindow, 0);
  });

  bindPreviewWindow();
})();
