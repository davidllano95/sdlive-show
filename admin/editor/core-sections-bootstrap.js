(() => {
  if (window.SDLIVE_CORE_SECTIONS_BOOTSTRAP) return;
  window.SDLIVE_CORE_SECTIONS_BOOTSTRAP = true;

  const sectionNav = document.querySelector(".section-nav");
  if (!sectionNav || sectionNav.querySelector('[data-section="international"]')) return;

  const button = document.createElement("button");
  button.className = "section-link";
  button.dataset.section = "international";
  // core-sections-editor owns this dynamically added button. The base Admin
  // script took its section-button snapshot before this module was loaded.
  // Pre-mark it so core-sections-editor does not also attach its generic
  // handler in addition to the dedicated International handler.
  button.dataset.coreSectionsBound = "true";
  button.type = "button";
  button.textContent = "International";

  const services = sectionNav.querySelector('[data-section="services"]');
  if (services?.nextSibling) {
    sectionNav.insertBefore(button, services.nextSibling);
  } else {
    sectionNav.appendChild(button);
  }
})();
