/* =============================================
   SD.Live — SITE CONFIG
   CLIENT CONTENT CAN BE CHANGED HERE
   Contact info, rates and brand strings live in
   this object so they never need to be hunted
   down inside the HTML.
============================================= */

const SITE_CONFIG = {
  brand: {
    name: "SD.Live",
    descriptor: "Creative Audio"
  },

  contact: {
    email: "hello@sdlive.show",
    whatsapp: "573192473948", // digits only: country code + number, no + or spaces
    whatsappUsername: "samd.llano95",
    instagram: "https://www.instagram.com/samd.llano95/",
    linkedin: "https://www.linkedin.com/in/samuel-david-llano-83b484120/"
  },

  // Connect this to a private server endpoint that reads your work calendar.
  // Expected response: { "active": true, "location": "Cartagena, Colombia" }
  // or { "active": true, "location": "Cruise ship: [SHIP NAME]" }.
  workCalendar: {
    statusEndpoint: "",
    refreshMs: 60000,
    fallbackLocation: "Bogotá, Colombia"
  },

  // Reach map. Coordinates are percentages (0-100) of the equirectangular
  // world map. controlX/controlY shape the curved route from Colombia.
  travelOrigin: {
    en: "South America",
    es: "Sudamérica",
    x: 26.3,
    y: 61,
    labelDx: 10,
    labelDy: 19,
    anchor: "start"
  },
  travelPoints: [
    { en: "North America", es: "Norteamérica", x: 25.8, y: 40, controlX: 23, controlY: 49, labelDx: 10, labelDy: -10, anchor: "start" },
    { en: "North America", es: "Norteamérica", x: 13.8, y: 33, controlX: 18, controlY: 48, labelDx: 10, labelDy: -10, anchor: "start" },
    { en: "Oceania", es: "Oceanía", x: 87.2, y: 81.5, controlX: 57, controlY: 90, labelDx: -10, labelDy: -10, anchor: "end" },
    { en: "Asia", es: "Asia", x: 73.2, y: 62.2, controlX: 52, controlY: 76, labelDx: 10, labelDy: -10, anchor: "start" },
    { en: "Europe", es: "Europa", x: 45, y: 40.2, controlX: 35, controlY: 50, labelDx: 10, labelDy: -10, anchor: "start" },
    { en: "Africa", es: "África", x: 43.8, y: 46.2, controlX: 34, controlY: 54, labelDx: 10, labelDy: 18, anchor: "start" }
  ]
};

const RENTAL_PRICING = {
  customQuoteAfterDays: 15,
  rates: {
    betaThree: { dayOne: 300000, additionalDayMultiplier: 0.7 },
    akg: { dayOne: 80000, additionalDayMultiplier: 1 },
    phenyx: { dayOne: 80000, additionalDayMultiplier: 1 },
    flow8: { dayOne: 200000, additionalDayMultiplier: 1 },
    lv1ClassicSolo: { dayOne: 2700000, additionalDayMultiplier: 1, fixedDaily: true },
    lv1StageGridBundle: { dayOne: 3000000, additionalDayMultiplier: 1, fixedDaily: true },
    dl32: { dayOne: 250000, additionalDayMultiplier: 0.7 },
    stageGrid4000: { dayOne: 500000, additionalDayMultiplier: 1, fixedDaily: true },
    wingWithDl32: { dayOne: 500000, additionalDayMultiplier: 0.7 },
    wingStandalone: { dayOne: 300000, additionalDayMultiplier: 0.7 },
    labeler: { dayOne: 50000, additionalDayMultiplier: 1 },
    videoServer: { dayOne: 400000, additionalDayMultiplier: 0.7 },
    portableMonitor: { dayOne: 80000, additionalDayMultiplier: 1 },
    soundEngineer: { dayOne: 350000, additionalDayMultiplier: 1 }
  }
};

/* =============================================
   SD.Live — SUPPORT CONFIG
   Tunable interaction values referenced instead
   of magic numbers scattered through the code.
============================================= */

const UI_CONFIG = {
  tilt: {
    enabled: true,
    maxRotation: 8,
    perspective: 1200
  },
  parallax: {
    enabled: true,
    strength: 1
  },
  cursorGlow: {
    enabled: true
  },
  marquee: { enabled: true }
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const marqueePauseBoundTracks = new WeakSet();
const LANGUAGE_STORAGE_KEY = "sdlive-language-preference";

document.addEventListener("DOMContentLoaded", () => {
  initMarket();
  initLanguage();
  initNavigation();
  initScrollProgress();
  initBackToTop();
  initReveal();
  initTilt();
  initCursorGlow();
  initConstellation();
  initServiceFilter();
  initAudioAB();
  initRentalQuoteBuilder();
  initTrustedMarquees();
  initShowDayMode();
  initWorkCalendar();
  initContactForm();
  applyContactConfig();
});

function detectMarket() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const hasColombianLocale = languages.some((language) => /^es-CO(?:$|-)/i.test(language || ""));

  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    // Keep the privacy-friendly international default when the timezone is unavailable.
  }

  return hasColombianLocale || timeZone === "America/Bogota" ? "colombia" : "international";
}

function initMarket() {
  const root = document.documentElement;

  root.dataset.market = detectMarket();

  const activateRentalIntent = () => {
    if (window.location.hash.toLowerCase() !== "#rental") {
      return;
    }

    root.dataset.rentalIntent = "true";

    requestAnimationFrame(() => {
      document
        .getElementById("rental")
        ?.scrollIntoView({
          block: "start",
          behavior: "auto"
        });
    });
  };

  activateRentalIntent();

  window.addEventListener(
    "hashchange",
    activateRentalIntent
  );
}

function initTrustedMarquees() {
  if (!UI_CONFIG.marquee.enabled || prefersReducedMotion) return;

  const marquees = Array.from(document.querySelectorAll("[data-marquee]"));
  const supportsVisibilityObserver = "IntersectionObserver" in window;

  marquees.forEach((marquee) => {
    marquee.dataset.inViewport = String(!supportsVisibilityObserver);
    marquee.dataset.interactionPaused = "false";
    buildTrustedMarquee(marquee);
  });

  if (!supportsVisibilityObserver) return;
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.dataset.inViewport = String(entry.isIntersecting);
      updateTrustedMarqueePlayback(entry.target);
    });
  }, { threshold: 0.01 });
  marquees.forEach((marquee) => visibilityObserver.observe(marquee));
}

function updateTrustedMarqueePlayback(marquee) {
  const track = marquee.querySelector(".trusted-track");
  if (!track) return;
  const shouldPlay = marquee.dataset.inViewport === "true"
    && marquee.dataset.interactionPaused !== "true";
  track.getAnimations().forEach((animation) => {
    if (shouldPlay) animation.play();
    else animation.pause();
  });
}

