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
    if (link.href !== `${PORTAL_URL}/`) link.href = PORTAL_URL;
    if (link.target !== "_blank") link.target = "_blank";
    if (link.rel !== "noopener noreferrer") link.rel = "noopener noreferrer";
    if (link.textContent !== label) link.textContent = label;
    if (link.getAttribute("aria-label") !== t.aria) link.setAttribute("aria-label", t.aria);
    if (!link.dataset.financePortalBound) {
      link.dataset.financePortalBound = "true";
      link.addEventListener("click", (event) => event.stopPropagation());
    }
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

  function scheduleDialogSync() {
    window.setTimeout(syncDialogLink, 0);
  }

  function start() {
    sync();

    document.addEventListener("click", (event) => {
      if (event.target.closest(".finance-language-control button[data-lang]")) {
        window.setTimeout(sync, 0);
        return;
      }

      if (
        event.target.closest("#financeLiventXSigningCard") ||
        event.target.closest('[data-finance-action-queue="liventxReadyToSign"]') ||
        event.target.closest("[data-finance-action-close]")
      ) {
        scheduleDialogSync();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (
        event.target.closest?.("#financeLiventXSigningCard") ||
        event.target.closest?.('[data-finance-action-queue="liventxReadyToSign"]')
      ) {
        scheduleDialogSync();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
