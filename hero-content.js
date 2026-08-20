(() => {
  if (window.SDLIVE_HERO_CONTENT_BINDING) return;
  window.SDLIVE_HERO_CONTENT_BINDING = true;

  const HERO_ENDPOINT = "/api/content/hero";
  let publishedContent = null;
  let publishedAt = "";
  let languageObserver = null;

  function isAdminPreview() {
    try {
      return window.self !== window.top &&
        window.frameElement?.id === "sitePreview" &&
        String(window.parent.location.pathname || "").startsWith("/admin/");
    } catch {
      return false;
    }
  }

  function isLocalizedText(value) {
    return Boolean(value) &&
      typeof value === "object" &&
      typeof value.en === "string" &&
      typeof value.es === "string";
  }

  function isInternalAnchor(value) {
    return typeof value === "string" &&
      /^#[A-Za-z][\w:-]*$/.test(value);
  }

  function isValidHeroContent(content) {
    if (!content || typeof content !== "object") return false;

    if (
      !isLocalizedText(content.headline?.line1) ||
      !isLocalizedText(content.headline?.line2) ||
      !isLocalizedText(content.headline?.accent) ||
      !isLocalizedText(content.lede) ||
      !isLocalizedText(content.actions?.primary?.label) ||
      !isLocalizedText(content.actions?.secondary?.label) ||
      !isInternalAnchor(content.actions?.primary?.href) ||
      !isInternalAnchor(content.actions?.secondary?.href) ||
      !Array.isArray(content.stats) ||
      content.stats.length !== 4
    ) {
      return false;
    }

    return content.stats.every((stat) =>
      isLocalizedText(stat?.value) &&
      isLocalizedText(stat?.label)
    );
  }

  function currentLanguage() {
    return String(document.documentElement.lang || "en")
      .toLowerCase()
      .startsWith("es")
      ? "es"
      : "en";
  }

  function setCmsText(element, localized, lang) {
    if (!element || !isLocalizedText(localized)) return false;

    // Once the CMS is active, keep these nodes out of the site's generic
    // data-en/data-es innerHTML renderer. CMS copy is always treated as text.
    element.removeAttribute("data-en");
    element.removeAttribute("data-es");
    element.textContent = localized[lang];
    return true;
  }

  function renderPublishedHero() {
    if (!publishedContent) return false;

    const hero = document.getElementById("hero");
    if (!hero) return false;

    const headlineSpans = hero.querySelectorAll("h1 > span");
    const accent = hero.querySelector("h1 > em");
    const lede = hero.querySelector(".hero-lede");
    const primary = hero.querySelector(".hero-actions .btn-primary");
    const secondary = hero.querySelector(".hero-actions .btn-ghost");
    const stats = [...hero.querySelectorAll(".hero-stats .stat-card")];

    if (
      headlineSpans.length < 2 ||
      !accent ||
      !lede ||
      !primary ||
      !secondary ||
      stats.length !== 4
    ) {
      return false;
    }

    const lang = currentLanguage();

    setCmsText(headlineSpans[0], publishedContent.headline.line1, lang);
    setCmsText(headlineSpans[1], publishedContent.headline.line2, lang);
    setCmsText(accent, publishedContent.headline.accent, lang);
    setCmsText(lede, publishedContent.lede, lang);
    setCmsText(primary, publishedContent.actions.primary.label, lang);
    setCmsText(secondary, publishedContent.actions.secondary.label, lang);

    primary.setAttribute("href", publishedContent.actions.primary.href);
    secondary.setAttribute("href", publishedContent.actions.secondary.href);

    stats.forEach((card, index) => {
      const stat = publishedContent.stats[index];
      setCmsText(card.querySelector(".stat-value"), stat.value, lang);
      setCmsText(card.querySelector(".stat-label"), stat.label, lang);
    });

    hero.dataset.contentSource = "cms";
    if (publishedAt) {
      hero.dataset.cmsPublishedAt = publishedAt;
    }

    if (typeof window.styleBrandMentions === "function") {
      window.styleBrandMentions(hero);
    }

    return true;
  }

  function observeLanguageChanges() {
    if (languageObserver || !("MutationObserver" in window)) return;

    languageObserver = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === "lang")) {
        renderPublishedHero();
      }
    });

    languageObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });
  }

  async function loadPublishedHero() {
    try {
      const response = await fetch(HERO_ENDPOINT, {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Hero API returned ${response.status}`);
      }

      const data = await response.json();

      if (
        data?.ok !== true ||
        data?.section !== "hero" ||
        !isValidHeroContent(data.content)
      ) {
        throw new Error("Hero API returned invalid published content");
      }

      publishedContent = data.content;
      publishedAt = typeof data.publishedAt === "string"
        ? data.publishedAt
        : "";

      if (!renderPublishedHero()) {
        throw new Error("Home Hero markup is not compatible with CMS content");
      }

      observeLanguageChanges();
    } catch (error) {
      // The static HTML is the deliberate fallback and remains fully usable.
      console.warn(
        "[SD.Live] Published Hero unavailable; using static fallback.",
        error
      );
    }
  }

  function init() {
    if (isAdminPreview()) return;
    void loadPublishedHero();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