function buildTrustedMarquee(marquee) {
  const track = marquee.querySelector(".trusted-track");
  const set = track?.querySelector(".trusted-set");
  if (!track || !set || track.children.length > 1) return null;

  const originalItems = Array.from(set.children);
  const minimumSetWidth = Math.max(window.innerWidth * 1.15, 1400);
  while (set.scrollWidth < minimumSetWidth) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      set.appendChild(clone);
    });
  }

  const duplicateSet = set.cloneNode(true);
  duplicateSet.setAttribute("aria-hidden", "true");
  const trailingSet = set.cloneNode(true);
  trailingSet.setAttribute("aria-hidden", "true");
  track.append(duplicateSet, trailingSet);

  const pauseAtCurrentPosition = () => {
    marquee.dataset.interactionPaused = "true";
    updateTrustedMarqueePlayback(marquee);
  };

  const resumeFromCurrentPosition = () => {
    marquee.dataset.interactionPaused = "false";
    updateTrustedMarqueePlayback(marquee);
  };

  if (!marqueePauseBoundTracks.has(track)) {
    marqueePauseBoundTracks.add(track);
    const pauseRegion = marquee.closest(".trusted-wrap") || marquee;
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (hoverCapable) {
      // Desktop / trackpad: leaving upward or sideways closes immediately.
      // Leaving through the bottom gives a brief bridge to the associated brands.
      const revealById = new Map(
        Array.from(pauseRegion.querySelectorAll(".supported-reveal[id]")).map((reveal) => [reveal.id, reveal])
      );
      let closeTimer = 0;

      const cancelScheduledClose = () => {
        if (!closeTimer) return;
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      };

      const clearDesktopReveal = () => {
        cancelScheduledClose();
        resumeFromCurrentPosition();
        setSupportedBrandsReveal(marquee, null);
      };

      const scheduleDownwardClose = () => {
        cancelScheduledClose();
        closeTimer = window.setTimeout(clearDesktopReveal, 320);
      };

      marquee.querySelectorAll(".client-strip-card[data-supported-reveal]").forEach((card) => {
        const reveal = revealById.get(card.dataset.supportedReveal || "");

        card.addEventListener("pointerenter", () => {
          cancelScheduledClose();
          pauseAtCurrentPosition();
          setSupportedBrandsReveal(marquee, card);
        });

        card.addEventListener("pointerleave", (event) => {
          const rect = card.getBoundingClientRect();
          const leftThroughBottom = event.clientY >= rect.bottom - 3;
          const nextCard = event.relatedTarget?.closest?.(".client-strip-card[data-supported-reveal]");
          if (nextCard && marquee.contains(nextCard)) return;
          if (reveal?.contains(event.relatedTarget)) return;
          if (leftThroughBottom) {
            scheduleDownwardClose();
            return;
          }
          clearDesktopReveal();
        });

        if (reveal && !reveal.dataset.hoverBridgeBound) {
          reveal.dataset.hoverBridgeBound = "true";
          reveal.addEventListener("pointerenter", () => {
            cancelScheduledClose();
            pauseAtCurrentPosition();
          });
          reveal.addEventListener("pointerleave", (event) => {
            const nextCard = event.relatedTarget?.closest?.(".client-strip-card[data-supported-reveal]");
            if (nextCard && marquee.contains(nextCard)) return;
            clearDesktopReveal();
          });
        }
      });

      marquee.addEventListener("focusin", (event) => {
        const card = event.target.closest?.(".client-strip-card");
        if (card) pauseAtCurrentPosition();
        setSupportedBrandsReveal(marquee, card);
      });

      pauseRegion.addEventListener("focusout", (event) => {
        if (pauseRegion.contains(event.relatedTarget)) return;
        clearDesktopReveal();
      });
    } else {
      // Touch: use deliberate tap-to-toggle behavior. Pointerover/pointerleave are
      // intentionally avoided because iOS Safari emulates sticky hover states.
      marquee.addEventListener("click", (event) => {
        const card = event.target.closest?.(".client-strip-card");
        if (!card) return;

        const revealId = card.dataset.supportedReveal || "";
        const activeRevealId = pauseRegion.querySelector(".supported-reveal.is-active")?.id || "";

        if (!revealId) {
          setSupportedBrandsReveal(marquee, null);
          resumeFromCurrentPosition();
          return;
        }

        if (activeRevealId === revealId) {
          setSupportedBrandsReveal(marquee, null);
          resumeFromCurrentPosition();
          return;
        }

        pauseAtCurrentPosition();
        setSupportedBrandsReveal(marquee, card);
      });

      document.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" || pauseRegion.contains(event.target)) return;
        setSupportedBrandsReveal(marquee, null);
        resumeFromCurrentPosition();
      }, { passive: true });
    }
  }

  marquee.classList.add("is-ready");
  updateTrustedMarqueePlayback(marquee);
  return { marquee, track };
}

function setSupportedBrandsReveal(marquee, card) {
  const revealId = card?.dataset.supportedReveal || "";
  const revealRegion = marquee.closest(".trusted-wrap") || document;

  revealRegion.querySelectorAll(".supported-reveal").forEach((reveal) => {
    const isActive = reveal.id === revealId;
    reveal.classList.toggle("is-active", isActive);
    reveal.setAttribute("aria-hidden", String(!isActive));
  });

  // Keep the selected company visually explicit, including duplicated marquee cards.
  marquee.querySelectorAll(".client-strip-card[data-supported-reveal]").forEach((item) => {
    const isActive = Boolean(revealId) && item.dataset.supportedReveal === revealId;
    item.classList.toggle("is-reveal-active", isActive);
    item.setAttribute("aria-expanded", String(isActive));
  });
}

function prepareMarqueesForLanguageChange() {
  return Array.from(document.querySelectorAll("[data-marquee]")).flatMap((marquee) => {
    if (!marquee.classList.contains("is-ready")) return [];

    const track = marquee.querySelector(".trusted-track");
    const animation = track?.getAnimations()[0];
    if (!track || !animation || animation.currentTime === null) return [];

    const state = {
      marquee,
      track,
      currentTime: animation.currentTime,
      wasPaused: animation.playState === "paused"
    };

    animation.pause();
    marquee.classList.remove("is-ready");
    while (track.children.length > 1) track.lastElementChild.remove();
    return [state];
  });
}

function restoreMarqueesAfterLanguageChange(states) {
  states.forEach(({ marquee, track, currentTime, wasPaused }) => {
    buildTrustedMarquee(marquee);
    const animation = track.getAnimations()[0];
    if (!animation) return;

    animation.currentTime = currentTime;
    if (wasPaused) animation.pause();
    else updateTrustedMarqueePlayback(marquee);
  });
}

/* =============================================
   Language
============================================= */

function createBrandWordmarkText() {
  const wordmark = document.createElement("span");
  wordmark.className = "brand-wordmark-text";
  wordmark.setAttribute("aria-label", "SD.Live");
  wordmark.append(document.createTextNode("SD"));

  const dot = document.createElement("span");
  dot.className = "brand-wordmark-text__dot";
  dot.setAttribute("aria-hidden", "true");
  dot.textContent = ".";

  wordmark.append(dot, document.createTextNode("Live"));
  return wordmark;
}

function styleBrandMentions(root = document.body) {
  if (!root) return;

  const matches = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.includes("SD.Live")) return NodeFilter.FILTER_REJECT;

      const parent = node.parentElement;
      if (!parent || parent.closest(".brand-wordmark-text, script, style, textarea, noscript, svg")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) matches.push(walker.currentNode);

  matches.forEach((textNode) => {
    const parts = textNode.nodeValue.split("SD.Live");
    const fragment = document.createDocumentFragment();

    parts.forEach((part, index) => {
      if (part) fragment.append(document.createTextNode(part));
      if (index < parts.length - 1) fragment.append(createBrandWordmarkText());
    });
    textNode.replaceWith(fragment);
  });
}

function detectPreferredLanguage(languages = navigator.languages?.length ? navigator.languages : [navigator.language]) {
  const primaryLanguage = languages.find(Boolean) || "en";
  return primaryLanguage.toLowerCase().startsWith("es") ? "es" : "en";
}

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "es" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

function storeLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // The language still changes when browser privacy settings disable storage.
  }
}

let languageScrollRestoreToken = 0;
let languageRequestFrame = 0;
let pendingLanguage = null;
let languageVisualLock = null;

function beginLanguageVisualLock() {
  const root = document.documentElement;
  if (!languageVisualLock) {
    languageVisualLock = {
      scrollBehavior: root.style.scrollBehavior,
      overflowAnchor: root.style.overflowAnchor
    };
  }
  root.classList.add("is-language-switching");
  root.style.scrollBehavior = "auto";
  root.style.overflowAnchor = "none";
}

function releaseLanguageVisualLock(token) {
  if (token !== languageScrollRestoreToken || !languageVisualLock) return;
  const root = document.documentElement;
  root.style.scrollBehavior = languageVisualLock.scrollBehavior;
  root.style.overflowAnchor = languageVisualLock.overflowAnchor;
  root.classList.remove("is-language-switching");
  languageVisualLock = null;
}

function captureLanguageScrollAnchor() {
  if (window.scrollY < 2 || typeof document.elementsFromPoint !== "function") return null;

  const headerHeight = document.getElementById("siteHeader")?.getBoundingClientRect().height || 76;
  const probeY = Math.min(window.innerHeight - 1, headerHeight + 18);
  const anchorSelector = [
    ".equipment-card",
    ".service-card",
    ".work-card",
    ".log-card",
    ".insight-card",
    ".testimonial-card",
    ".rental-config-card",
    ".rental-quote-builder",
    ".international-quote-panel",
    ".constellation-canvas",
    ".about-copy",
    ".about-photo",
    ".section-head",
    "section[id]"
  ].join(",");

  const anchor = document.elementsFromPoint(window.innerWidth / 2, probeY)
    .map((element) => element.closest?.(anchorSelector))
    .find(Boolean);
  if (!anchor) return null;

  return { element: anchor, top: anchor.getBoundingClientRect().top };
}

