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

  function firstTrustedSet(doc) {
    return doc?.querySelector(".trusted-set") || null;
  }

  function clientIndexFromPreview(doc, clientId) {
    const firstSet = firstTrustedSet(doc);
    if (!firstSet || !clientId) return -1;

    const cards = Array.from(
      firstSet.querySelectorAll(":scope > .client-strip-card[data-client]")
    );

    return cards.findIndex((card) => card.dataset.client === clientId);
  }

  function clientSelectionFromCard(doc, card) {
    if (!card) return null;

    const clientId = card.dataset.client || "";
    const clientName = String(
      card.querySelector("figcaption strong")?.textContent || ""
    ).trim();

    return {
      kind: "client",
      clientId,
      clientName,
      clientIndex: clientIndexFromPreview(doc, clientId)
    };
  }

  function clientSelectionFromReveal(doc, reveal) {
    if (!reveal?.id) return null;

    const firstSet = firstTrustedSet(doc);
    const card = firstSet?.querySelector(
      `.client-strip-card[data-supported-reveal="${CSS.escape(reveal.id)}"]`
    );

    if (!card) return null;
    return clientSelectionFromCard(doc, card);
  }

  function previewMediaSource(image) {
    if (!image) return "";
    return String(
      image.dataset.cmsMediaSource ||
      image.getAttribute("src") ||
      ""
    ).trim();
  }

  function previewItemSelection(doc, target, reveal) {
    const client = clientSelectionFromReveal(doc, reveal);
    if (!client) return null;

    const visualItem = target.closest?.(
      ".supported-brand-tile, .collaboration-credit, .supported-reveal-logos > img"
    );

    if (!visualItem || !reveal.contains(visualItem)) {
      return {
        ...client,
        kind: "reveal",
        revealId: reveal.id
      };
    }

    const image =
      visualItem.matches?.("img")
        ? visualItem
        : visualItem.querySelector("img");

    const source = previewMediaSource(image);
    const label = String(
      image?.getAttribute("alt") ||
      visualItem.querySelector("strong")?.textContent ||
      ""
    ).trim();

    return {
      ...client,
      kind: "item",
      revealId: reveal.id,
      source,
      label
    };
  }

  function selectionFromPreview(doc, target) {
    if (!target?.closest) return null;

    const trustedWrap = target.closest(".trusted-wrap");
    if (!trustedWrap) return null;

    if (target.closest("#trustedTitle")) {
      return { kind: "section" };
    }

    const card = target.closest(".client-strip-card[data-client]");
    if (card) return clientSelectionFromCard(doc, card);

    const reveal = target.closest(".supported-reveal");
    if (reveal) return previewItemSelection(doc, target, reveal);

    return { kind: "section" };
  }

  function editorClients() {
    return Array.from(
      editorBody.querySelectorAll(".trusted-collection-item")
    );
  }

  function findClientEditor(selection) {
    const clients = editorClients();

    if (
      Number.isInteger(selection.clientIndex) &&
      selection.clientIndex >= 0 &&
      clients[selection.clientIndex]
    ) {
      return clients[selection.clientIndex];
    }

    const byId = selection.clientId
      ? clients.find(
          (item) => item.dataset.trustedClientId === selection.clientId
        )
      : null;
    if (byId) return byId;

    const byName = selection.clientName
      ? clients.find((item) => {
          const name = item.querySelector(
            ":scope > .trusted-item-head strong"
          )?.textContent;
          return String(name || "").trim() === selection.clientName;
        })
      : null;

    return byName || null;
  }

  function normalizeSource(value) {
    const source = String(value || "").trim();
    if (!source) return "";

    try {
      const url = new URL(source, iframe.contentWindow?.location?.href || location.href);
      if (url.origin === location.origin) {
        return url.pathname.replace(/^\//, "");
      }
    } catch {
      // Keep the literal source below.
    }

    return source.replace(/^\//, "");
  }

  function findRevealItemEditor(clientEditor, selection) {
    if (!clientEditor) return null;

    const subitems = Array.from(
      clientEditor.querySelectorAll(".trusted-subitem")
    );

    const wantedSource = normalizeSource(selection.source);
    if (wantedSource) {
      const bySource = subitems.find((subitem) => {
        return Array.from(
          subitem.querySelectorAll('input[data-trusted-path$=".src"]')
        ).some((input) => normalizeSource(input.value) === wantedSource);
      });

      if (bySource) return bySource;
    }

    const wantedLabel = String(selection.label || "").trim();
    if (wantedLabel) {
      const byLabel = subitems.find((subitem) => {
        const heading = String(
          subitem.querySelector(":scope > .trusted-item-head strong")
            ?.textContent ||
          ""
        ).trim();
        return heading === wantedLabel;
      });

      if (byLabel) return byLabel;
    }

    return null;
  }

  function findSectionHeadingEditor() {
    return Array.from(
      editorBody.querySelectorAll("details.editor-section")
    ).find((details) => {
      return String(details.querySelector(":scope > summary")?.textContent || "")
        .trim()
        .toLowerCase() === "section heading";
    }) || null;
  }

  function resolveEditorTarget(selection) {
    if (selection.kind === "section") {
      return findSectionHeadingEditor();
    }

    const clientEditor = findClientEditor(selection);
    if (!clientEditor) return null;

    if (selection.kind === "client") return clientEditor;

    const revealEditor = clientEditor.querySelector(".trusted-reveal-editor");
    if (selection.kind === "reveal") return revealEditor || clientEditor;

    if (selection.kind === "item") {
      return (
        findRevealItemEditor(clientEditor, selection) ||
        revealEditor ||
        clientEditor
      );
    }

    return clientEditor;
  }

  function openEditorAncestors(target) {
    let node = target;
    while (node && node !== editorBody) {
      if (node.matches?.("details.editor-section")) {
        node.open = true;
      }
      node = node.parentElement;
    }
  }

  function highlightEditorTarget(target) {
    editorBody
      .querySelectorAll(".sdlive-editor-jump-target")
      .forEach((item) => item.classList.remove("sdlive-editor-jump-target"));

    target.classList.add("sdlive-editor-jump-target");

    const anchor =
      target.querySelector?.(":scope > .trusted-item-head") ||
      target.querySelector?.(":scope > summary") ||
      target;

    anchor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      target.classList.remove("sdlive-editor-jump-target");
    }, 1800);
  }

  function focusTrustedSelection(selection) {
    const deadline = performance.now() + 2500;

    const locate = () => {
      const target = resolveEditorTarget(selection);

      if (!target) {
        if (performance.now() < deadline) {
          window.setTimeout(locate, 60);
        }
        return;
      }

      openEditorAncestors(target);
      highlightEditorTarget(target);
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

        const selection = selectionFromPreview(doc, event.target);
        if (!selection) return;

        window.setTimeout(() => {
          trustedSectionButton.click();
          focusTrustedSelection(selection);
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
