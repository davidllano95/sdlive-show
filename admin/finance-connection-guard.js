(() => {
  const DEADLINE_MS = 12000;
  const POLL_MS = 250;
  const startedAt = Date.now();

  function text(node) {
    return String(node?.textContent || "").trim();
  }

  function markWorkspaceError(message) {
    const workspace = document.getElementById("financeWorkspaceStatus");
    if (!workspace) return;
    workspace.classList.add("is-error");
    const label = workspace.querySelector("span");
    if (label) label.textContent = message;
  }

  function markWorkspaceOnline() {
    const workspace = document.getElementById("financeWorkspaceStatus");
    if (!workspace) return;
    workspace.classList.remove("is-error");
    const label = workspace.querySelector("span");
    if (label) label.textContent = "Finance online · read-only source";
  }

  function sync() {
    const source = document.getElementById("financeSource");
    if (!source) return false;
    const label = source.querySelector("span");
    const value = text(label).toLowerCase();

    if (source.classList.contains("is-error") || value.includes("unavailable") || value.includes("timed out")) {
      markWorkspaceError(text(label) || "Finance unavailable");
      return true;
    }

    if (value.startsWith("live ·") || value.includes("google sheets")) {
      markWorkspaceOnline();
      return true;
    }

    if (Date.now() - startedAt >= DEADLINE_MS && value.includes("connecting")) {
      source.classList.add("is-error");
      if (label) label.textContent = "Finance request timed out · reload to retry";
      markWorkspaceError("Finance request timed out · reload to retry");
      return true;
    }

    return false;
  }

  const interval = window.setInterval(() => {
    if (sync() || Date.now() - startedAt > DEADLINE_MS + 3000) {
      window.clearInterval(interval);
    }
  }, POLL_MS);

  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  window.setTimeout(() => observer.disconnect(), DEADLINE_MS + 5000);
  sync();
})();