function restoreLanguageScrollAnchor(snapshot, token) {
  const correctPosition = () => {
    if (!snapshot || token !== languageScrollRestoreToken || !snapshot.element.isConnected) return;
    const delta = snapshot.element.getBoundingClientRect().top - snapshot.top;
    if (Math.abs(delta) < 0.5) return;
    window.scrollBy(0, delta);
  };

  correctPosition();
  requestAnimationFrame(() => {
    correctPosition();
    releaseLanguageVisualLock(token);
  });
}

function requestLanguageChange(lang) {
  pendingLanguage = lang === "es" ? "es" : "en";
  if (languageRequestFrame) return;
  languageRequestFrame = requestAnimationFrame(() => {
    languageRequestFrame = 0;
    const nextLanguage = pendingLanguage;
    pendingLanguage = null;
    setLanguage(nextLanguage);
  });
}

function initLanguage() {
  const initialLang = readStoredLanguage() || detectPreferredLanguage();
  setLanguage(initialLang, { persist: false });

  document.getElementById("langEn").addEventListener("click", () => requestLanguageChange("en"));
  document.getElementById("langEs").addEventListener("click", () => requestLanguageChange("es"));
}

function setLanguage(lang, { persist = true } = {}) {
  const safeLang = lang === "es" ? "es" : "en";
  if (persist && document.documentElement.lang === safeLang) return;
  const scrollAnchor = persist ? captureLanguageScrollAnchor() : null;
  const scrollRestoreToken = ++languageScrollRestoreToken;
  beginLanguageVisualLock();
  const marqueeAnimationState = prepareMarqueesForLanguageChange();

  document.documentElement.lang = safeLang;
  if (persist) storeLanguage(safeLang);

  document.querySelectorAll("[data-en]").forEach((el) => {
    const value = el.getAttribute(safeLang === "es" ? "data-es" : "data-en");
    if (value !== null && el.innerHTML !== value) {
      // Allow simple inline <strong> tags authored in data attributes.
      el.innerHTML = value;
    }
  });

  document.querySelectorAll("[data-en-placeholder]").forEach((el) => {
    const value = el.getAttribute(safeLang === "es" ? "data-es-placeholder" : "data-en-placeholder");
    if (value !== null) el.setAttribute("placeholder", value);
  });

  document.querySelectorAll("[data-en-aria]").forEach((el) => {
    const value = el.getAttribute(safeLang === "es" ? "data-es-aria" : "data-en-aria");
    if (value !== null) el.setAttribute("aria-label", value);
  });

  document.querySelectorAll("[data-en-href]").forEach((el) => {
    const value = el.getAttribute(safeLang === "es" ? "data-es-href" : "data-en-href");
    if (value !== null) el.setAttribute("href", value);
  });

  const langEn = document.getElementById("langEn");
  const langEs = document.getElementById("langEs");
  if (langEn && langEs) {
    langEn.setAttribute("aria-pressed", String(safeLang === "en"));
    langEs.setAttribute("aria-pressed", String(safeLang === "es"));
  }

  // Re-render dynamic widgets whose labels depend on language.
  if (window.__renderRentalQuote) window.__renderRentalQuote();
  if (window.__renderShowDayMode) window.__renderShowDayMode();
  if (window.__renderConstellationLabels) window.__renderConstellationLabels();

  styleBrandMentions();

  restoreMarqueesAfterLanguageChange(marqueeAnimationState);
  restoreLanguageScrollAnchor(scrollAnchor, scrollRestoreToken);
}

/* =============================================
   Navigation
============================================= */

function initNavigation() {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("navToggle");

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* =============================================
   Scroll progress + reveal
============================================= */

function initScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + "%";
  }, { passive: true });
}

function initBackToTop() {
  const button = document.getElementById("backToTop");
  if (!button) return;

  const updateVisibility = () => {
    button.classList.toggle("is-visible", window.scrollY > 520);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((el) => observer.observe(el));
}

/* =============================================
   Tilt (pointer:fine only)
============================================= */

function initTilt() {
  if (!UI_CONFIG.tilt.enabled || prefersReducedMotion) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const targets = document.querySelectorAll("[data-tilt]");
  const max = UI_CONFIG.tilt.maxRotation;

  targets.forEach((el) => {
    el.style.perspective = UI_CONFIG.tilt.perspective + "px";

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  });
}

/* =============================================
   Parallax (aurora ambient drift on scroll)
============================================= */

function initCursorGlow() {
  if (!UI_CONFIG.cursorGlow.enabled || prefersReducedMotion) return;
  const glow = document.getElementById("cursorGlow");
  if (!window.matchMedia("(pointer: fine)").matches) {
    glow.style.display = "none";
    return;
  }
  window.addEventListener("mousemove", (e) => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  }, { passive: true });
}

/* =============================================
   Reach map ("Where our audio has traveled")
============================================= */

