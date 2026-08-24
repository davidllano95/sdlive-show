const SHOWDAY_RUNTIME_VERSION = "20260824-2";

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

export function applyShowDayRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/showday-runtime.css?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime/>` +
          `<script defer src="/showday-runtime.js?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime></script>`,
          { html: true }
        );
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
    .transform(response);
}
