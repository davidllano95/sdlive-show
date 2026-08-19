(() => {
  const esButton = document.getElementById("policyEs");
  const enButton = document.getElementById("policyEn");
  const esContent = document.getElementById("policyEsContent");
  const enContent = document.getElementById("policyEnContent");

  if (!esButton || !enButton || !esContent || !enContent) return;

  function setLanguage(language) {
    const spanish = language === "es";

    document.documentElement.lang = spanish ? "es-CO" : "en";
    esButton.setAttribute("aria-pressed", String(spanish));
    enButton.setAttribute("aria-pressed", String(!spanish));
    esContent.hidden = !spanish;
    enContent.hidden = spanish;

    try {
      localStorage.setItem(
        "sdlive-language-preference",
        spanish ? "es" : "en"
      );
    } catch {
      // Language selection still applies for the current page.
    }
  }

  esButton.addEventListener("click", () => setLanguage("es"));
  enButton.addEventListener("click", () => setLanguage("en"));

  let initialLanguage = "es";

  try {
    const stored = localStorage.getItem("sdlive-language-preference");
    if (stored === "en" || stored === "es") initialLanguage = stored;
  } catch {
    // Keep the Spanish default.
  }

  setLanguage(initialLanguage);
})();