function initConstellation() {
  const linesGroup = document.getElementById("constellationLines");
  const pointsGroup = document.getElementById("constellationPoints");
  const tooltip = document.getElementById("constellationTooltip");
  const canvas = document.getElementById("constellationCanvas");
  if (!linesGroup || !pointsGroup || !tooltip || !canvas) return;

  const origin = SITE_CONFIG.travelOrigin;
  const points = SITE_CONFIG.travelPoints;

  const svgNS = "http://www.w3.org/2000/svg";
  const toSvgCoords = (pt) => ({ x: (pt.x / 100) * 1000, y: (pt.y / 100) * 500 });
  const originCoords = toSvgCoords(origin);
  const labelFor = (pt) => pt[document.documentElement.lang === "es" ? "es" : "en"];

  linesGroup.replaceChildren();
  pointsGroup.replaceChildren();

  // Every route starts in Colombia and bends independently toward its destination.
  points.forEach((pt, index) => {
    const destination = toSvgCoords(pt);
    const control = toSvgCoords({ x: pt.controlX, y: pt.controlY });
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M ${originCoords.x} ${originCoords.y} Q ${control.x} ${control.y} ${destination.x} ${destination.y}`);
    path.setAttribute("class", "conn-line");
    linesGroup.appendChild(path);
    path.style.animationDelay = `${index * -3.8}s`;
  });

  const renderedLocations = [];

  [{ ...origin, isOrigin: true }, ...points].forEach((pt) => {
    const coords = toSvgCoords(pt);
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", `constellation-location${pt.isOrigin ? " constellation-location--origin" : ""}`);

    if (pt.isOrigin) {
      const ring = document.createElementNS(svgNS, "circle");
      ring.setAttribute("cx", coords.x);
      ring.setAttribute("cy", coords.y);
      ring.setAttribute("r", 12);
      ring.setAttribute("class", "constellation-origin-ring");
      group.appendChild(ring);
    }

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", coords.x);
    circle.setAttribute("cy", coords.y);
    circle.setAttribute("r", pt.isOrigin ? 8 : 5.5);
    circle.setAttribute("class", `constellation-point${pt.isOrigin ? " constellation-point--origin" : ""}`);
    circle.setAttribute("tabindex", "0");
    circle.setAttribute("role", "button");

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", coords.x + (pt.labelDx || 0));
    label.setAttribute("y", coords.y + (pt.labelDy || 0));
    label.setAttribute("text-anchor", pt.anchor || "start");
    label.setAttribute("class", "constellation-label");

    const showTooltip = () => {
      const rect = canvas.getBoundingClientRect();
      const left = (coords.x / 1000) * rect.width;
      const top = (coords.y / 500) * rect.height;
      tooltip.textContent = labelFor(pt);
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
      tooltip.classList.add("is-visible");
    };
    const hideTooltip = () => tooltip.classList.remove("is-visible");

    circle.addEventListener("mouseenter", showTooltip);
    circle.addEventListener("mouseleave", hideTooltip);
    circle.addEventListener("focus", showTooltip);
    circle.addEventListener("blur", hideTooltip);

    group.appendChild(circle);
    group.appendChild(label);
    pointsGroup.appendChild(group);
    renderedLocations.push({ pt, circle, label });
  });

  window.__renderConstellationLabels = () => {
    renderedLocations.forEach(({ pt, circle, label }) => {
      const localizedLabel = labelFor(pt);
      circle.setAttribute("aria-label", localizedLabel);
      label.textContent = localizedLabel;
    });
  };

  window.__renderConstellationLabels();
}

/* =============================================
   Service filter
============================================= */

function initServiceFilter() {
  const buttons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".service-card");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");

      const filter = btn.getAttribute("data-filter");
      cards.forEach((card) => {
        const categories = card.getAttribute("data-category") || "";
        const match = filter === "all" || categories.split(" ").includes(filter);
        card.classList.toggle("is-hidden", !match);
      });
    });
  });
}

/* =============================================
   Staged audio A/B
   The markup stays inert until real source paths
   replace the bracketed placeholders.
============================================= */

function initAudioAB() {
  const audio = document.getElementById("abAudio");
  const source = document.getElementById("abSource");
  const rawBtn = document.getElementById("abRaw");
  const mixedBtn = document.getElementById("abMixed");
  const playBtn = document.getElementById("abPlayBtn");
  const playIcon = document.getElementById("abPlayIcon");
  const pauseIcon = document.getElementById("abPauseIcon");
  const waveform = document.getElementById("waveform");
  const scrub = document.getElementById("abScrub");
  const scrubFill = document.getElementById("abScrubFill");
  const timeLabel = document.getElementById("abTime");

  if (!audio || !source || !rawBtn || !mixedBtn || !playBtn || !scrub || !scrubFill || !timeLabel) return;

  const sources = {
    raw: audio.dataset.rawSrc || "",
    mixed: audio.dataset.mixedSrc || ""
  };
  const ready = Object.values(sources).every((path) => path && !path.includes("["));
  if (!ready) {
    playBtn.disabled = true;
    rawBtn.disabled = true;
    mixedBtn.disabled = true;
    return;
  }

  source.src = sources.raw;
  audio.load();
  playBtn.disabled = false;
  rawBtn.disabled = false;
  mixedBtn.disabled = false;
  scrub.tabIndex = 0;

  function switchVersion(version) {
    const wasPlaying = !audio.paused;
    const currentTime = audio.currentTime;
    audio.pause();
    source.src = sources[version];
    audio.load();
    audio.addEventListener("loadedmetadata", function resume() {
      audio.currentTime = Math.min(currentTime, audio.duration || currentTime);
      if (wasPlaying) audio.play().catch(() => {});
      audio.removeEventListener("loadedmetadata", resume);
    });
    rawBtn.setAttribute("aria-pressed", String(version === "raw"));
    mixedBtn.setAttribute("aria-pressed", String(version === "mixed"));
  }

  rawBtn.addEventListener("click", () => switchVersion("raw"));
  mixedBtn.addEventListener("click", () => switchVersion("mixed"));
  playBtn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  audio.addEventListener("play", () => {
    if (playIcon) playIcon.style.display = "none";
    if (pauseIcon) pauseIcon.style.display = "block";
    waveform?.classList.add("is-playing");
  });
  audio.addEventListener("pause", () => {
    if (playIcon) playIcon.style.display = "block";
    if (pauseIcon) pauseIcon.style.display = "none";
    waveform?.classList.remove("is-playing");
  });
  audio.addEventListener("timeupdate", () => {
    const percentage = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    scrubFill.style.width = `${percentage}%`;
    scrub.setAttribute("aria-valuenow", String(Math.round(percentage)));
    const minutes = Math.floor(audio.currentTime / 60);
    const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
    timeLabel.textContent = `${minutes}:${seconds}`;
  });
  scrub.addEventListener("click", (event) => {
    if (!audio.duration) return;
    const rect = scrub.getBoundingClientRect();
    audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
  });
  scrub.addEventListener("keydown", (event) => {
    if (!audio.duration) return;
    if (event.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
}

/* =============================================
   Rental quote builder
============================================= */

function initRentalQuoteBuilder() {
  const form = document.getElementById("rentalQuoteBuilder");
  if (!form) return;

  const fields = {
         name: document.getElementById("quoteName"),
    email: document.getElementById("quoteEmail"),
    eventType: document.getElementById("quoteEventType"),
    venue: document.getElementById("quoteVenue"),
    date: document.getElementById("quoteDate"),
    days: document.getElementById("quoteDays"),
    attendees: document.getElementById("quoteAttendees"),
    wing: document.getElementById("quoteWing"),
    flow8: document.getElementById("quoteFlow8"),
    lv1: document.getElementById("quoteLv1"),
    dl32: document.getElementById("quoteDl32"),
    stageGrid: document.getElementById("quoteStageGrid"),
    handhelds: document.getElementById("quoteHandhelds"),
    headsets: document.getElementById("quoteHeadsets"),
    pa: document.getElementById("quotePa"),
    labeler: document.getElementById("quoteLabeler"),
    videoServer: document.getElementById("quoteVideoServer"),
    streaming: document.getElementById("quoteStreaming"),
    monitor: document.getElementById("quoteMonitor"),
    engineering: document.getElementById("quoteEngineering"),
    delivery: document.getElementById("quoteDelivery"),
    notes: document.getElementById("quoteNotes")
  };

  const modal = document.getElementById("rentalCartModal");
  const cartToggle = document.getElementById("rentalCartToggle");
  const cartClose = document.getElementById("rentalCartClose");
  const cartClear = document.getElementById("rentalCartClear");
  const cartLabel = document.getElementById("rentalCartLabel");
  const cartBackdrop = document.getElementById("rentalCartBackdrop");
  const cartCount = document.getElementById("rentalCartCount");
  const summaryTitle = document.getElementById("quoteSummaryTitle");
  const summaryList = document.getElementById("quoteSummaryList");
  const summaryWarning = document.getElementById("quoteSummaryWarning");
  const summaryPriceValue = document.getElementById("quotePriceValue");
  const summaryPriceDetail = document.getElementById("quotePriceDetail");
  const pricingNote = document.getElementById("quotePricingNote");
  const requestButton = document.getElementById("quoteRequestBtn");
  const presetButtons = Array.from(document.querySelectorAll("[data-rental-preset]"));
  const equipmentCards = Array.from(document.querySelectorAll("[data-rental-item]"));
  let activePreset = null;
  let closeTimer = 0;
  let previousCartUnits = 0;

  const cartItems = {
    wing: { field: "wing", max: 1 },
    flow8: { field: "flow8", max: 1 },
    lv1: { field: "lv1", max: 2 },
    dl32: { field: "dl32", max: 2 },
    stageGrid: { field: "stageGrid", max: 2 },
    handhelds: { field: "handhelds", max: 2 },
    headsets: { field: "headsets", max: 6 },
    pa: { field: "pa", max: 2 },
    labeler: { field: "labeler", max: 1 },
    videoServer: { field: "videoServer", max: 1 },
    monitor: { field: "monitor", max: 1 }
  };

  const copy = {
    en: {
      titles: { corporate: "Corporate Event", theater: "Theater / Live Performance", broadcast: "Broadcast / Streaming", other: "Custom Rental Configuration" },
      engineering: "Independent live sound engineer / operator",
      delivery: "Transport & setup",
      streaming: "Streaming service",
      technicalSupport: "Technical support for supplied equipment",
      included: "Included",
      warning: "The available PA is designed for events of up to 150 guests, subject to venue size, program and acoustic conditions. A larger or complementary system may be required.",
      wingIoWarning: "WING selected without a DL32: standalone I/O is limited to 8 XLR inputs with phantom power, 8 aux inputs, 8 XLR outputs and 8 aux outputs.",
      flowIoWarning: "FLOW 8 uses its onboard compact I/O: 8 input channels, phantom on mic inputs 1–2, paired stereo line inputs on CH 5/6 and 7/8, and USB audio with up to 10 recording tracks / 4 playback channels.",
      lv1IoWarning: "At least one LV1 Classic is running standalone: standalone I/O is 16 inputs / 12 outputs. Add StageGrid 4000 when the show requires additional stage I/O.",
      longTerm: "For rentals longer than 15 days, items with negotiable multi-day rates are reviewed by email.",
      handheld: "AKG WP-300 handheld wireless mic",
      headset: "Phenyx Pro PTU-71-2B headset channel",
      labeler: "Event labeler",
      videoServer: "Video server (gaming PC)",
      portableMonitor: "Portable monitor",
      lv1Classic: "LV1 Classic",
      lv1StageGridBundle: "LV1 Classic + 1 × StageGrid 4000",
      stageGrid4000: "StageGrid 4000",
      request: "Rental quote request",
      venue: "City / venue",
      date: "Event date",
      days: "Rental days",
      attendees: "Expected attendees",
      notes: "Notes",
      recommendation: "Rental cart",
      cartTitle: "Rental cart",
      emptyCart: "Your cart is empty. Add equipment with the + controls on the rental cards.",
      inCart: "{quantity} selected",
      add: "Add desired quantity",
      addAnother: "Add another",
      removeOne: "Remove one",
      maximum: "Maximum available",
      selected: "Selected",
      clearCart: "Clear cart",
      viewCart: "View cart",
      packages: {
        corporate: "Corporate Event Package",
        digital: "Digital Show Rig",
        theater: "Theater Wireless Rig",
        livePro: "Live Show Pro",
        fohMonPro: "FOH + MON Pro"
      },
      equipmentTotal: "Estimated rental & services total",
      customQuote: "Custom quote",
      quotedSeparately: "Quoted separately",
      negotiable: "To negotiate",
      oneDay: "1 rental day",
      multipleDays: "{days} rental days"
    },
    es: {
      titles: { corporate: "Evento corporativo", theater: "Teatro / espectáculo en vivo", broadcast: "Broadcast / streaming", other: "Configuración de alquiler a la medida" },
      engineering: "Ingeniero de sonido en vivo / operador independiente",
      delivery: "Transporte y montaje",
      streaming: "Servicio de streaming",
      technicalSupport: "Soporte técnico sobre los equipos suministrados",
      included: "Incluido",
      warning: "El PA disponible está pensado para eventos de hasta 150 personas, sujeto al tamaño del espacio, el programa y las condiciones acústicas. Puede ser necesario un sistema más grande o complementario.",
      wingIoWarning: "WING seleccionada sin DL32: el I/O standalone queda limitado a 8 entradas XLR con phantom, 8 entradas auxiliares, 8 salidas XLR y 8 salidas auxiliares.",
      flowIoWarning: "FLOW 8 usa su I/O compacto integrado: 8 canales de entrada, phantom en las entradas de micrófono 1–2, entradas de línea estéreo emparejadas en CH 5/6 y 7/8, y audio USB de hasta 10 pistas de grabación / 4 canales de reproducción.",
      lv1IoWarning: "Al menos una LV1 Classic está funcionando standalone: el I/O standalone es de 16 entradas / 12 salidas. Agrega StageGrid 4000 cuando el show requiera más I/O de escenario.",
      longTerm: "Para alquileres de más de 15 días, los equipos con tarifas negociables por varios días se revisan por email.",
      handheld: "micrófono inalámbrico de mano AKG WP-300",
      headset: "canal headset Phenyx Pro PTU-71-2B",
      labeler: "Labeler para eventos",
      videoServer: "Servidor de video (PC gamer)",
      portableMonitor: "Monitor portátil",
      lv1Classic: "LV1 Classic",
      lv1StageGridBundle: "LV1 Classic + 1 × StageGrid 4000",
      stageGrid4000: "StageGrid 4000",
      request: "Solicitud de cotización de alquiler",
      venue: "Ciudad / venue",
      date: "Fecha del evento",
      days: "Días de alquiler",
      attendees: "Asistentes estimados",
      notes: "Notas",
      recommendation: "Carrito de alquiler",
      cartTitle: "Carrito de alquiler",
      emptyCart: "Tu carrito está vacío. Agrega equipos con los controles + de las tarjetas de alquiler.",
      inCart: "{quantity} seleccionado",
      add: "Agrega la cantidad deseada",
      addAnother: "Agregar otro",
      removeOne: "Quitar uno",
      maximum: "Máximo disponible",
      selected: "Seleccionado",
      clearCart: "Vaciar carrito",
      viewCart: "Ver carrito",
      packages: {
        corporate: "Paquete Evento Corporativo",
        digital: "Sistema Digital para Show",
        theater: "Sistema Inalámbrico para Teatro",
        livePro: "Live Show Pro",
        fohMonPro: "FOH + MON Pro"
      },
      equipmentTotal: "Total estimado de alquiler y servicios",
      customQuote: "Cotización personalizada",
      quotedSeparately: "Se cotiza por separado",
      negotiable: "Por negociar",
      oneDay: "1 día de alquiler",
      multipleDays: "{days} días de alquiler"
    }
  };

  const currentLanguage = () => (document.documentElement.lang === "es" ? "es" : "en");
  const numberValue = (field, fallback = 0) => {
    if (!field) return fallback;
    const parsed = Number.parseInt(field.value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const clampNumberField = (field, fallback) => {
    const minimum = Number(field.min || 0);
    const maximum = field.max ? Number(field.max) : Number.POSITIVE_INFINITY;
    const parsed = Number.parseInt(field.value, 10);
    const value = Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? parsed : fallback));
    field.value = String(value);
    return value;
  };

  const clearPresetSelection = () => {
    activePreset = null;
    presetButtons.forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  };

  const cartQuantity = (itemKey) => {
    const item = cartItems[itemKey];
    if (!item || !fields[item.field]) return 0;
    return Math.min(item.max, Math.max(0, numberValue(fields[item.field], 0)));
  };

  const setCartQuantity = (itemKey, nextQuantity) => {
    const item = cartItems[itemKey];
    if (!item || !fields[item.field]) return;
    fields[item.field].value = String(Math.min(item.max, Math.max(0, nextQuantity)));
    clearPresetSelection();
    render();
  };

  const buildCartControls = () => {
    equipmentCards.forEach((card) => {
      const itemKey = card.dataset.rentalItem;
      const body = card.querySelector(".equipment-card-body");
      if (!cartItems[itemKey] || !body || body.querySelector(".equipment-cart-control")) return;

      const control = document.createElement("div");
      const decrement = document.createElement("button");
      const status = document.createElement("span");
      const increment = document.createElement("button");
      const selectedBadge = document.createElement("span");
      selectedBadge.className = "equipment-selected-badge";
      selectedBadge.hidden = true;
      selectedBadge.setAttribute("aria-hidden", "true");
      card.append(selectedBadge);
      control.className = "equipment-cart-control";
      decrement.type = "button";
      decrement.dataset.cartAction = "decrement";
      decrement.textContent = "−";
      status.className = "equipment-cart-status";
      status.setAttribute("aria-live", "polite");
      increment.type = "button";
      increment.dataset.cartAction = "increment";
      increment.textContent = "+";
      decrement.addEventListener("click", () => setCartQuantity(itemKey, cartQuantity(itemKey) - 1));
      increment.addEventListener("click", () => setCartQuantity(itemKey, cartQuantity(itemKey) + 1));
      control.replaceChildren(decrement, status, increment);
      body.append(control);
    });
  };

  const updateCartControls = (lang) => {
    equipmentCards.forEach((card) => {
      const itemKey = card.dataset.rentalItem;
      const item = cartItems[itemKey];
      if (!item) return;
      const quantity = cartQuantity(itemKey);
      const productName = card.querySelector("h4")?.textContent.trim() || itemKey;
      const decrement = card.querySelector('[data-cart-action="decrement"]');
      const increment = card.querySelector('[data-cart-action="increment"]');
      const status = card.querySelector(".equipment-cart-status");
      const selectedBadge = card.querySelector(".equipment-selected-badge");
      card.classList.toggle("is-in-cart", quantity > 0);
      card.dataset.cartQuantity = String(quantity);
      if (selectedBadge) {
        selectedBadge.hidden = quantity === 0;
        selectedBadge.textContent = quantity > 1 ? `✓ ${quantity} ${copy[lang].selected}` : `✓ ${copy[lang].selected}`;
      }
      if (status) status.textContent = quantity > 0 ? copy[lang].inCart.replace("{quantity}", quantity) : copy[lang].add;
      if (decrement) {
        decrement.disabled = quantity === 0;
        decrement.setAttribute("aria-label", `${copy[lang].removeOne}: ${productName}`);
      }
      if (increment) {
        increment.disabled = quantity >= item.max;
        increment.setAttribute("aria-label", `${quantity === 0 ? copy[lang].add : copy[lang].addAnother}: ${productName}`);
        increment.title = quantity >= item.max ? copy[lang].maximum : "";
      }
    });
  };

  const readState = () => ({
         name: fields.name?.value.trim() || "",
    email: fields.email?.value.trim() || "",
    eventType: fields.eventType.value,
    venue: fields.venue.value.trim(),
    date: fields.date.value,
    days: clampNumberField(fields.days, 1),
    attendees: clampNumberField(fields.attendees, 100),
    wing: numberValue(fields.wing, 0),
    flow8: numberValue(fields.flow8, 0),
    lv1: numberValue(fields.lv1, 0),
    dl32: numberValue(fields.dl32, 0),
    stageGrid: numberValue(fields.stageGrid, 0),
    handhelds: numberValue(fields.handhelds, 0),
    headsets: numberValue(fields.headsets, 0),
    pa: numberValue(fields.pa, 0),
    labeler: fields.labeler.value,
    videoServer: fields.videoServer.value,
    streaming: fields.streaming.value,
    monitor: fields.monitor.value,
    engineering: fields.engineering.value,
    delivery: fields.delivery.value,
    notes: fields.notes.value.trim()
  });

  const formatCop = (value) => `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value))} COP`;

  const rentalLineTotal = (rateKey, quantity, days) => {
    const rate = RENTAL_PRICING.rates[rateKey];
    if (!rate) return 0;
    const additionalDays = Math.max(0, days - 1);
    return quantity * (rate.dayOne + (rate.dayOne * rate.additionalDayMultiplier * additionalDays));
  };

  const resolveConfiguration = (state, lang) => {
    const wingCount = Math.min(1, Math.max(0, state.wing));
    const flow8Count = Math.min(1, Math.max(0, state.flow8));
    const lv1Count = Math.min(2, Math.max(0, state.lv1));
    const dl32Count = Math.min(2, Math.max(0, state.dl32));
    const stageGridCount = Math.min(2, Math.max(0, state.stageGrid));
    const paCount = Math.min(2, Math.max(0, state.pa));
    const longTerm = state.days > RENTAL_PRICING.customQuoteAfterDays;
    const items = [];

    // Keep related console + rack families adjacent in the final quote.
    if (wingCount) {
      if (dl32Count > 0) {
        items.push({ label: "1 × Behringer WING + 1 × Midas DL32", quantity: 1, rateKey: "wingWithDl32", kind: "equipment" });
        const extraDl32 = Math.max(0, dl32Count - 1);
        if (extraDl32) items.push({ label: `${extraDl32} × Midas DL32`, quantity: extraDl32, rateKey: "dl32", kind: "equipment" });
      } else {
        items.push({ label: "1 × Behringer WING", quantity: 1, rateKey: "wingStandalone", kind: "equipment" });
      }
    } else if (dl32Count) {
      items.push({ label: `${dl32Count} × Midas DL32`, quantity: dl32Count, rateKey: "dl32", kind: "equipment" });
    }

    if (flow8Count) items.push({ label: "1 × Behringer FLOW 8", quantity: 1, rateKey: "flow8", kind: "equipment" });

    const bundledLv1Count = Math.min(lv1Count, stageGridCount);
    const standaloneLv1Count = Math.max(0, lv1Count - bundledLv1Count);
    const extraStageGridCount = Math.max(0, stageGridCount - bundledLv1Count);
    if (bundledLv1Count) {
      const label = bundledLv1Count === 1
        ? `1 × ${copy[lang].lv1StageGridBundle}`
        : `${bundledLv1Count} × LV1 Classic + ${bundledLv1Count} × StageGrid 4000 (bundle)`;
      items.push({ label, quantity: bundledLv1Count, rateKey: "lv1StageGridBundle", kind: "equipment" });
    }
    if (standaloneLv1Count) items.push({ label: `${standaloneLv1Count} × ${copy[lang].lv1Classic}`, quantity: standaloneLv1Count, rateKey: "lv1ClassicSolo", kind: "equipment" });
    if (extraStageGridCount) items.push({ label: `${extraStageGridCount} × ${copy[lang].stageGrid4000}`, quantity: extraStageGridCount, rateKey: "stageGrid4000", kind: "equipment" });

    if (state.handhelds) items.push({ label: `${state.handhelds} × ${copy[lang].handheld}`, quantity: state.handhelds, rateKey: "akg", kind: "equipment" });
    if (state.headsets) items.push({ label: `${state.headsets} × ${copy[lang].headset}`, quantity: state.headsets, rateKey: "phenyx", kind: "equipment" });
    if (paCount) items.push({ label: `${paCount} × BetaThree BT-1500`, quantity: paCount, rateKey: "betaThree", kind: "equipment" });
    if (state.labeler === "1") items.push({ label: `1 × ${copy[lang].labeler}`, quantity: 1, rateKey: "labeler", kind: "equipment" });
    if (state.videoServer === "1") items.push({ label: `1 × ${copy[lang].videoServer}`, quantity: 1, rateKey: "videoServer", kind: "equipment" });
    if (state.monitor === "1") items.push({ label: `1 × ${copy[lang].portableMonitor}`, quantity: 1, rateKey: "portableMonitor", kind: "equipment" });

    if (items.some((item) => item.kind === "equipment")) items.push({ label: copy[lang].technicalSupport, kind: "included" });
    if (state.engineering === "yes") items.push({ label: copy[lang].engineering, quantity: 1, rateKey: "soundEngineer", kind: "pricedService" });
    if (state.streaming === "yes") items.push({ label: copy[lang].streaming, kind: "service" });
    if (state.delivery === "yes") items.push({ label: copy[lang].delivery, kind: "service" });

    const pricedItems = items.map((item) => {
      if (item.kind === "service") return { ...item, price: null, priceLabel: copy[lang].quotedSeparately };
      if (item.kind === "included") return { ...item, price: 0, priceLabel: copy[lang].included };
      const rate = RENTAL_PRICING.rates[item.rateKey];
      const fixedDaily = Boolean(rate?.fixedDaily);
      const price = (!longTerm || fixedDaily) ? rentalLineTotal(item.rateKey, item.quantity, state.days) : null;
      return { ...item, price, priceLabel: (longTerm && !fixedDaily) ? copy[lang].negotiable : formatCop(price) };
    });

    const hasNegotiableEquipment = pricedItems.some((item) => (item.kind === "equipment" || item.kind === "pricedService") && item.price === null);
    const total = hasNegotiableEquipment ? null : pricedItems.reduce((sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0), 0);
    const warnings = [];
    if (state.attendees > 150 && paCount > 0) warnings.push(copy[lang].warning);
    if (wingCount > 0 && dl32Count === 0) warnings.push(copy[lang].wingIoWarning);
    if (flow8Count > 0) warnings.push(copy[lang].flowIoWarning);
    if (lv1Count > stageGridCount) warnings.push(copy[lang].lv1IoWarning);
    if (longTerm && hasNegotiableEquipment) warnings.push(copy[lang].longTerm);

    return {
      title: copy[lang].titles[state.eventType] || copy[lang].titles.other,
      items: pricedItems,
      total,
      customQuote: hasNegotiableEquipment,
      warning: warnings.join(" "),
      counts: { wingCount, flow8Count, lv1Count, dl32Count, stageGridCount, paCount }
    };
  };

  const buildPricingExplanation = (state, configuration, lang) => {
    const { wingCount, flow8Count, lv1Count, dl32Count, stageGridCount, paCount } = configuration.counts;
    const parts = [];
    const pairedLv1 = Math.min(lv1Count, stageGridCount);
    const soloLv1 = Math.max(0, lv1Count - pairedLv1);
    const extraStageGrid = Math.max(0, stageGridCount - pairedLv1);

    if (lang === "es") {
      if (wingCount && dl32Count) parts.push("La WING + 1 DL32 se calcula a $500.000 COP el primer día; una segunda DL32 se suma por separado a $250.000 COP el primer día.");
      else if (wingCount) parts.push("La WING sin DL32 se calcula a $300.000 COP el primer día.");
      else if (dl32Count) parts.push(`Las DL32 se calculan a $250.000 COP por unidad el primer día.`);
      if (flow8Count) parts.push("La FLOW 8 se calcula a $200.000 COP por día.");
      if (pairedLv1) parts.push(`${pairedLv1} sistema${pairedLv1 > 1 ? "s" : ""} LV1 Classic + StageGrid se calcula${pairedLv1 > 1 ? "n" : ""} a $3.000.000 COP por sistema / día.`);
      if (soloLv1) parts.push(`${soloLv1} LV1 Classic sin StageGrid se calcula${soloLv1 > 1 ? "n" : ""} a $2.700.000 COP por unidad / día.`);
      if (extraStageGrid) parts.push(`${extraStageGrid} StageGrid adicional${extraStageGrid > 1 ? "es" : ""} se calcula${extraStageGrid > 1 ? "n" : ""} a $500.000 COP por unidad / día.`);
      if (stageGridCount && !lv1Count) parts.push("StageGrid 4000 se calcula a $500.000 COP por unidad / día.");
      if (state.days > 1 && (wingCount || dl32Count || paCount || state.videoServer === "1")) parts.push("En WING, DL32, BetaThree y servidor de video, desde el segundo día se aplica el 70% de la tarifa del primer día.");
      parts.push("El soporte técnico sobre los equipos suministrados está incluido. IVA, transporte, montaje y servicios indicados como cotización aparte no están incluidos en el total estimado.");
    } else {
      if (wingCount && dl32Count) parts.push("WING + 1 DL32 is billed at $500,000 COP for day one; a second DL32 is added separately at $250,000 COP for day one.");
      else if (wingCount) parts.push("Standalone WING is billed at $300,000 COP for day one.");
      else if (dl32Count) parts.push("DL32 units are billed at $250,000 COP per unit for day one.");
      if (flow8Count) parts.push("FLOW 8 is billed at $200,000 COP per day.");
      if (pairedLv1) parts.push(`${pairedLv1} LV1 Classic + StageGrid system${pairedLv1 > 1 ? "s are" : " is"} billed at $3,000,000 COP per system / day.`);
      if (soloLv1) parts.push(`${soloLv1} standalone LV1 Classic unit${soloLv1 > 1 ? "s are" : " is"} billed at $2,700,000 COP per unit / day.`);
      if (extraStageGrid) parts.push(`${extraStageGrid} additional StageGrid 4000 unit${extraStageGrid > 1 ? "s are" : " is"} billed at $500,000 COP per unit / day.`);
      if (stageGridCount && !lv1Count) parts.push("StageGrid 4000 is billed at $500,000 COP per unit / day.");
      if (state.days > 1 && (wingCount || dl32Count || paCount || state.videoServer === "1")) parts.push("For WING, DL32, BetaThree and the video server, day two onward is billed at 70% of the day-one rate.");
      parts.push("Technical support for supplied equipment is included. VAT, transport, setup and services marked as separately quoted are not included in the estimated total.");
    }
    return parts.join(" ");
  };

  const equipmentUnitCount = (state) => state.wing + state.flow8 + state.lv1 + state.dl32 + state.stageGrid
    + state.handhelds + state.headsets + state.pa
    + (state.labeler === "1" ? 1 : 0) + (state.videoServer === "1" ? 1 : 0) + (state.monitor === "1" ? 1 : 0);

  const clearCart = () => {
    ["wing", "flow8", "lv1", "dl32", "stageGrid", "handhelds", "headsets", "pa"].forEach((key) => { if (fields[key]) fields[key].value = "0"; });
    fields.days.value = "1";
    fields.labeler.value = "0";
    fields.videoServer.value = "0";
    fields.monitor.value = "0";
    fields.engineering.value = "no";
    fields.streaming.value = "no";
    fields.delivery.value = "no";
    clearPresetSelection();
    render();
  };

  const openCart = () => {
    if (!modal) return;
    window.clearTimeout(closeTimer);
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("rental-cart-open");
    cartToggle?.setAttribute("aria-expanded", "true");
    render();
    cartClose?.focus({ preventScroll: true });
  };

  const closeCart = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("rental-cart-open");
    cartToggle?.setAttribute("aria-expanded", "false");
    closeTimer = window.setTimeout(() => { modal.hidden = true; }, 260);
    cartToggle?.focus({ preventScroll: true });
  };

  const render = () => {
    const lang = currentLanguage();
    const state = readState();
    const configuration = resolveConfiguration(state, lang);

    summaryTitle.textContent = activePreset ? copy[lang].packages[activePreset] : (lang === "es" ? "Tu selección" : "Your selection");
    const renderedItems = configuration.items.map((item) => {
      const listItem = document.createElement("li");
      const label = document.createElement("span");
      const price = document.createElement("strong");
      label.textContent = item.label;
      price.textContent = item.priceLabel;
      listItem.replaceChildren(label, price);
      return listItem;
    });
    if (!renderedItems.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "cart-empty";
      emptyItem.textContent = copy[lang].emptyCart;
      renderedItems.push(emptyItem);
    }
    summaryList.replaceChildren(...renderedItems);

    summaryPriceValue.textContent = configuration.customQuote ? copy[lang].customQuote : formatCop(configuration.total);
    summaryPriceDetail.textContent = state.days === 1 ? copy[lang].oneDay : copy[lang].multipleDays.replace("{days}", state.days);
    pricingNote.textContent = buildPricingExplanation(state, configuration, lang);
    requestButton.textContent = lang === "es" ? "Enviar solicitud de alquiler" : "Send rental request";
    summaryWarning.hidden = !configuration.warning;
    summaryWarning.textContent = configuration.warning;
    updateCartControls(lang);
    const cartUnits = equipmentUnitCount(state);
    if (cartCount) cartCount.textContent = String(cartUnits);
    if (cartLabel) cartLabel.textContent = cartUnits > 0 ? copy[lang].viewCart : copy[lang].cartTitle;
    if (cartClear) {
      cartClear.disabled = cartUnits === 0;
      cartClear.textContent = copy[lang].clearCart;
    }
    cartToggle?.classList.toggle("has-items", cartUnits > 0);
    if (cartToggle && cartUnits > previousCartUnits) {
      cartToggle.classList.remove("cart-bump");
      void cartToggle.offsetWidth;
      cartToggle.classList.add("cart-bump");
      window.setTimeout(() => cartToggle.classList.remove("cart-bump"), 700);
    }
    previousCartUnits = cartUnits;
    window.__rentalQuoteState = { state, configuration, lang, activePreset };
  };

  const presets = {
    corporate: { eventType: "corporate", attendees: "150", wing: "0", flow8: "1", lv1: "0", dl32: "0", stageGrid: "0", handhelds: "2", headsets: "0", pa: "2", labeler: "0", videoServer: "0", streaming: "no", monitor: "0", engineering: "no", delivery: "yes" },
    digital: { eventType: "theater", attendees: "100", wing: "1", flow8: "0", lv1: "0", dl32: "1", stageGrid: "0", handhelds: "0", headsets: "0", pa: "0", labeler: "0", videoServer: "0", streaming: "no", monitor: "0", engineering: "no", delivery: "yes" },
    theater: { eventType: "theater", attendees: "100", wing: "1", flow8: "0", lv1: "0", dl32: "1", stageGrid: "0", handhelds: "0", headsets: "6", pa: "0", labeler: "0", videoServer: "0", streaming: "no", monitor: "0", engineering: "no", delivery: "yes" },
    livePro: { eventType: "other", attendees: "300", wing: "0", flow8: "0", lv1: "1", dl32: "0", stageGrid: "1", handhelds: "2", headsets: "0", pa: "0", labeler: "0", videoServer: "0", streaming: "no", monitor: "0", engineering: "no", delivery: "yes" },
    fohMonPro: { eventType: "other", attendees: "500", wing: "0", flow8: "0", lv1: "2", dl32: "0", stageGrid: "2", handhelds: "0", headsets: "0", pa: "0", labeler: "0", videoServer: "0", streaming: "no", monitor: "0", engineering: "no", delivery: "yes" }
  };

  presetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const presetName = button.getAttribute("data-rental-preset");
      const preset = presets[presetName];
      if (!preset) return;
      Object.entries(preset).forEach(([fieldName, value]) => { if (fields[fieldName]) fields[fieldName].value = value; });
      activePreset = presetName;
      presetButtons.forEach((item) => {
        const isSelected = item === button;
        item.classList.toggle("is-selected", isSelected);
        item.setAttribute("aria-pressed", String(isSelected));
      });
      render();
      openCart();
    });
  });

  const presetSensitiveFields = new Set([
    fields.eventType, fields.attendees, fields.wing, fields.flow8, fields.lv1, fields.dl32,
    fields.stageGrid, fields.handhelds, fields.headsets, fields.pa, fields.labeler,
    fields.videoServer, fields.monitor
  ]);

  Object.values(fields).filter(Boolean).forEach((field) => {
    const handleFieldUpdate = () => {
      if (presetSensitiveFields.has(field)) clearPresetSelection();
      render();
    };
    field.addEventListener("input", handleFieldUpdate);
    field.addEventListener("change", handleFieldUpdate);
  });

  fields.days.addEventListener("focus", () => fields.days.select());
  form.querySelectorAll("[data-days-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number.parseInt(button.getAttribute("data-days-step"), 10) || 0;
      const current = clampNumberField(fields.days, 1);
      fields.days.value = String(Math.max(1, current + step));
      render();
    });
  });

  cartToggle?.addEventListener("click", openCart);
  cartClose?.addEventListener("click", closeCart);
  cartClear?.addEventListener("click", clearCart);
  cartBackdrop?.addEventListener("click", closeCart);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) closeCart();
  });

  form.addEventListener("submit", (event) => event.preventDefault());

   requestButton.addEventListener("click", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    render();

    const { state, configuration, lang } = window.__rentalQuoteState;

    const params = new URLSearchParams(window.location.search);

    const payload = {
      name: state.name,
      email: state.email,

      eventType: state.eventType,
      venue: state.venue,
      eventDate: state.date,
      rentalDays: state.days,
      attendees: state.attendees,

      items: {
        wing: state.wing,
        flow8: state.flow8,
        lv1: state.lv1,
        dl32: state.dl32,
        stageGrid: state.stageGrid,
        handhelds: state.handhelds,
        headsets: state.headsets,
        pa: state.pa,
        labeler: state.labeler,
        videoServer: state.videoServer,
        monitor: state.monitor
      },

      services: {
        engineering: state.engineering,
        streaming: state.streaming,
        delivery: state.delivery
      },

      notes: state.notes,

      estimatedTotalCop:
        configuration.total === null
          ? undefined
          : configuration.total,

      customQuote: configuration.customQuote,

      language: lang,
      market:
        document.documentElement.dataset.market ||
        "international",

      sourceUrl: window.location.href,
      referrer: document.referrer || "",

      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || ""
    };

    requestButton.setAttribute("aria-disabled", "true");
    requestButton.style.pointerEvents = "none";

    const originalText = requestButton.textContent;

    requestButton.textContent =
      lang === "es"
        ? "Enviando..."
        : "Sending...";

    try {
      const response = await fetch("/api/rental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Rental request failed"
        );
      }

      alert(
        lang === "es"
          ? "Solicitud de alquiler recibida. Te contactaré con la confirmación y cotización."
          : "Rental request received. I'll contact you with confirmation and the quote."
      );

      closeCart();
    } catch (error) {
      console.error(
        "Rental request submission failed",
        error
      );

      alert(
        lang === "es"
          ? "No fue posible enviar la solicitud. Intenta nuevamente."
          : "The rental request could not be sent. Please try again."
      );
    } finally {
      requestButton.removeAttribute("aria-disabled");
      requestButton.style.pointerEvents = "";

      requestButton.textContent =
        originalText ||
        (lang === "es"
          ? "Enviar solicitud de alquiler"
          : "Send rental request");
    }
  });
   
  window.__renderRentalQuote = render;
  window.__openRentalCart = openCart;
  buildCartControls();
  render();
}

/* =============================================
   Show Day Mode (session-scoped across site routes)
============================================= */

function initShowDayMode() {
  const toggle = document.getElementById("showdayToggle");
  if (!toggle) return;
  const root = document.documentElement;
  const workLocation = document.getElementById("workLocation");
  const storageKey = "sdlive-showday-mode";
  const locationStorageKey = "sdlive-showday-location";

  let active = false;
  try { active = sessionStorage.getItem(storageKey) === "active"; } catch { /* no-op */ }
  let location = SITE_CONFIG.workCalendar.fallbackLocation;
  try { location = sessionStorage.getItem(locationStorageKey) || location; } catch { /* no-op */ }
  const normalAccent = getComputedStyle(root).getPropertyValue("--normal-accent").trim();
  const normalAccentRgb = getComputedStyle(root).getPropertyValue("--normal-accent-rgb").trim();
  const showdayAccent = getComputedStyle(root).getPropertyValue("--showday-accent").trim();
  const showdayAccentRgb = getComputedStyle(root).getPropertyValue("--showday-accent-rgb").trim();

  const render = () => {
    root.classList.toggle("showday-active", active);
    root.style.setProperty("--color-accent", active ? showdayAccent : normalAccent);
    root.style.setProperty("--color-accent-rgb", active ? showdayAccentRgb : normalAccentRgb);
    toggle.setAttribute("aria-pressed", String(active));

    if (workLocation) {
      workLocation.textContent = active
        ? location
        : "Creative Audio";
    }
  };

  const setShowDayMode = (nextActive, nextLocation) => {
    active = Boolean(nextActive);
    if (typeof nextLocation === "string" && nextLocation.trim()) {
      location = nextLocation.trim();
    }
    try {
      if (active) {
        sessionStorage.setItem(storageKey, "active");
        sessionStorage.setItem(locationStorageKey, location);
      } else {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(locationStorageKey);
      }
    } catch { /* no-op */ }
    render();
  };

  toggle.addEventListener("click", () => {
    setShowDayMode(!active);
  });

  window.__setShowDayMode = setShowDayMode;
  window.__renderShowDayMode = render;
  render();
}

/* =============================================
   Work calendar status
============================================= */

function initWorkCalendar() {
  const config = SITE_CONFIG.workCalendar;
  if (!config || !config.statusEndpoint || !window.__setShowDayMode) return;

  const refresh = async () => {
    try {
      const response = await fetch(config.statusEndpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Calendar status ${response.status}`);

      const status = await response.json();
      if (typeof status.active !== "boolean") throw new Error("Invalid calendar status");

      window.__setShowDayMode(
        status.active,
        status.location || config.fallbackLocation
      );
    } catch (error) {
      console.warn("Work calendar status unavailable.", error);
    }
  };

  refresh();
  window.setInterval(refresh, Math.max(15000, Number(config.refreshMs) || 60000));
}

