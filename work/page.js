(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const mediaSrc = (path) => path && path.startsWith("assets/media/")
    ? "https://media.sdlive.show/" + path.slice("assets/media/".length) : "";
  let records = Array.isArray(window.SDL_WORK) ? window.SDL_WORK : [];
  let area = "all", view = "posters", lang = "en";
  try { lang = localStorage.getItem("sdlive-language-preference") === "es" ? "es" : "en"; } catch {}
  const featured = $("featuredGrid"), groups = $("workGroups"), companiesSelect = $("companyFilter");

  function setLanguage(value) {
    lang = value === "es" ? "es" : "en";
    document.documentElement.lang = lang;
    const stylize = (value) => value.replaceAll("SD.Live",
      '<span class="brand-wordmark-text" aria-label="SD.Live">SD<span class="brand-wordmark-text__dot" aria-hidden="true"></span>Live</span>');
    document.querySelectorAll("[data-en][data-es]").forEach((node) => {
      node.innerHTML = stylize(node.dataset[lang]);
    });
    document.querySelectorAll(".work-footer span").forEach((node) => {
      if (node.dataset.styled) return;
      node.innerHTML = stylize(node.textContent);
      node.dataset.styled = "true";
    });
    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
    try { localStorage.setItem("sdlive-language-preference", lang); } catch {}
  }
  document.querySelectorAll("[data-lang]").forEach((button) =>
    button.addEventListener("click", () => setLanguage(button.dataset.lang)));
  setLanguage(lang);

  const order = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);
  const href = (item) => "/work/show/?show=" + encodeURIComponent(item.slug);
  function poster(item) {
    const src = mediaSrc(item.cover);
    const art = src
      ? '<img loading="lazy" decoding="async" src="' + esc(src) +
        '" alt="' + esc(item.coverAlt || item.title) + '" style="object-fit:' +
        (item.fit === "contain" ? "contain" : "cover") + '">'
      : '<span class="poster-card__fallback">' + esc(item.title) + "</span>";
    return '<a class="poster-card" href="' + href(item) + '" aria-label="' +
      esc(item.title + " — " + item.credit) + '"><div class="poster-card__art">' + art +
      '</div><div class="poster-card__meta"><div class="poster-card__title">' +
      esc(item.title) + '</div><div class="poster-card__credit">' + esc(item.credit) +
      '</div><div class="poster-card__company">' + esc(item.company) + "</div></div></a>";
  }
  function creditRow(item) {
    return '<a class="work-credit-link" href="' + href(item) + '"><strong>' +
      esc(item.title) + '</strong><span>' + esc(item.credit) + '</span><i aria-hidden="true">↗</i></a>';
  }
  function companyNames() {
    return [...new Set(records.map((x) => x.company))].sort((a, b) =>
      a === "Sonolux Creative" ? -1 : b === "Sonolux Creative" ? 1 : a.localeCompare(b));
  }
  function render() {
    const companies = companyNames();
    const currentCompany = companiesSelect.value;
    companiesSelect.replaceChildren(new Option(lang === "es" ? "Todas las empresas" : "All companies", "all"));
    companies.forEach((company) => companiesSelect.add(new Option(company, company)));
    companiesSelect.value = companies.includes(currentCompany) ? currentCompany : "all";
    featured.innerHTML = records.filter((x) => x.featured).sort(order).map(poster).join("");
    const matched = records.filter((x) =>
      (area === "all" || x.area === area ||
        (x.area === "both" && (area === "technical" || area === "artistic"))) &&
      (companiesSelect.value === "all" || companiesSelect.value === x.company));
    groups.innerHTML = companies.map((company) => {
      const items = matched.filter((x) => x.company === company).sort(order);
      if (!items.length) return "";
      return '<section class="work-group"><div class="work-group__head"><h3>' +
        esc(company) + '</h3><span>' + items.length + '</span></div><div class="' +
        (view === "posters" ? "poster-grid" : "work-credits") + '">' +
        items.map(view === "posters" ? poster : creditRow).join("") + "</div></section>";
    }).join("");
    $("noResults").hidden = Boolean(matched.length);
  }
  companiesSelect.addEventListener("change", render);
  document.querySelectorAll(".work-filter").forEach((button) => button.addEventListener("click", () => {
    area = button.dataset.area;
    document.querySelectorAll(".work-filter").forEach((node) =>
      node.setAttribute("aria-pressed", String(node === button)));
    render();
  }));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    view = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((node) =>
      node.setAttribute("aria-pressed", String(node === button)));
    render();
  }));
  render();
  fetch("/api/work/portfolio", { cache: "no-store" })
    .then((response) => { if (!response.ok) throw new Error("Portfolio API unavailable"); return response.json(); })
    .then((data) => {
      if (data?.source === "cms" && Array.isArray(data.content?.items)) {
        records = data.content.items.filter((x) => x.published);
        render();
      }
    })
    .catch((error) => console.warn("Work: showing static portfolio fallback", error));
})();