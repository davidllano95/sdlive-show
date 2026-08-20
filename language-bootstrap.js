(() => {
  if (window.SDLIVE_LANGUAGE_BOOTSTRAP) return;
  window.SDLIVE_LANGUAGE_BOOTSTRAP = true;

  const KEY = "sdlive-language-preference";

  function normalize(value) {
    return value === "es" || value === "en" ? value : null;
  }

  function readLocal() {
    try {
      return normalize(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  }

  function writeLocal(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // Cookie + runtime language still work when localStorage is unavailable.
    }
  }

  function readCookie() {
    const parts = document.cookie ? document.cookie.split(";") : [];

    for (const part of parts) {
      const [rawName, ...rawValueParts] = part.trim().split("=");
      if (rawName !== KEY) continue;

      const rawValue = rawValueParts.join("=");

      try {
        return normalize(decodeURIComponent(rawValue));
      } catch {
        return normalize(rawValue);
      }
    }

    return null;
  }

  function writeCookie(lang) {
    document.cookie =
      `${KEY}=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function detectBrowserLanguage() {
    const languages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

    const primary = languages.find(Boolean) || "en";
    return String(primary).toLowerCase().startsWith("es") ? "es" : "en";
  }

  const local = readLocal();
  const cookie = readCookie();
  const preferred = local || cookie || detectBrowserLanguage();
  const serverLanguage = normalize(
    document.documentElement.dataset.serverLanguage
  );

  // Keep both persistence mechanisms aligned. The Worker can read the cookie on
  // the next request, while the existing client language runtime keeps using
  // localStorage as its primary browser-side preference.
  if (!local) writeLocal(preferred);
  writeCookie(preferred);

  document.documentElement.lang = preferred;
  document.documentElement.dataset.initialLanguage = preferred;

  // Existing users may have a localStorage preference from before the edge
  // language cookie existed. Hide only that one mismatched first response until
  // the normal client translator has run, preventing an English->Spanish flash.
  let mismatchStyle = null;

  if (serverLanguage && serverLanguage !== preferred) {
    document.documentElement.dataset.languageMismatch = "true";
    mismatchStyle = document.createElement("style");
    mismatchStyle.id = "sdlive-language-mismatch-guard";
    mismatchStyle.textContent =
      'html[data-language-mismatch="true"] body{visibility:hidden!important;}';
    document.head.appendChild(mismatchStyle);

    window.addEventListener(
      "DOMContentLoaded",
      () => {
        window.setTimeout(() => {
          delete document.documentElement.dataset.languageMismatch;
          mismatchStyle?.remove();
        }, 0);
      },
      { once: true }
    );
  }

  // Persist the choice before the site's requestAnimationFrame language change
  // runs, so an immediate refresh already reaches the Worker with the new locale.
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("#langEn, #langEs");
      if (!button) return;

      const next = button.id === "langEs" ? "es" : "en";
      writeCookie(next);
    },
    true
  );
})();
