(() => {
  const STATUS_ENDPOINT = "/api/site/showday-status";
  const REFRESH_MS = 60000;
  const root = document.documentElement;
  const workLocation = document.getElementById("workLocation");
  const originalWorkLocation = workLocation?.textContent || "Creative Audio";
  const seoLogo = document.querySelector(".seo-header-logo img");
  const originalSeoLogoSrc = seoLogo?.getAttribute("src") || "";
  const originalSeoLogoSrcset = seoLogo?.getAttribute("srcset") || "";

  let timer = 0;

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
    root.classList.toggle("showday-active", active);
    root.dataset.showdaySource = "site-schedule";

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
      applyStatus({ active: false, location: "" });
    }
  }

  function start() {
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
