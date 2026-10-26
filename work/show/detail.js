(() => {
  const slug = new URLSearchParams(location.search).get("show");
  const $ = (id) => document.getElementById(id);
  let lang = "en", show = null;
  try { lang = localStorage.getItem("sdlive-language-preference") === "es" ? "es" : "en"; } catch {}
  const mediaSrc = (path) => path?.startsWith("assets/media/")
    ? "https://media.sdlive.show/" + path.slice("assets/media/".length) : "";
  const put = (id, value) => { $(id).textContent = value || ""; };
  function render() {
    if (!show) { $("notFound").hidden = false; return; }
    $("notFound").hidden = true;
    $("detailMain").hidden = false;
    $("mediaSection").hidden = false;
    document.title = show.title + " — SD•Live Work";
    document.documentElement.lang = lang;
    put("back", lang === "es" ? "← Todos los trabajos" : "← All Work");
    put("kicker", (show.kind === "piece" ? (lang === "es" ? "Pieza / Portafolio" : "Piece / Work") :
      (lang === "es" ? "Producción / Portafolio" : "Production / Work")));
    put("showTitle", show.title);
    put("posterTitle", show.title);
    put("credit", show.credit);
    put("company", show.company);
    put("role", show.credit);
    put("client", show.client);
    $("client").hidden = $("clientLabel").hidden = !show.client;
    $("extra").hidden = $("extraLabel").hidden = true;
    put("companyLabel", lang === "es" ? "Empresa" : "Company");
    put("roleLabel", lang === "es" ? "Crédito" : "Credit");
    put("typeLabel", lang === "es" ? "Trabajo" : "Work");
    put("clientLabel", lang === "es" ? "Producción" : "Production");
    put("type", show.discipline);
    const desc = show.description?.[lang] || show.description?.en || "";
    put("note", desc || (lang === "es"
      ? "Esta es la ficha inicial. Añadiremos más contexto a medida que se revise el material."
      : "This is the initial production profile. Further details will be added as material is reviewed."));
    const poster = document.querySelector(".detail-poster");
    poster.querySelector("img")?.remove();
    const src = mediaSrc(show.cover);
    if (src) {
      const img = document.createElement("img");
      img.src = src; img.alt = show.coverAlt || show.title;
      img.style.objectFit = show.fit === "contain" ? "contain" : "cover";
      poster.append(img);
      $("posterTitle").hidden = true;
    } else $("posterTitle").hidden = false;

    put("mediaHeading", lang === "es" ? "Material de producción" : "Production material");
    let gallery = $("productionGallery");
    if (!gallery) {
      gallery = document.createElement("div");
      gallery.id = "productionGallery";
      gallery.className = "detail-gallery";
      $("mediaSection").append(gallery);
    }
    gallery.replaceChildren();
    (show.gallery || []).forEach((media) => {
      const source = mediaSrc(media.src);
      if (!source) return;
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.loading = "lazy"; img.src = source; img.alt = media.alt || show.title;
      figure.append(img);
      if (media.caption) { const caption = document.createElement("figcaption"); caption.textContent = media.caption; figure.append(caption); }
      gallery.append(figure);
    });
    const existing = $("productionVideo");
    existing?.remove();
    if (show.video) {
      const video = document.createElement("a");
      video.id = "productionVideo";
      video.className = "detail-video-link";
      video.href = show.video; video.target = "_blank"; video.rel = "noopener noreferrer";
      video.textContent = lang === "es" ? "Ver vídeo de la producción ↗" : "Watch production video ↗";
      $("mediaSection").append(video);
    }
    const hasMedia = Boolean(show.video || (show.gallery || []).length || show.cover);
    put("mediaNote", hasMedia ? "" : (lang === "es"
      ? "El material aparecerá aquí cuando esté autorizado y publicado."
      : "Media will appear here when approved and published."));
    document.querySelectorAll("[data-lang]").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang)));
    try { localStorage.setItem("sdlive-language-preference", lang); } catch {}
  }
  document.querySelectorAll("[data-lang]").forEach((button) =>
    button.addEventListener("click", () => { lang = button.dataset.lang; render(); }));
  async function load() {
    const seed = Array.isArray(window.SDL_WORK) ? window.SDL_WORK : [];
    let items = seed;
    try {
      const response = await fetch("/api/work/portfolio", { cache: "no-store" });
      if (!response.ok) throw new Error("Work API temporarily unavailable");
      const data = await response.json();
      if (data?.source === "cms" && Array.isArray(data.content?.items)) items = data.content.items;
    } catch (error) { console.warn("Work detail: showing static fallback", error); }
    show = items.find((item) => item.slug === slug);
    render();
  }
  load();
})();