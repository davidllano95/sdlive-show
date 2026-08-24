(() => {
  const STATUS_ENDPOINT = "/api/site/showday-status";
  const REFRESH_MS = 60000;
  const LANGUAGE_KEY = "sdlive-language-preference";
  const root = document.documentElement;
  const workLocation = document.getElementById("workLocation");
  const originalWorkLocation = workLocation?.textContent || "Creative Audio";
  const seoLogo = document.querySelector(".seo-header-logo img");
  const originalSeoLogoSrc = seoLogo?.getAttribute("src") || "";
  const originalSeoLogoSrcset = seoLogo?.getAttribute("srcset") || "";
  const sharedHeader = document.querySelector("[data-sdlive-shared-public-header]");

  let timer = 0;

  function currentLanguage() {
    return String(root.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function persistLanguage(lang) {
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Cookie remains authoritative for the next request when storage is blocked.
    }
    document.cookie = `${LANGUAGE_KEY}=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function translateSharedHeader(lang) {
    if (!sharedHeader) return;
    sharedHeader.querySelectorAll("[data-en][data-es]").forEach((element) => {
      element.textContent = lang === "es" ? element.dataset.es : element.dataset.en;
    });
    const en = sharedHeader.querySelector("#langEn");
    const es = sharedHeader.querySelector("#langEs");
    en?.setAttribute("aria-pressed", String(lang === "en"));
    es?.setAttribute("aria-pressed", String(lang === "es"));
  }

  function initSharedHeaderControls() {
    if (!sharedHeader) return;

    translateSharedHeader(currentLanguage());

    const navToggle = sharedHeader.querySelector("#navToggle");
    const closeMenu = () => {
      sharedHeader.classList.remove("nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
    };

    navToggle?.addEventListener("click", () => {
      const open = !sharedHeader.classList.contains("nav-open");
      sharedHeader.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });

    sharedHeader.querySelectorAll(".main-nav a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    sharedHeader.querySelector("#langEn")?.addEventListener("click", () => {
      persistLanguage("en");
      window.location.assign("/en/");
    });

    sharedHeader.querySelector("#langEs")?.addEventListener("click", () => {
      persistLanguage("es");
      window.location.assign("/es-co/");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function ensureSeoStatus() {
    const headerRow = document.querySelector(".seo-header-row");
    if (!headerRow) return null;
    let status = headerRow.querySelector(".sdlive-showday-status");
    if (status) return status;
    status = document.createElement("span");
    status.className = "sdlive-showday-status";
    status.hidden = true;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    headerRow.appendChild(status);
    return status;
  }

  function applyStatus(status) {
    const active = status?.active === true;
    const location = typeof status?.location === "string" ? status.location.trim() : "";
    const source = status?.source === "admin-override" ? "admin-override" : "site-schedule";
    const overrideMode = ["auto", "force_on", "force_off"].includes(status?.overrideMode)
      ? status.overrideMode
      : "auto";

    root.classList.toggle("showday-active", active);
    root.dataset.showdaySource = source;
    root.dataset.showdayOverride = overrideMode;

    if (workLocation) {
      workLocation.textContent = active && location ? location : originalWorkLocation;
    }

    if (seoLogo) {
      if (active) {
        seoLogo.setAttribute("src", "/assets/logos/sd-live-header-showday.png");
        seoLogo.removeAttribute("srcset");
      } else {
        seoLogo.setAttribute("src", originalSeoLogoSrc);
        if (originalSeoLogoSrcset) seoLogo.setAttribute("srcset", originalSeoLogoSrcset);
        else seoLogo.removeAttribute("srcset");
      }
    }

    const seoStatus = ensureSeoStatus();
    if (seoStatus) {
      seoStatus.hidden = !active;
      seoStatus.textContent = active
        ? `ON AIR${location ? ` · ${location}` : ""}`
        : "";
    }
  }

  async function refresh() {
    try {
      const response = await fetch(STATUS_ENDPOINT, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(`Show Day status ${response.status}`);
      const status = await response.json();
      if (typeof status?.active !== "boolean") throw new Error("Invalid Show Day status");
      applyStatus(status);
    } catch (error) {
      console.warn("Automatic Show Day status unavailable; using normal mode.", error);
      applyStatus({ active: false, location: "", source: "site-schedule", overrideMode: "auto" });
    }
  }

  function start() {
    initSharedHeaderControls();
    refresh();
    timer = window.setInterval(refresh, REFRESH_MS);
  }

  window.addEventListener("pagehide", () => {
    if (timer) window.clearInterval(timer);
  }, { once: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();