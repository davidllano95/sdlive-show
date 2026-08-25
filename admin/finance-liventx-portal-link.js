(() => {
  const PORTAL_URL = "https://proveedores.aoscentral.com";

  function language() {
    return window.SDLiveFinanceI18n?.language === "es" ? "es" : "en";
  }

  function copy() {
    return language() === "es"
      ? {
          card: "Abrir portal de proveedores ↗",
          dialog: "Ir al portal para firmar ↗",
          aria: "Abrir portal de proveedores de LiventX en una pestaña nueva"
        }
      : {
          card: "Open supplier portal ↗",
          dialog: "Go to portal to sign ↗",
          aria: "Open the LiventX supplier portal in a new tab"
        };
  }

  function configureLink(link, label) {
    const t = copy();
    link.href = PORTAL_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    link.setAttribute("aria-label", t.aria);
    link.addEventListener("click", (event) => event.stopPropagation());
  }

  function ensureCardLink() {
    const card = document.getElementById("financeLiventXSigningCard");
    if (!card) return false;

    let link = document.getElementById("financeLiventXPortalLink");
    if (!link) {
      link = document.createElement("a");
      link.id = "financeLiventXPortalLink";
      link.className = "finance-liventx-portal-link finance-liventx-portal-link--card";
      card.insertAdjacentElement("afterend", link);
    }
    configureLink(link, copy().card);
    return true;
  }

  function liventxDialogOpen() {
    const dialog = document.querySelector(".finance-action-dialog:not([hidden])");
    const title = dialog?.querySelector("#financeActionTitle")?.textContent || "";
    return Boolean(dialog && /^LiventX\s*·/i.test(title.trim()));
  }

  function syncDialogLink() {
    const dialog = document.querySelector(".finance-action-dialog");
    if (!dialog) return false;

    let link = dialog.querySelector("#financeLiventXDialogPortalLink");
    if (!liventxDialogOpen()) {
      link?.remove();
      return true;
    }

    if (!link) {
      link = document.createElement("a");
      link.id = "financeLiventXDialogPortalLink";
      link.className = "finance-liventx-portal-link finance-liventx-portal-link--dialog";
      const header = dialog.querySelector(".finance-action-dialog__header");
      header?.insertAdjacentElement("afterend", link);
    }
    configureLink(link, copy().dialog);
    return true;
  }

  function sync() {
    ensureCardLink();
    syncDialogLink();
  }

  function start() {
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"]
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".finance-language-control button[data-lang]")) {
        window.setTimeout(sync, 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();