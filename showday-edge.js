const SHOWDAY_RUNTIME_VERSION = "20260824-2";
const PUBLIC_AUDIT_RUNTIME_VERSION = "20260831-2";
const AVAILABILITY_RUNTIME_VERSION = "20260901-3";

const SHARED_PUBLIC_HEADER_HTML = `
<header class="site-header" id="siteHeader" data-sdlive-shared-public-header>
  <div class="container">
    <a aria-label="SD.Live — Home" class="brand" href="/">
      <span class="brand-main-row">
        <span aria-hidden="true" class="brand-logo">
          <span class="brand-logo__normal-set">
            <img alt="" class="brand-logo__intro-symbol" height="724" src="/assets/logos/sd-live-header-normal-symbol.png" width="2172"/>
            <span class="brand-logo__intro-reveal">
              <span class="brand-logo__intro-letters">
                <img alt="" height="724" src="/assets/logos/sd-live-header-normal-sd.png" width="2172"/>
                <img alt="" height="724" src="/assets/logos/sd-live-header-normal-live.png" width="2172"/>
              </span>
            </span>
            <img alt="" class="brand-logo__intro-dot" height="724" src="/assets/logos/sd-live-header-normal-dot.png" width="2172"/>
          </span>
          <img alt="" class="brand-logo__showday" height="724" src="/assets/logos/sd-live-header-showday.png" width="2172"/>
          <img alt="" class="brand-logo__showday-dot" height="724" src="/assets/logos/sd-live-header-showday-dot.png" width="2172"/>
        </span>
        <span aria-hidden="true" class="on-air-badge">ON AIR</span>
      </span>
      <span aria-live="polite" class="brand-location" id="workLocation" role="status">Creative Audio</span>
    </a>

    <nav aria-label="Primary" class="main-nav">
      <a data-en="About" data-es="Sobre mí" href="/#about">About</a>
      <a data-en="Work" data-es="Trabajo" href="/#work">Work</a>
      <a data-en="Services" data-es="Servicios" href="/#services">Services</a>
      <a data-en="International" data-es="Internacional" href="/#international">International</a>
      <a class="local-market-only" data-en="Rental" data-es="Alquiler" href="/#rental">Rental</a>
      <a data-en="Sound Design" data-es="Diseño Sonoro" href="/theatre-sound-design-audio-post">Sound Design</a>
      <a class="btn btn-primary mobile-project-cta" data-en="Start Project" data-es="Iniciar Proyecto" href="/#contact">Start Project</a>
    </nav>

    <div class="header-actions">
      <div aria-label="Language selector" class="lang-toggle" role="group">
        <button aria-pressed="true" id="langEn" type="button">EN</button>
        <button aria-pressed="false" id="langEs" type="button">ES</button>
      </div>
      <a class="btn btn-primary header-project-cta header-project-cta--desktop" data-en="Start Project" data-es="Iniciar Proyecto" href="/#contact">Start Project</a>
      <button aria-controls="siteHeader" aria-expanded="false" aria-label="Menu" class="nav-toggle" id="navToggle" type="button">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>`;

const PUBLIC_WHATSAPP_HTML = `
<a aria-label="WhatsApp: @samd.llano95" class="whatsapp-float" href="https://wa.me/samd.llano95" id="whatsappFloat" rel="noopener" target="_blank">
  <svg aria-hidden="true" fill="#06070b" height="26" viewbox="0 0 24 24" width="26">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.08-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.18l-.31-.18-3.02.79.81-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.36-5.61c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"></path>
  </svg>
</a>`;

export function applyShowDayRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  const responseLanguage = String(response.headers.get("Content-Language") || "en").toLowerCase();
  const isSpanishResponse = responseLanguage.startsWith("es");

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/showday-runtime.css?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime/>` +
          `<script defer src="/showday-runtime.js?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime></script>` +
          `<link rel="stylesheet" href="/public-audit-closeout.css?v=${PUBLIC_AUDIT_RUNTIME_VERSION}" data-sdlive-public-audit/>` +
          `<script defer src="/public-audit-closeout.js?v=${PUBLIC_AUDIT_RUNTIME_VERSION}" data-sdlive-public-audit></script>` +
          `<link rel="stylesheet" href="/availability-status.css?v=${AVAILABILITY_RUNTIME_VERSION}" data-sdlive-availability/>` +
          `<script defer src="/availability-status.js?v=${AVAILABILITY_RUNTIME_VERSION}" data-sdlive-availability></script>`,
          { html: true }
        );
      }
    })
    .on("body.seo-page", {
      element(element) {
        element.append(PUBLIC_WHATSAPP_HTML, { html: true });
      }
    })
    .on(".seo-header", {
      element(element) {
        element.replace(SHARED_PUBLIC_HEADER_HTML, { html: true });
      }
    })
    .on("#showdayToggle", {
      element(element) {
        element.remove();
      }
    })
    .on("#contactTurnstile, #rentalTurnstile", {
      element(element) {
        element.removeAttribute("aria-label");
      }
    })
    .on(".quick-view-btn", {
      element(element) {
        const englishLabel = element.getAttribute("data-en") || "";
        const englishHref = element.getAttribute("data-en-href") || "";
        if (!englishLabel.startsWith("Explore live and broadcast audio")) return;

        element.setAttribute("data-en-href", "/en/");
        if (!isSpanishResponse && (!englishHref || englishHref.includes("audio-eventos-streaming-teatro-bogota"))) {
          element.setAttribute("href", "/en/");
        }
      }
    })
    .transform(response);
}