/* =============================================
   Contact
============================================= */

function applyContactConfig() {
  const emailLink = document.getElementById("contactEmail");
  if (emailLink) {
    emailLink.textContent = SITE_CONFIG.contact.email;
    emailLink.href = `mailto:${SITE_CONFIG.contact.email}`;
  }
  const footerEmail = document.getElementById("footerEmail");
  if (footerEmail) {
    footerEmail.textContent = SITE_CONFIG.contact.email;
    footerEmail.href = `mailto:${SITE_CONFIG.contact.email}`;
  }
  const whatsappLink = document.getElementById("contactWhatsapp");
  if (whatsappLink) {
    whatsappLink.textContent = `WhatsApp · @${SITE_CONFIG.contact.whatsappUsername}`;
    whatsappLink.href = `https://wa.me/${SITE_CONFIG.contact.whatsapp}`;
  }

  const instagramLink = document.getElementById("contactInstagram");
  if (instagramLink) instagramLink.href = SITE_CONFIG.contact.instagram;
  const footerInstagram = document.getElementById("footerInstagram");
  if (footerInstagram) footerInstagram.href = SITE_CONFIG.contact.instagram;
  const linkedinLink = document.getElementById("contactLinkedin");
  if (linkedinLink) linkedinLink.href = SITE_CONFIG.contact.linkedin;
  const footerLinkedin = document.getElementById("footerLinkedin");
  if (footerLinkedin) footerLinkedin.href = SITE_CONFIG.contact.linkedin;

  const whatsappFloat = document.getElementById("whatsappFloat");
  if (whatsappFloat) {
    whatsappFloat.href = `https://wa.me/${SITE_CONFIG.contact.whatsapp}`;
    whatsappFloat.setAttribute("aria-label", `WhatsApp: @${SITE_CONFIG.contact.whatsappUsername}`);
  }
}

