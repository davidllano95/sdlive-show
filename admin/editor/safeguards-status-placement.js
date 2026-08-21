(() => {
  if (window.SDLIVE_SAFEGUARDS_STATUS_PLACEMENT) return;
  window.SDLIVE_SAFEGUARDS_STATUS_PLACEMENT = true;

  let panelObserver = null;
  let summaryObserver = null;

  function injectStyles() {
    if (document.getElementById("sdlive-safeguards-status-placement-style")) return;
    const style = document.createElement("style");
    style.id = "sdlive-safeguards-status-placement-style";
    style.textContent = `
      .visual-guards-run-status {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        color: rgba(244,245,247,.52);
        font-size: 10px;
        line-height: 1;
        white-space: nowrap;
      }
      .visual-guards-run-status.is-running {
        color: rgba(244,245,247,.72);
      }
      .visual-guards-run-status.is-complete {
        color: rgba(160,137,229,.92);
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeSummary(text) {
    return text
      .replace(/\s*·\s*checked now\s*·\s*run\s*\d+\.?/i, ".")
      .replace(/\.\.+$/g, ".")
      .trim();
  }

  function mount() {
    const panel = document.querySelector(".visual-guards-panel");
    const runButton = panel?.querySelector("[data-guard-check]");
    const summary = panel?.querySelector("[data-guard-summary]");
    if (!panel || !runButton || !summary) return false;

    injectStyles();

    let status = panel.querySelector("[data-guard-run-status]");
    if (!status) {
      status = document.createElement("span");
      status.className = "visual-guards-run-status";
      status.setAttribute("data-guard-run-status", "true");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      runButton.insertAdjacentElement("afterend", status);
    }

    const sync = () => {
      const text = String(summary.textContent || "").trim();
      const complete = text.match(/checked now\s*·\s*run\s*(\d+)/i);
      if (complete) {
        status.textContent = `checked now · run ${complete[1]}`;
        status.classList.remove("is-running");
        status.classList.add("is-complete");
        const cleaned = normalizeSummary(text);
        if (cleaned !== text) summary.textContent = cleaned;
        return;
      }

      const running = text.match(/Running visual diagnostics…\s*run\s*(\d+)/i);
      if (running) {
        status.textContent = `running · run ${running[1]}`;
        status.classList.remove("is-complete");
        status.classList.add("is-running");
        summary.textContent = "Running visual diagnostics…";
      }
    };

    summaryObserver?.disconnect();
    summaryObserver = new MutationObserver(sync);
    summaryObserver.observe(summary, { childList: true, characterData: true, subtree: true });
    sync();

    panelObserver?.disconnect();
    panelObserver = null;
    return true;
  }

  if (!mount()) {
    panelObserver = new MutationObserver(() => mount());
    panelObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
