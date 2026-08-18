(() => {
  const iframe = document.getElementById('sitePreview');
  const stage = document.getElementById('previewStage');
  const address = document.getElementById('previewAddress');
  const deviceLabel = document.getElementById('deviceLabel');
  const marketLabel = document.getElementById('marketLabel');
  const viewTitle = document.getElementById('viewTitle');
  const openLive = document.getElementById('openLive');
  const refresh = document.getElementById('refreshPreview');
  const langButtons = [...document.querySelectorAll('[data-lang]')];
  const marketButtons = [...document.querySelectorAll('[data-market]')];
  const deviceButtons = [...document.querySelectorAll('[data-device]')];
  const sectionButtons = [...document.querySelectorAll('[data-section]')];

  const sections = {
    hero: 'Home',
    trustedTitle: 'Trusted by',
    about: 'About',
    travel: 'Worldwide',
    services: 'Services',
    picture: 'Sound for Picture',
    work: 'Selected Work',
    testimonials: 'Testimonials',
    rental: 'Rental',
    contact: 'Contact'
  };

  const state = {
    market: localStorage.getItem('sdlive-admin-market') || 'colombia',
    lang: localStorage.getItem('sdlive-admin-lang') || 'root',
    device: localStorage.getItem('sdlive-admin-device') || 'desktop',
    section: 'hero'
  };

  function routeFor(lang) {
    const fileMode = window.location.protocol === 'file:';
    if (fileMode) {
      if (lang === 'en') return '../en/index.html';
      if (lang === 'es') return '../es-co/index.html';
      return '../index.html';
    }
    if (lang === 'en') return '/en/';
    if (lang === 'es') return '/es-co/';
    return '/';
  }

  function publicLabel(lang) {
    if (lang === 'en') return 'sdlive.show/en/';
    if (lang === 'es') return 'sdlive.show/es-co/';
    return 'sdlive.show/';
  }

  function currentUrl(includeSection = true) {
    const base = routeFor(state.lang);
    const hash = includeSection && state.section && state.section !== 'hero' ? `#${state.section}` : '';
    return `${base}${hash}`;
  }

  function applyMarketToPreview() {
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.documentElement) return false;

      // This is the same switch used by the public site:
      // html[data-market="international"] hides .local-market-only.
      doc.documentElement.dataset.market = state.market;
      return true;
    } catch (_) {
      return false;
    }
  }

  function updateMarketUI() {
    const isInternational = state.market === 'international';
    marketButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.market === state.market);
    });

    marketLabel.textContent = isInternational ? 'INT' : 'COL';

    const rentalButton = sectionButtons.find(btn => btn.dataset.section === 'rental');
    if (rentalButton) {
      rentalButton.classList.toggle('is-market-hidden', isInternational);
      rentalButton.disabled = isInternational;
      rentalButton.setAttribute(
        'aria-hidden',
        isInternational ? 'true' : 'false'
      );
    }
  }

  function updatePreview({ reload = true } = {}) {
    if (reload) iframe.src = currentUrl(true);
    address.textContent = publicLabel(state.lang) + (state.section !== 'hero' ? `#${state.section}` : '');
    openLive.href = currentUrl(true);
    viewTitle.textContent = sections[state.section] || 'Site preview';

    langButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.lang === state.lang));
    updateMarketUI();
    sectionButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.section === state.section));
    deviceButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.device === state.device));
    stage.dataset.device = state.device;
    deviceLabel.textContent = state.device === 'mobile' ? 'Mobile · 390px' : 'Desktop';
  }

  function jumpInsidePreview(section) {
    try {
      const doc = iframe.contentDocument;
      const target = doc && doc.getElementById(section);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    } catch (_) {
      return false;
    }
  }

  marketButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.market = btn.dataset.market;
      localStorage.setItem('sdlive-admin-market', state.market);

      // Rental is intentionally unavailable in the international experience.
      if (state.market === 'international' && state.section === 'rental') {
        state.section = 'hero';
      }

      const applied = applyMarketToPreview();
      updatePreview({ reload: !applied });

      if (applied && state.section !== 'hero') {
        jumpInsidePreview(state.section);
      }
    });
  });

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem('sdlive-admin-lang', state.lang);
      updatePreview();
    });
  });

  deviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.device = btn.dataset.device;
      localStorage.setItem('sdlive-admin-device', state.device);
      updatePreview({ reload: false });
    });
  });

  sectionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.section = btn.dataset.section;
      const jumped = jumpInsidePreview(state.section);
      updatePreview({ reload: !jumped });
    });
  });

  refresh.addEventListener('click', () => {
    try { iframe.contentWindow.location.reload(); }
    catch (_) { iframe.src = currentUrl(true); }
  });

  iframe.addEventListener('load', () => {
    applyMarketToPreview();
    updateMarketUI();

    if (state.section !== 'hero') {
      setTimeout(() => jumpInsidePreview(state.section), 60);
    }
  });

  updatePreview();
})();
