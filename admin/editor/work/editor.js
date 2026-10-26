(() => {
  const $ = (id) => document.getElementById(id);
  const field = (name) => document.querySelector('[data-field="' + name + '"]');
  const keys = ["slug","title","company","client","credit","discipline","kind","area","order",
    "published","featured","coverAlt","fit","video","rightsConfirmed","extra","extraEs","description.en","description.es"];
  let items = [], selected = null, dirty = false, hasSavedDraft = false, busy = false;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const mediaSrc = (path) => path?.startsWith("assets/media/")
    ? "https://media.sdlive.show/" + path.slice("assets/media/".length) : "";
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value != null) node.textContent = value;
    return node;
  };
  function seedItem(item, index) {
    return {
      slug: item.slug, title: item.title, company: item.company, client: item.client || "",
      credit: item.credit, discipline: item.discipline || "", extra: item.extra || "", extraEs: item.extraEs || "", kind: item.kind || "project",
      area: item.area || "technical", featured: !!item.featured, published: true,
      order: index * 10, cover: "", coverAlt: "", fit: "cover",
      description: { en: "", es: "" }, gallery: [], video: "", rightsConfirmed: false
    };
  }
  function current() { return items.find((item) => item.slug === selected) || null; }
  function status(value) { $("status").textContent = value; }
  function toast(value, error = false) {
    const node = el("div", error ? "is-error" : "is-success");
    node.textContent = value; $("toastStack").append(node);
    setTimeout(() => node.remove(), 5500);
  }
  function touch() {
    dirty = true; status("● Cambios sin guardar — todavía no visibles en /work");
    $("save").disabled = busy;
    $("publish").disabled = true;
  }
  function normalizeOrder() {
    items.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    items.forEach((item, index) => { item.order = index * 10; });
  }
  function renderList() {
    const list = $("itemList");
    list.replaceChildren();
    items.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).forEach((item) => {
      const button = el("button", "item-button" + (selected === item.slug ? " active" : ""));
      button.type = "button";
      button.append(el("strong", "", item.title || "(Sin título)"));
      button.append(el("small", "", item.company + " · " + (item.published ? "Visible al publicar" : "Oculto") +
        (item.featured ? " · Featured" : "")));
      button.addEventListener("click", () => { selected = item.slug; renderList(); renderEditor(); });
      list.append(button);
    });
  }
  function renderEditor() {
    const item = current();
    $("editor").hidden = !item;
    ["up","down","remove"].forEach((id) => { $(id).disabled = !item || busy; });
    if (!item) return;
    keys.forEach((name) => {
      const input = field(name);
      const value = name.startsWith("description.") ? item.description?.[name.slice(12)] : item[name];
      if (input.type === "checkbox") input.checked = value === true;
      else input.value = value ?? "";
    });
    $("coverRef").value = item.cover || "";
    const preview = $("coverPreview");
    preview.replaceChildren();
    if (item.cover) {
      const image = el("img"); image.src = mediaSrc(item.cover);
      image.alt = item.coverAlt || item.title;
      image.style.objectFit = item.fit === "contain" ? "contain" : "cover";
      preview.append(image);
    } else preview.textContent = "Sin póster";
    renderGallery();
  }
  function renderGallery() {
    const item = current(), parent = $("gallery"); parent.replaceChildren();
    if (!item) return;
    (item.gallery || []).forEach((image, index) => {
      const row = el("div", "gallery-row");
      const thumb = el("img"); thumb.src = mediaSrc(image.src); thumb.alt = image.alt || "";
      const details = el("div");
      const alt = el("label", "", "Texto alternativo");
      const altInput = el("input"); altInput.value = image.alt || ""; altInput.maxLength = 200;
      altInput.addEventListener("input", () => { image.alt = altInput.value; touch(); });
      alt.append(altInput);
      const caption = el("label", "", "Pie de foto");
      const captionInput = el("input"); captionInput.value = image.caption || ""; captionInput.maxLength = 500;
      captionInput.addEventListener("input", () => { image.caption = captionInput.value; touch(); });
      caption.append(captionInput);
      const actions = el("div", "actions");
      const action = (title, callback) => {
        const button = el("button", "", title); button.type = "button";
        button.addEventListener("click", callback); actions.append(button);
      };
      action("↑", () => { if (index > 0) { [item.gallery[index - 1], item.gallery[index]] =
        [item.gallery[index], item.gallery[index - 1]]; renderGallery(); touch(); } });
      action("↓", () => { if (index + 1 < item.gallery.length) { [item.gallery[index + 1], item.gallery[index]] =
        [item.gallery[index], item.gallery[index + 1]]; renderGallery(); touch(); } });
      action("Quitar", () => { item.gallery.splice(index, 1); renderGallery(); touch(); });
      details.append(alt, caption, actions); row.append(thumb, details); parent.append(row);
    });
  }
  function chooseImage(onSelect) {
    if (!window.SDLiveMediaLibrary?.open) return toast("La biblioteca R2 no está disponible.", true);
    window.SDLiveMediaLibrary.open({ folder: "portfolio", onSelect: (media) => {
      if (!media.logicalPath?.startsWith("assets/media/cms/portfolio/")) {
        return toast("Selecciona una imagen de la carpeta portfolio.", true);
      }
      onSelect(media.logicalPath);
      touch();
    } });
  }
  keys.forEach((name) => {
    const input = field(name);
    const eventType = input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventType, () => {
      const item = current();
      if (!item || busy) return;
      const value = input.type === "checkbox" ? input.checked :
        input.type === "number" ? Number(input.value) : input.value;
      if (name === "slug") {
        // Slug changes the stable public URL and therefore need a confirmation.
        const next = String(value).trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next) || (items.some((other) => other !== item && other.slug === next))) {
          status("El slug debe ser único, con minúsculas, números y guiones.");
          return;
        }
        item.slug = next; selected = next;
      } else if (name.startsWith("description.")) {
        item.description ||= { en: "", es: "" };
        item.description[name.slice(12)] = value;
      } else item[name] = value;
      if (name === "fit" || name === "coverAlt") renderCoverOnly();
      renderList(); touch();
    });
  });
  function renderCoverOnly() {
    const item = current(), image = $("coverPreview").querySelector("img");
    if (image && item) { image.style.objectFit = item.fit; image.alt = item.coverAlt || item.title; }
  }
  $("pickCover").addEventListener("click", () => chooseImage((path) => {
    const item = current(); if (!item) return;
    item.cover = path; renderEditor();
  }));
  $("clearCover").addEventListener("click", () => {
    const item = current(); if (!item) return;
    item.cover = ""; renderEditor(); touch();
  });
  $("addGallery").addEventListener("click", () => chooseImage((path) => {
    const item = current(); if (!item) return;
    item.gallery ||= []; if (item.gallery.length >= 30) return toast("Máximo 30 imágenes.", true);
    item.gallery.push({ src: path, alt: item.title, caption: "" }); renderGallery();
  }));
  $("add").addEventListener("click", () => {
    let count = items.length + 1, slug = "nueva-publicacion-" + count;
    while (items.some((x) => x.slug === slug)) { count++; slug = "nueva-publicacion-" + count; }
    normalizeOrder();
    items.push({ slug, title: "Nueva publicación", company: "Independent", client: "",
      credit: "Por definir", discipline: "", extra: "", extraEs: "", kind: "project", area: "technical",
      featured: false, published: false, order: items.length * 10, cover: "", coverAlt: "",
      fit: "cover", gallery: [], video: "", description: { en: "", es: "" }, rightsConfirmed: false });
    selected = slug; renderList(); renderEditor(); touch();
  });
  $("remove").addEventListener("click", () => {
    const item = current(); if (!item || !confirm('¿Eliminar la ficha "' + item.title + '" del borrador?\nNo elimina archivos R2.')) return;
    items = items.filter((x) => x !== item);
    normalizeOrder(); selected = items[0]?.slug || null;
    renderList(); renderEditor(); touch();
  });
  function move(delta) {
    const item = current(); if (!item) return;
    normalizeOrder();
    const index = items.indexOf(item), target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    items.forEach((row, i) => { row.order = i * 10; });
    renderList(); renderEditor(); touch();
  }
  $("up").addEventListener("click", () => move(-1));
  $("down").addEventListener("click", () => move(1));
  async function request(url, options) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || data.detail || "HTTP " + response.status);
    return data;
  }
  function busyState(state) {
    busy = state;
    $("save").disabled = state;
    $("publish").disabled = state || dirty || !hasSavedDraft;
  }
  $("save").addEventListener("click", async () => {
    if (busy) return;
    busyState(true);
    try {
      const result = await request("/api/admin/work/portfolio", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: { items } })
      });
      items = copy(result.entry.draft.items);
      hasSavedDraft = true; dirty = false;
      status("✓ Borrador guardado en D1. La web pública aún no ha cambiado.");
      renderList(); renderEditor(); toast("Borrador guardado.");
    } catch (error) { status("Error al guardar: " + error.message); toast(error.message, true); }
    finally { busyState(false); }
  });
  $("publish").addEventListener("click", async () => {
    if (busy || dirty || !hasSavedDraft) return;
    if (!confirm("¿Publicar el borrador completo en /work? Las fichas ocultas dejarán de aparecer.")) return;
    busyState(true);
    try {
      await request("/api/admin/work/portfolio/publish", { method: "POST" });
      status("✓ Publicado en D1. Revisa /work y una ficha para verificar el resultado.");
      toast("Catálogo publicado.");
    } catch (error) { status("Error al publicar: " + error.message); toast(error.message, true); }
    finally { busyState(false); }
  });
  $("historyToggle").addEventListener("click", async () => {
    const box = $("history");
    if (!box.hidden) { box.hidden = true; return; }
    try {
      const data = await request("/api/admin/work/portfolio/revisions");
      box.replaceChildren();
      (data.revisions || []).forEach((row) =>
        box.append(el("p", "", "#" + row.id + " · " + row.revision_type + " · " + row.created_at +
          " · " + row.actor_email)));
      box.hidden = false;
    } catch (error) { toast(error.message, true); }
  });
  async function load() {
    try {
      const response = await request("/api/admin/work/portfolio");
      hasSavedDraft = response.entry.source === "cms";
      items = hasSavedDraft ? copy(response.entry.draft.items) :
        (window.SDL_WORK || []).map(seedItem);
      selected = items[0]?.slug || null;
      status(hasSavedDraft ? "✓ Borrador cargado desde D1. Publicar es una acción independiente." :
        "Catálogo inicial de /work cargado. Guarda el borrador antes de publicar.");
      renderList(); renderEditor(); busyState(false);
    } catch (error) {
      status("No se pudo leer el portafolio desde D1: " + error.message);
      $("save").disabled = $("publish").disabled = true;
    }
  }
  load();
})();