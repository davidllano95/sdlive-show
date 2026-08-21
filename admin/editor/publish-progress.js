(() => {
  if (window.SDLIVE_PUBLISH_PROGRESS) return;
  window.SDLIVE_PUBLISH_PROGRESS = true;

  const publishButton = document.getElementById("publishContent");
  if (!publishButton) return;

  const IDLE_LABEL = (publishButton.textContent || "Publish").trim() || "Publish";
  let completionTimer = 0;
  let statusObserver = null;
  let bodyObserver = null;

  injectStyles();

  function injectStyles() {
    if (document.getElementById("sdlive-publish-progress-style")) return;

    const style = document.createElement("style");
    style.id = "sdlive-publish-progress-style";
    style.textContent = `
      @keyframes sdlive-publish-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes sdlive-publish-shimmer {
        0% { transform: translateX(-140%); }
        100% { transform: translateX(240%); }
      }

      #publishContent.is-publishing {
        position: relative;
        overflow: hidden;
        min-width: 116px;
        padding-left: 30px;
      }

      #publishContent.is-publishing::before {
        content: "";
        position: absolute;
        left: 11px;
        top: 50%;
        width: 10px;
        height: 10px;
        margin-top: -6px;
        border: 2px solid rgba(255,255,255,.28);
        border-top-color: currentColor;
        border-radius: 999px;
        animation: sdlive-publish-spin .7s linear infinite;
      }

      #publishContent.is-publishing::after {
        content: "";
        position: absolute;
        inset: 0;
        width: 38%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        animation: sdlive-publish-shimmer 1.15s ease-in-out infinite;
        pointer-events: none;
      }

      #publishContent.is-publish-complete,
      #publishContent.is-publish-failed {
        min-width: 116px;
      }

      #publishContent.is-publish-complete {
        border-color: rgba(88,214,141,.44);
      }

      #publishContent.is-publish-failed {
        border-color: rgba(255,107,74,.48);
      }

      @media (prefers-reduced-motion: reduce) {
        #publishContent.is-publishing::before,
        #publishContent.is-publishing::after {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setButtonState(kind, label) {
    window.clearTimeout(completionTimer);
    publishButton.classList.remove(
      "is-publishing",
      "is-publish-complete",
      "is-publish-failed"
    );
    publishButton.removeAttribute("data-publish-stage");

    if (kind === "idle") {
      publishButton.textContent = IDLE_LABEL;
      publishButton.removeAttribute("aria-busy");
      return;
    }

    publishButton.textContent = label;
    publishButton.setAttribute("data-publish-stage", kind);

    if (kind === "checking" || kind === "publishing" || kind === "verifying") {
      publishButton.classList.add("is-publishing");
      publishButton.setAttribute("aria-busy", "true");
      return;
    }

    publishButton.removeAttribute("aria-busy");
    publishButton.classList.add(
      kind === "complete" ? "is-publish-complete" : "is-publish-failed"
    );
    completionTimer = window.setTimeout(() => setButtonState("idle", IDLE_LABEL), 1400);
  }

  function syncFromFailsafe(status) {
    const text = String(status?.textContent || "").trim();
    if (!text) return;

    if (/pre-publish check/i.test(text)) {
      setButtonState("checking", "Checking…");
      return;
    }

    if (/verifying live/i.test(text)) {
      setButtonState("verifying", "Verifying…");
      return;
    }

    if (/publishing/i.test(text) && !/^Published/i.test(text)) {
      setButtonState("publishing", "Publishing…");
      return;
    }

    if (/^Published · Failsafe (?:✓ All running|fixed \+ verified)/i.test(text)) {
      setButtonState("complete", "Published ✓");
      return;
    }

    if (/Failsafe blocked publish|Published · Failsafe failed|Publish failed/i.test(text)) {
      setButtonState("failed", "Publish failed");
      return;
    }

    if (/^Failsafe ready/i.test(text)) {
      setButtonState("idle", IDLE_LABEL);
    }
  }

  function mount() {
    const status = document.querySelector("[data-automatic-failsafe-status]");
    if (!status) return false;

    statusObserver?.disconnect();
    statusObserver = new MutationObserver(() => syncFromFailsafe(status));
    statusObserver.observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    syncFromFailsafe(status);

    bodyObserver?.disconnect();
    bodyObserver = null;
    return true;
  }

  if (!mount()) {
    bodyObserver = new MutationObserver(() => mount());
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
