(() => {
  if (window.SDLIVE_TRUSTED_SELECT_BRIDGE) return;
  window.SDLIVE_TRUSTED_SELECT_BRIDGE = true;

  const iframe = document.getElementById("sitePreview");
  const trustedSectionButton = document.querySelector(
    '[data-section="trustedTitle"]'
  );
  const editorBody = document.getElementById("editorBody");
  const inspector = document.getElementById("contentInspector");
  const toggleInspectorButton = document.getElementById("toggleInspector");

  if (!iframe || !trustedSectionButton || !editorBody) return;

  const KEY_ATTR = "data-trusted-editor-key";
  let highlightTimer = 0;

  function isTrustedActive() {
    return trustedSectionButton.classList.contains("is-active");
  }

  function ensureInspectorVisible() {
    if (
      inspector?.getAttribute("aria-hidden") === "true" &&
      toggleInspectorButton
    ) {
      toggleInspectorButton.click();
    }
  }

  function firstTrustedSet(doc) {
    return doc?.querySelector(".trusted-set") || null;
  }

  function clientIndexForReveal(doc, reveal) {
    if (!reveal?.id) return -1;

    const cards = Array.from(
      firstTrustedSet(doc)?.querySelectorAll(
        ":scope > .client-strip-card[data-client]"
      ) || []
    );

    return cards.findIndex(
      (card) => card.dataset.supportedReveal === reveal.id
    );
  }

  function previewRevealItems(reveal) {
    if (!reveal) return [];

    return Array.from(
      reveal.querySelectorAll(
        [
          ".collaboration-credit",
          ".supported-reveal-logos > .supported-brand-tile",
          ".supported-reveal-logos > img"
        ].join(",")
      )
    );
  }

  function decoratePreviewTargets(doc) {
    const wrap = doc?.querySelector(".trusted-wrap");
    if (!wrap) return;

    const title = wrap.querySelector("#trustedTitle");
    if (title) title.setAttribute(KEY_ATTR, "section:title");

    wrap.querySelectorAll(".trusted-set").forEach((set) => {
      Array.from(
        set.querySelectorAll(":scope > .client-strip-card[data-client]")
      ).forEach((card, clientIndex) => {
        card.setAttribute(KEY_ATTR, `client:${clientIndex}`);
      });
    });

    wrap.querySelectorAll(".supported-reveal").forEach((reveal) => {
      const clientIndex = clientIndexForReveal(doc, reveal);
      if (clientIndex < 0) return;

      reveal.setAttribute(KEY_ATTR, `reveal:${clientIndex}`);

      previewRevealItems(reveal).forEach((item, itemIndex) => {
        const key = `item:${clientIndex}:${itemIndex}`;
        item.setAttribute(KEY_ATTR, key);
        item.querySelectorAll("img").forEach((image) => {
          image.setAttribute(KEY_ATTR, key);
        });
      });
    });
  }

  function editorSectionHeading() {
    return Array.from(
      editorBody.querySelectorAll("details.editor-section")
    ).find((details) => {
      return String(details.querySelector(":scope > summary")?.textContent || "")
        .trim()
        .toLowerCase() === "section heading";
    }) || null;
  }

  function decorateEditorTargets() {
    const sectionHeading = editorSectionHeading();
    if (sectionHeading) {
      sectionHeading.setAttribute(KEY_ATTR, "section:title");
    }

    Array.from(
      editorBody.querySelectorAll(".trusted-collection-item")
    ).forEach((client, clientIndex) => {
      client.setAttribute(KEY_ATTR, `client:${clientIndex}`);

      const reveal = client.querySelector(":scope > .trusted-reveal-editor");
      if (!reveal) return;

      reveal.setAttribute(KEY_ATTR, `reveal:${clientIndex}`);

      Array.from(
        reveal.querySelectorAll(":scope > .trusted-subitem")
      ).forEach((item, itemIndex) => {
        item.setAttribute(KEY_ATTR, `item:${clientIndex}:${itemIndex}`);
      });
    });
  }

  function selectionKeyFromPreview(doc, target) {
    if (!target?.closest) return "";

    const wrap = target.closest(".trusted-wrap");
    if (!wrap) return "";

    decoratePreviewTargets(doc);

    const keyed = target.closest(`[${KEY_ATTR}]`);
    if (keyed && wrap.contains(keyed)) {
      return keyed.getAttribute(KEY_ATTR) || "";
    }

    return "section:title";
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
      block: "center"
    });

    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      target.classList.remove("sdlive-editor-jump-target");
    }, 2200);
  }

  function focusTrustedKey(key) {
    const deadline = performance.now() + 3000;

    const locate = () => {
      decorateEditorTargets();

      const target = Array.from(
        editorBody.querySelectorAll(`[${KEY_ATTR}]`)
      ).find((item) => item.getAttribute(KEY_ATTR) === key);

      if (!target) {
        if (performance.now() < deadline) {
          window.setTimeout(locate, 50);
        }
        return;
      }

      openEditorAncestors(target);
      highlightEditorTarget(target);
    };

    locate();
  }

  function routeTrustedSelection(key) {
    if (!key) return;

    ensureInspectorVisible();

    // Re-clicking Trusted By rebuilds the preview and restarts the marquee.
    // Only activate the section when Select comes from another editor section.
    if (!isTrustedActive()) {
      trustedSectionButton.click();
    }

    focusTrustedKey(key);
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

        const key = selectionKeyFromPreview(doc, event.target);
        if (!key) return;

        window.setTimeout(() => routeTrustedSelection(key), 0);
      },
      true
    );
  }

  iframe.addEventListener("load", () => {
    window.setTimeout(() => {
      bindPreviewWindow();
      try {
        decoratePreviewTargets(iframe.contentDocument);
      } catch {
        // Preview may still be settling.
      }
    }, 0);
  });

  const editorObserver = new MutationObserver(() => {
    window.requestAnimationFrame(decorateEditorTargets);
  });
  editorObserver.observe(editorBody, { childList: true, subtree: true });

  bindPreviewWindow();
  decorateEditorTargets();
})();