function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const lang =
      document.documentElement.lang === "es"
        ? "es"
        : "en";

    const payload = {
      name: document.getElementById("cfName")?.value.trim() || "",
      email: document.getElementById("cfEmail")?.value.trim() || "",
      message: document.getElementById("cfMessage")?.value.trim() || "",
      language: lang,
      market: document.documentElement.dataset.market || "international",
      sourceUrl: window.location.href,
      referrer: document.referrer || ""
    };

    const params = new URLSearchParams(window.location.search);

    payload.utmSource = params.get("utm_source") || "";
    payload.utmMedium = params.get("utm_medium") || "";
    payload.utmCampaign = params.get("utm_campaign") || "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent =
        lang === "es"
          ? "Enviando..."
          : "Sending...";
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Contact request failed");
      }

      form.reset();

      alert(
        lang === "es"
          ? "Mensaje recibido. Gracias por contactar a SD.Live."
          : "Message received. Thanks for contacting SD.Live."
      );
    } catch (error) {
      console.error("Contact form submission failed", error);

      alert(
        lang === "es"
          ? "No fue posible enviar el mensaje. Intenta nuevamente o contáctame por WhatsApp."
          : "The message could not be sent. Please try again or contact me via WhatsApp."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          lang === "es"
            ? "Enviar Mensaje"
            : "Send Message";
      }
    }
  });
}
