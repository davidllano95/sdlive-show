(() => {
  if (window.SDLIVE_CORE_SECTIONS_EDITOR) return;
  window.SDLIVE_CORE_SECTIONS_EDITOR = true;

  const iframe = document.getElementById("sitePreview");
  const editorTitle = document.getElementById("editorTitle");
  const editorBody = document.getElementById("editorBody");
  const editorStateChip = document.getElementById("editorStateChip");
  const saveDraftButton = document.getElementById("saveDraft");
  const publishButton = document.getElementById("publishContent");
  const discardButton = document.getElementById("discardChanges");
  const saveIndicator = document.getElementById("saveIndicator");
  const contentStateLabel = document.getElementById("contentStateLabel");
  const footerStatus = document.getElementById("footerStatus");
  const footerDetail = document.getElementById("footerDetail");
  const toastStack = document.getElementById("toastStack");
  const viewTitle = document.getElementById("viewTitle");
  const address = document.getElementById("previewAddress");
  const openLive = document.getElementById("openLive");
  const sectionNav = document.querySelector(".section-nav");
  const selectModeButton = document.getElementById("toggleSelectMode");

  if (!iframe || !editorBody || !saveDraftButton || !publishButton || !discardButton || !sectionNav) return;

  const CORE = new Set(["about", "services", "work", "international"]);
  const LABELS = {
    about: "About",
    services: "Services",
    work: "Selected Work",
    international: "International"
  };
  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";
  const entries = new Map();
  let activeSection = null;
  let busy = false;
  let boundPreviewDocument = null;

  injectStyles();
  const internationalButton = ensureInternationalButton();
  bindSectionButtons();
  bindActions();
  iframe.addEventListener("load", () => {
    boundPreviewDocument = null;
    if (!activeSection) return;
    window.setTimeout(() => {
      applyDraftToPreview(activeSection);
      bindPreviewSelect();
      jumpPreview(activeSection, false);
    }, 120);
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    return JSON.stringify(value);
  }

  function resolveMediaSource(source) {
    const value = String(source || "");
    if (!value.startsWith(LOGICAL_MEDIA_PREFIX)) return value;
    return `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}`;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(response.redirected ? "Access session may have expired." : `Unexpected response (${response.status}).`);
    }
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    return data;
  }

  function showToast(title, detail = "", type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;
    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);
    if (detail) toast.append(document.createTextNode(` ${detail}`));
    toastStack?.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function getAtPath(object, path) {
    return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function setAtPath(object, path, value) {
    const parts = path.split(".");
    let cursor = object;
    parts.forEach((key, index) => {
      const final = index === parts.length - 1;
      if (final) cursor[key] = value;
      else {
        if (cursor[key] == null) cursor[key] = /^\d+$/.test(parts[index + 1]) ? [] : {};
        cursor = cursor[key];
      }
    });
  }

  function sectionState(section = activeSection) {
    return entries.get(section) || null;
  }

  function working(section = activeSection) {
    return sectionState(section)?.workingDraft || null;
  }

  function isDirty(section = activeSection) {
    const current = sectionState(section);
    return Boolean(current && stable(current.workingDraft) !== stable(current.savedDraft));
  }

  function ensureInternationalButton() {
    let button = sectionNav.querySelector('[data-section="international"]');
    if (button) return button;
    button = document.createElement("button");
    button.className = "section-link";
    button.dataset.section = "international";
    button.type = "button";
    button.textContent = "International";
    const services = sectionNav.querySelector('[data-section="services"]');
    if (services?.nextSibling) services.parentNode.insertBefore(button, services.nextSibling);
    else sectionNav.appendChild(button);
    return button;
  }

  function bindSectionButtons() {
    [...document.querySelectorAll("[data-section]")].forEach((button) => {
      if (button.dataset.coreSectionsBound === "true") return;
      button.dataset.coreSectionsBound = "true";
      button.addEventListener("click", () => {
        const section = button.dataset.section;
        if (CORE.has(section)) {
          window.setTimeout(() => void activate(section), 0);
        } else {
          deactivate();
        }
      });
    });

    internationalButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void activate("international");
    });
  }

  function bindActions() {
    saveDraftButton.addEventListener("click", interceptSave, true);
    publishButton.addEventListener("click", interceptPublish, true);
    discardButton.addEventListener("click", interceptDiscard, true);
  }

  function interceptSave(event) {
    if (!activeSection) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void saveDraft();
  }

  function interceptPublish(event) {
    if (!activeSection) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void publish();
  }

  function interceptDiscard(event) {
    if (!activeSection) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    discard();
  }

  async function loadSection(section, { force = false } = {}) {
    const existing = entries.get(section);
    if (existing?.loaded && !force) return existing;
    entries.set(section, { ...(existing || {}), loading: true, loaded: false });
    updateStateUI();
    const [content, revisions] = await Promise.all([
      fetchJson(`/api/admin/content/${section}`),
      fetchJson(`/api/admin/content/${section}/revisions`).catch(() => ({ revisions: [] }))
    ]);
    const entry = content.entry;
    const next = {
      loaded: true,
      loading: false,
      entry,
      savedDraft: clone(entry.draft),
      workingDraft: clone(entry.draft),
      revisions: revisions.revisions || []
    };
    entries.set(section, next);
    return next;
  }

  async function activate(section) {
    if (!CORE.has(section)) return;
    activeSection = section;
    setActiveNav(section);
    if (editorTitle) editorTitle.textContent = `${LABELS[section]} CMS`;
    if (viewTitle) viewTitle.textContent = LABELS[section];
    if (footerStatus) footerStatus.textContent = `${LABELS[section]} editor connected to D1${section === "about" || section === "work" ? " + R2" : ""}.`;
    if (footerDetail) footerDetail.textContent = "Preview changes stay local until Save Draft. Publish updates the public Home through edge SSR.";
    jumpPreview(section, true);

    try {
      await loadSection(section);
      if (activeSection !== section) return;
      renderEditor();
      applyDraftToPreview(section);
      bindPreviewSelect();
      updateStateUI();
    } catch (error) {
      showToast(`Could not load ${LABELS[section]}.`, error.message, "error");
      if (editorBody) editorBody.innerHTML = `<p class="field-help">${escapeHtml(error.message)}</p>`;
      updateStateUI();
    }
  }

  function deactivate() {
    activeSection = null;
  }

  function setActiveNav(section) {
    document.querySelectorAll(".section-link[data-section]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.section === section);
    });
  }

  function jumpPreview(section, smooth = true) {
    try {
      const doc = iframe.contentDocument;
      const target = doc?.getElementById(section);
      if (target) target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      const hash = section === "hero" ? "" : `#${section}`;
      if (address) address.textContent = `sdlive.show/${hash}`;
      if (openLive) openLive.href = `/${hash}`;
      return Boolean(target);
    } catch {
      return false;
    }
  }

  function previewLanguage(doc) {
    return String(doc?.documentElement?.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function applyLocalized(element, localized, lang, rich = false) {
    element.dataset.en = localized?.en || "";
    element.dataset.es = localized?.es || "";
    if (rich) element.innerHTML = localized?.[lang] || "";
    else element.textContent = localized?.[lang] || "";
  }

  function brandMentions(root) {
    try {
      iframe.contentWindow?.styleBrandMentions?.(root);
    } catch {}
  }

  function makeImage(doc, image, lang) {
    const img = doc.createElement("img");
    img.src = resolveMediaSource(image.src);
    img.alt = typeof image.alt === "object" ? image.alt[lang] || "" : image.alt || "";
    img.loading = "lazy";
    if (Number(image.width) > 0) img.width = Number(image.width);
    if (Number(image.height) > 0) img.height = Number(image.height);
    const scale = Math.min(1.8, Math.max(0.5, Number(image.scale) || 1));
    if (Math.abs(scale - 1) > 0.0001) img.style.scale = String(scale);
    return img;
  }

  function applyDraftToPreview(section = activeSection) {
    const draft = working(section);
    if (!draft) return false;
    try {
      const doc = iframe.contentDocument;
      const target = doc?.getElementById(section);
      if (!doc || !target) return false;
      const lang = previewLanguage(doc);
      if (section === "about") renderAboutPreview(doc, target, draft, lang);
      else if (section === "services") renderServicesPreview(doc, target, draft, lang);
      else if (section === "work") renderWorkPreview(doc, target, draft, lang);
      else renderInternationalPreview(doc, target, draft, lang);
      target.dataset.contentSource = "admin-draft";
      brandMentions(target);
      bindPreviewSelect();
      return true;
    } catch {
      return false;
    }
  }

  function renderAboutPreview(doc, section, draft, lang) {
    const container = doc.createElement("div");
    container.className = "container about-grid";
    const photo = doc.createElement("div");
    photo.className = "about-photo glass reveal is-visible";
    photo.dataset.cmsEditorKey = "about:image";
    photo.appendChild(makeImage(doc, draft.image, lang));
    const copy = doc.createElement("div");
    copy.className = "about-copy reveal is-visible";
    const eyebrow = doc.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.dataset.cmsEditorKey = "about:eyebrow";
    applyLocalized(eyebrow, draft.eyebrow, lang);
    const title = doc.createElement("h2");
    title.dataset.cmsEditorKey = "about:title";
    applyLocalized(title, draft.title, lang);
    copy.append(eyebrow, title);
    draft.paragraphs.forEach((paragraph, index) => {
      const p = doc.createElement("p");
      p.dataset.cmsEditorKey = `about:paragraph:${index}`;
      applyLocalized(p, paragraph, lang, true);
      copy.appendChild(p);
    });
    container.append(photo, copy);
    section.replaceChildren(container);
  }

  function renderServicesPreview(doc, section, draft, lang) {
    const container = doc.createElement("div");
    container.className = "container";
    const head = doc.createElement("div");
    head.className = "section-head reveal is-visible";
    const eyebrow = doc.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.dataset.cmsEditorKey = "services:eyebrow";
    applyLocalized(eyebrow, draft.eyebrow, lang);
    const title = doc.createElement("h2");
    title.dataset.cmsEditorKey = "services:title";
    applyLocalized(title, draft.title, lang);
    head.append(eyebrow, title);

    const filters = doc.createElement("div");
    filters.className = "filter-pills";
    filters.setAttribute("role", "group");
    draft.filters.forEach((filter, index) => {
      const button = doc.createElement("button");
      button.type = "button";
      button.className = `filter-btn${index === 0 ? " is-active" : ""}`;
      button.dataset.filter = filter.id;
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      applyLocalized(button, filter.label, lang);
      filters.appendChild(button);
    });

    const grid = doc.createElement("div");
    grid.className = "services-grid";
    draft.items.filter((item) => item.visible).forEach((item, visibleIndex) => {
      const card = doc.createElement("article");
      card.className = "service-card glass reveal is-visible";
      if (item.market === "colombia") card.classList.add("local-market-only");
      if (item.market === "international") card.classList.add("international-market-only");
      card.dataset.category = item.categories.join(" ");
      card.dataset.serviceId = item.id;
      card.dataset.cmsEditorKey = `service:${item.id}`;
      const idx = doc.createElement("span");
      idx.className = "service-index";
      idx.textContent = String(visibleIndex + 1).padStart(2, "0");
      const h3 = doc.createElement("h3");
      applyLocalized(h3, item.title, lang);
      const p = doc.createElement("p");
      applyLocalized(p, item.description, lang);
      card.append(idx, h3, p);
      if (item.scopeNote?.[lang]) {
        const note = doc.createElement("p");
        note.className = "service-rate-note service-scope-note";
        applyLocalized(note, item.scopeNote, lang);
        card.appendChild(note);
      }
      for (const market of ["colombia", "international"]) {
        const pricing = item.pricing?.[market];
        if (!pricing || (!pricing.label?.[lang] && !pricing.note?.[lang])) continue;
        const wrap = doc.createElement("div");
        wrap.className = market === "colombia" ? "local-market-only" : "international-market-only service-project-quote";
        if (pricing.label?.[lang]) {
          const rate = doc.createElement("p");
          rate.className = "service-rate";
          applyLocalized(rate, pricing.label, lang);
          wrap.appendChild(rate);
        }
        if (pricing.note?.[lang]) {
          const note = doc.createElement("p");
          note.className = "service-rate-note";
          applyLocalized(note, pricing.note, lang);
          wrap.appendChild(note);
        }
        card.appendChild(wrap);
      }
      const caps = doc.createElement("ul");
      caps.className = "service-caps";
      item.capabilities.forEach((capability) => {
        const li = doc.createElement("li");
        li.textContent = capability;
        caps.appendChild(li);
      });
      card.appendChild(caps);
      grid.appendChild(card);
    });

    const detail = doc.createElement("div");
    detail.className = "section-detail-link reveal is-visible";
    const link = doc.createElement("a");
    link.className = "btn btn-ghost";
    applyLocalized(link, draft.detailLink.label, lang);
    link.dataset.enHref = draft.detailLink.href.en;
    link.dataset.esHref = draft.detailLink.href.es;
    link.href = draft.detailLink.href[lang];
    detail.appendChild(link);
    container.append(head, filters, grid, detail);
    section.replaceChildren(container);
    bindServiceFilters(section);
  }

  function bindServiceFilters(section) {
    section.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter || "all";
        section.querySelectorAll(".filter-btn").forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle("is-active", active);
          candidate.setAttribute("aria-pressed", active ? "true" : "false");
        });
        section.querySelectorAll(".service-card").forEach((card) => {
          card.hidden = filter !== "all" && !String(card.dataset.category || "").split(/\s+/).includes(filter);
        });
      });
    });
  }

  function renderWorkPreview(doc, section, draft, lang) {
    const container = doc.createElement("div");
    container.className = "container";
    const head = doc.createElement("div");
    head.className = "section-head reveal is-visible";
    const eyebrow = doc.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.dataset.cmsEditorKey = "work:eyebrow";
    applyLocalized(eyebrow, draft.eyebrow, lang);
    const title = doc.createElement("h2");
    title.dataset.cmsEditorKey = "work:title";
    applyLocalized(title, draft.title, lang);
    const intro = doc.createElement("p");
    intro.dataset.cmsEditorKey = "work:intro";
    applyLocalized(intro, draft.intro, lang);
    head.append(eyebrow, title, intro);
    const grid = doc.createElement("div");
    grid.className = "work-grid";
    draft.items.filter((item) => item.visible).forEach((item) => {
      const card = doc.createElement("article");
      card.className = "work-card glass reveal is-visible";
      card.dataset.workId = item.id;
      card.dataset.cmsEditorKey = `work:${item.id}`;
      const imageWrap = doc.createElement("div");
      imageWrap.className = item.image.presentation === "logo" ? "work-image work-image--logo" : "work-image";
      imageWrap.appendChild(makeImage(doc, item.image, lang));
      const body = doc.createElement("div");
      body.className = "work-body";
      const role = doc.createElement("span");
      role.className = "work-role";
      applyLocalized(role, item.role, lang);
      const h3 = doc.createElement("h3");
      applyLocalized(h3, item.title, lang);
      const p = doc.createElement("p");
      applyLocalized(p, item.description, lang);
      const tags = doc.createElement("ul");
      tags.className = "work-tags";
      item.tags.forEach((tag) => {
        const li = doc.createElement("li");
        li.textContent = tag;
        tags.appendChild(li);
      });
      const actions = doc.createElement("div");
      actions.className = "work-actions";
      const link = doc.createElement("a");
      link.className = "quick-view-btn";
      applyLocalized(link, item.cta.label, lang);
      link.dataset.enHref = item.cta.href.en;
      link.dataset.esHref = item.cta.href.es;
      link.href = item.cta.href[lang];
      actions.appendChild(link);
      body.append(role, h3, p, tags, actions);
      card.append(imageWrap, body);
      grid.appendChild(card);
    });
    container.append(head, grid);
    section.replaceChildren(container);
  }

  function renderInternationalPreview(doc, section, draft, lang) {
    const container = doc.createElement("div");
    container.className = "container";
    const panel = doc.createElement("div");
    panel.className = "international-quote-panel glass reveal is-visible";
    const copy = doc.createElement("div");
    const eyebrow = doc.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.dataset.cmsEditorKey = "international:eyebrow";
    applyLocalized(eyebrow, draft.eyebrow, lang);
    const title = doc.createElement("h2");
    title.dataset.cmsEditorKey = "international:title";
    applyLocalized(title, draft.title, lang);
    const body = doc.createElement("p");
    body.dataset.cmsEditorKey = "international:body";
    applyLocalized(body, draft.body, lang);
    copy.append(eyebrow, title, body);
    const link = doc.createElement("a");
    link.className = "btn btn-primary";
    link.dataset.cmsEditorKey = "international:cta";
    applyLocalized(link, draft.cta.label, lang);
    link.href = draft.cta.href[lang];
    link.dataset.enHref = draft.cta.href.en;
    link.dataset.esHref = draft.cta.href.es;
    panel.append(copy, link);
    container.appendChild(panel);
    section.replaceChildren(container);
  }

  function markDirty() {
    applyDraftToPreview();
    updateStateUI();
  }

  function renderEditor() {
    const draft = working();
    if (!activeSection || !draft) return;
    editorBody.replaceChildren();
    if (activeSection === "about") renderAboutEditor(draft);
    else if (activeSection === "services") renderServicesEditor(draft);
    else if (activeSection === "work") renderWorkEditor(draft);
    else renderInternationalEditor(draft);
    updateStateUI();
  }

  function renderAboutEditor(draft) {
    const head = detailsSection("About heading", true);
    head.content.append(
      localizedField("Eyebrow", "eyebrow"),
      localizedField("Title", "title")
    );
    editorBody.appendChild(head.details);

    const copy = detailsSection(`Biography · ${draft.paragraphs.length} paragraphs`, true);
    draft.paragraphs.forEach((paragraph, index) => {
      const item = itemBlock(`Paragraph ${index + 1}`, `about:paragraph:${index}`);
      item.body.appendChild(localizedField("Copy", `paragraphs.${index}`, true, 7));
      item.actions.append(
        miniButton("↑", () => moveArrayItem("paragraphs", index, -1), index === 0),
        miniButton("↓", () => moveArrayItem("paragraphs", index, 1), index === draft.paragraphs.length - 1),
        miniButton("Delete", () => deleteArrayItem("paragraphs", index), draft.paragraphs.length <= 1, true)
      );
      copy.content.appendChild(item.root);
    });
    copy.content.appendChild(miniButton("+ Add paragraph", () => {
      draft.paragraphs.push({ en: "New paragraph", es: "Nuevo párrafo" });
      markDirty();
      renderEditor();
    }));
    editorBody.appendChild(copy.details);

    const media = detailsSection("Portrait / production photo", true);
    media.content.append(
      localizedField("Alt text", "image.alt"),
      mediaControls({ path: "image", folder: "about", label: "About image" }),
      scaleControl("Image size", "image.scale")
    );
    editorBody.appendChild(media.details);
  }

  function renderServicesEditor(draft) {
    const head = detailsSection("Services heading", true);
    head.content.append(localizedField("Eyebrow", "eyebrow"), localizedField("Title", "title"));
    editorBody.appendChild(head.details);

    const filters = detailsSection("Filter labels", false);
    draft.filters.forEach((filter, index) => {
      filters.content.appendChild(localizedField(filter.id, `filters.${index}.label`));
    });
    editorBody.appendChild(filters.details);

    const collection = detailsSection(`Service cards · ${draft.items.length}`, true);
    draft.items.forEach((item, index) => {
      const block = itemBlock(item.title.en || item.id, `service:${item.id}`);
      block.actions.append(
        miniButton("↑", () => moveArrayItem("items", index, -1), index === 0),
        miniButton("↓", () => moveArrayItem("items", index, 1), index === draft.items.length - 1),
        miniButton("Delete", () => deleteArrayItem("items", index), draft.items.length <= 1, true)
      );
      block.body.append(
        localizedField("Title", `items.${index}.title`),
        localizedField("Description", `items.${index}.description`, true, 5),
        localizedField("Scope note", `items.${index}.scopeNote`, true, 4),
        commaField("Categories", `items.${index}.categories`, "corporate, theatre, broadcast, social"),
        commaField("Capabilities", `items.${index}.capabilities`, "FOH / Monitors, RF Coordination"),
        selectField("Market", `items.${index}.market`, ["all", "colombia", "international"]),
        booleanField("Visible publicly", `items.${index}.visible`),
        localizedField("COL price / quote", `items.${index}.pricing.colombia.label`),
        localizedField("COL price note", `items.${index}.pricing.colombia.note`),
        localizedField("INT price / quote", `items.${index}.pricing.international.label`),
        localizedField("INT price note", `items.${index}.pricing.international.note`)
      );
      collection.content.appendChild(block.root);
    });
    collection.content.appendChild(miniButton("+ Add service", () => addService()));
    editorBody.appendChild(collection.details);

    const detail = detailsSection("Section detail link", false);
    detail.content.append(
      localizedField("Button label", "detailLink.label"),
      localizedField("Button href", "detailLink.href")
    );
    editorBody.appendChild(detail.details);
  }

  function addService() {
    const draft = working();
    let index = 1;
    const ids = new Set(draft.items.map((item) => item.id));
    while (ids.has(`service-${index}`)) index += 1;
    draft.items.push({
      id: `service-${index}`,
      title: { en: "New service", es: "Nuevo servicio" },
      description: { en: "Describe the service.", es: "Describe el servicio." },
      scopeNote: { en: "", es: "" },
      categories: ["corporate"],
      capabilities: ["Capability"],
      market: "all",
      visible: true,
      pricing: {
        colombia: { label: { en: "", es: "" }, note: { en: "", es: "" } },
        international: { label: { en: "", es: "" }, note: { en: "", es: "" } }
      }
    });
    markDirty();
    renderEditor();
  }

  function renderWorkEditor(draft) {
    const head = detailsSection("Selected Work heading", true);
    head.content.append(
      localizedField("Eyebrow", "eyebrow"),
      localizedField("Title", "title"),
      localizedField("Intro", "intro", true, 5)
    );
    editorBody.appendChild(head.details);

    const collection = detailsSection(`Work cards · ${draft.items.length}`, true);
    draft.items.forEach((item, index) => {
      const block = itemBlock(item.title.en || item.id, `work:${item.id}`);
      block.actions.append(
        miniButton("↑", () => moveArrayItem("items", index, -1), index === 0),
        miniButton("↓", () => moveArrayItem("items", index, 1), index === draft.items.length - 1),
        miniButton("Delete", () => deleteArrayItem("items", index), draft.items.length <= 1, true)
      );
      block.body.append(
        localizedField("Role / credit", `items.${index}.role`),
        localizedField("Title", `items.${index}.title`),
        localizedField("Description", `items.${index}.description`, true, 5),
        commaField("Tags", `items.${index}.tags`, "Sound Design, Show Systems"),
        booleanField("Visible publicly", `items.${index}.visible`),
        selectField("Image presentation", `items.${index}.image.presentation`, ["logo", "cover"]),
        simpleField("Image alt", `items.${index}.image.alt`),
        mediaControls({ path: `items.${index}.image`, folder: "portfolio", label: `${item.title.en || "Work"} image` }),
        scaleControl("Image size", `items.${index}.image.scale`),
        localizedField("CTA label", `items.${index}.cta.label`),
        localizedField("CTA href", `items.${index}.cta.href`)
      );
      collection.content.appendChild(block.root);
    });
    collection.content.appendChild(miniButton("+ Add work card", () => addWorkItem()));
    editorBody.appendChild(collection.details);
  }

  function addWorkItem() {
    const draft = working();
    let index = 1;
    const ids = new Set(draft.items.map((item) => item.id));
    while (ids.has(`work-${index}`)) index += 1;
    draft.items.push({
      id: `work-${index}`,
      role: { en: "Role / collaboration", es: "Rol / colaboración" },
      title: { en: "New work item", es: "Nuevo trabajo" },
      description: { en: "Describe the project or collaboration.", es: "Describe el proyecto o la colaboración." },
      tags: ["Audio"],
      image: { src: "assets/images/content-placeholder.svg", alt: "", width: 1200, height: 800, scale: 1, presentation: "cover" },
      cta: { label: { en: "Explore →", es: "Explorar →" }, href: { en: "#contact", es: "#contact" } },
      visible: true
    });
    markDirty();
    renderEditor();
  }

  function renderInternationalEditor() {
    const section = detailsSection("International productions", true);
    section.content.append(
      localizedField("Eyebrow", "eyebrow"),
      localizedField("Title", "title"),
      localizedField("Body", "body", true, 7),
      localizedField("CTA label", "cta.label"),
      localizedField("CTA href", "cta.href")
    );
    editorBody.appendChild(section.details);
  }

  function detailsSection(title, open = false) {
    const details = document.createElement("details");
    details.className = "editor-section";
    details.open = open;
    const summary = document.createElement("summary");
    summary.textContent = title;
    const content = document.createElement("div");
    content.className = "editor-section-content";
    details.append(summary, content);
    return { details, content };
  }

  function itemBlock(title, key) {
    const root = document.createElement("div");
    root.className = "core-editor-item";
    root.dataset.coreEditorKey = key;
    const head = document.createElement("div");
    head.className = "core-editor-item-head";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const actions = document.createElement("div");
    actions.className = "core-editor-item-actions";
    head.append(strong, actions);
    const body = document.createElement("div");
    body.className = "core-editor-item-body";
    root.append(head, body);
    return { root, actions, body };
  }

  function localizedField(label, path, multiline = false, rows = 4) {
    const wrapper = document.createElement("div");
    wrapper.className = "field-grid field-grid--full";
    for (const lang of ["en", "es"]) {
      const field = document.createElement("div");
      field.className = "field";
      const fieldLabel = document.createElement("label");
      const language = document.createElement("span");
      language.className = "field-language";
      language.textContent = lang.toUpperCase();
      fieldLabel.append(language, document.createTextNode(label));
      const input = document.createElement(multiline ? "textarea" : "input");
      if (!multiline) input.type = "text";
      else input.rows = rows;
      const fullPath = `${path}.${lang}`;
      input.value = getAtPath(working(), fullPath) ?? "";
      input.addEventListener("input", () => {
        ensureOptionalPath(path);
        setAtPath(working(), fullPath, input.value);
        markDirty();
      });
      field.append(fieldLabel, input);
      wrapper.appendChild(field);
    }
    return wrapper;
  }

  function ensureOptionalPath(path) {
    if (!path.includes(".pricing.")) return;
    const parts = path.split(".");
    const itemIndex = Number(parts[1]);
    const market = parts[3];
    const item = working().items[itemIndex];
    item.pricing ||= {};
    item.pricing[market] ||= { label: { en: "", es: "" }, note: { en: "", es: "" } };
  }

  function simpleField(label, path) {
    const field = document.createElement("div");
    field.className = "field field--full";
    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.value = getAtPath(working(), path) ?? "";
    input.addEventListener("input", () => {
      setAtPath(working(), path, input.value);
      markDirty();
    });
    field.append(fieldLabel, input);
    return field;
  }

  function commaField(label, path, placeholder = "") {
    const field = simpleField(label, path);
    const input = field.querySelector("input");
    input.value = (getAtPath(working(), path) || []).join(", ");
    input.placeholder = placeholder;
    input.replaceWith(input.cloneNode(true));
    const replacement = field.querySelector("input");
    replacement.addEventListener("input", () => {
      setAtPath(working(), path, replacement.value.split(",").map((value) => value.trim()).filter(Boolean));
      markDirty();
    });
    return field;
  }

  function selectField(label, path, options) {
    const field = document.createElement("div");
    field.className = "field field--full";
    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;
    const select = document.createElement("select");
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = getAtPath(working(), path) ?? options[0];
    select.addEventListener("change", () => {
      setAtPath(working(), path, select.value);
      markDirty();
    });
    field.append(fieldLabel, select);
    return field;
  }

  function booleanField(label, path) {
    const row = document.createElement("label");
    row.className = "core-editor-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = getAtPath(working(), path) !== false;
    input.addEventListener("change", () => {
      setAtPath(working(), path, input.checked);
      markDirty();
    });
    row.append(input, document.createTextNode(label));
    return row;
  }

  function scaleControl(label, path) {
    const field = document.createElement("div");
    field.className = "field field--full";
    const fieldLabel = document.createElement("label");
    const value = document.createElement("span");
    value.className = "core-scale-value";
    const range = document.createElement("input");
    range.type = "range";
    range.min = "0.5";
    range.max = "1.8";
    range.step = "0.05";
    range.value = String(Number(getAtPath(working(), path)) || 1);
    const sync = () => value.textContent = `${Math.round(Number(range.value) * 100)}%`;
    sync();
    range.addEventListener("input", () => {
      setAtPath(working(), path, Number(range.value));
      sync();
      markDirty();
    });
    fieldLabel.append(document.createTextNode(label), value);
    field.append(fieldLabel, range);
    return field;
  }

  function mediaControls({ path, folder, label }) {
    const block = document.createElement("div");
    block.className = "core-media-block";
    const source = document.createElement("code");
    source.textContent = getAtPath(working(), `${path}.src`) || "No image";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/png,image/jpeg,image/webp";
    file.hidden = true;
    file.addEventListener("change", () => {
      const [selected] = file.files || [];
      file.value = "";
      if (selected) void uploadMedia(path, folder, selected, label);
    });
    const button = miniButton(getAtPath(working(), `${path}.src`) ? "Replace image" : "Upload image", () => file.click());
    block.append(source, button, file);
    return block;
  }

  async function uploadMedia(path, folder, file, label) {
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      showToast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      showToast("Image too large.", "Maximum upload size is 5 MB.", "error");
      return;
    }
    busy = true;
    updateStateUI();
    try {
      const form = new FormData();
      form.set("folder", folder);
      form.set("file", file);
      const data = await fetchJson("/api/admin/media/upload", { method: "POST", body: form });
      const image = getAtPath(working(), path) || {};
      image.src = `${LOGICAL_MEDIA_PREFIX}${data.media.key}`;
      image.width = Number(image.width) > 0 ? Number(image.width) : 1200;
      image.height = Number(image.height) > 0 ? Number(image.height) : 800;
      image.scale = Number(image.scale) || 1;
      setAtPath(working(), path, image);
      markDirty();
      renderEditor();
      showToast(`${label} uploaded to R2.`, "Save Draft to keep the new reference.");
    } catch (error) {
      showToast("Upload failed.", error.message, "error");
    } finally {
      busy = false;
      updateStateUI();
    }
  }

  function miniButton(label, handler, disabled = false, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `core-mini-button${danger ? " is-danger" : ""}`;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function moveArrayItem(path, index, delta) {
    const array = getAtPath(working(), path);
    const next = index + delta;
    if (!Array.isArray(array) || next < 0 || next >= array.length) return;
    const [item] = array.splice(index, 1);
    array.splice(next, 0, item);
    markDirty();
    renderEditor();
  }

  function deleteArrayItem(path, index) {
    const array = getAtPath(working(), path);
    if (!Array.isArray(array) || array.length <= 1) return;
    array.splice(index, 1);
    markDirty();
    renderEditor();
  }

  async function saveDraft() {
    if (!activeSection || busy || !working()) return;
    busy = true;
    updateStateUI();
    try {
      const data = await fetchJson(`/api/admin/content/${activeSection}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: working() })
      });
      const current = sectionState();
      current.entry = data.entry;
      current.savedDraft = clone(data.entry.draft);
      current.workingDraft = clone(data.entry.draft);
      showToast(`${LABELS[activeSection]} Draft saved.`, "Public Home is unchanged until Publish.");
      renderEditor();
    } catch (error) {
      showToast("Save failed.", error.message, "error");
    } finally {
      busy = false;
      updateStateUI();
    }
  }

  async function publish() {
    if (!activeSection || busy || !working()) return;
    if (isDirty()) {
      showToast("Save Draft first.", "Publish uses the saved Draft in D1.", "error");
      return;
    }
    busy = true;
    updateStateUI();
    try {
      const data = await fetchJson(`/api/admin/content/${activeSection}/publish`, { method: "POST" });
      const current = sectionState();
      current.entry = data.entry;
      current.savedDraft = clone(data.entry.draft);
      current.workingDraft = clone(data.entry.draft);
      showToast(`${LABELS[activeSection]} published.`, "The public Home now reads this Published version at the edge.");
      renderEditor();
    } catch (error) {
      showToast("Publish failed.", error.message, "error");
    } finally {
      busy = false;
      updateStateUI();
    }
  }

  function discard() {
    const current = sectionState();
    if (!current?.savedDraft || busy) return;
    current.workingDraft = clone(current.savedDraft);
    renderEditor();
    applyDraftToPreview();
    showToast("Unsaved preview changes discarded.");
  }

  function updateStateUI() {
    if (!activeSection) return;
    const current = sectionState();
    const loading = current?.loading;
    const dirty = isDirty();
    const unpublished = Boolean(current?.entry?.hasUnpublishedChanges);
    saveDraftButton.disabled = Boolean(busy || loading || !dirty);
    publishButton.disabled = Boolean(busy || loading || dirty || (!unpublished && current?.entry?.source === "cms"));
    discardButton.disabled = Boolean(busy || loading || !dirty);
    if (editorStateChip) {
      editorStateChip.textContent = loading ? "Loading" : dirty ? "Unsaved" : unpublished ? "Draft saved" : "Published";
      editorStateChip.classList.toggle("is-warning", dirty || unpublished);
    }
    if (saveIndicator) saveIndicator.textContent = busy ? "Working…" : dirty ? "Unsaved preview changes" : unpublished ? "Draft differs from Published" : "Draft and Published in sync";
    if (contentStateLabel) contentStateLabel.textContent = dirty ? "Unsaved" : unpublished ? "Draft" : "Published";
  }

  function bindPreviewSelect() {
    if (!activeSection) return;
    let doc;
    try { doc = iframe.contentDocument; } catch { return; }
    if (!doc || boundPreviewDocument === doc) return;
    boundPreviewDocument = doc;
    doc.addEventListener("click", (event) => {
      if (!activeSection || selectModeButton?.getAttribute("aria-pressed") === "false") return;
      const target = event.target.closest?.("[data-cms-editor-key]");
      if (!target) return;
      const key = target.dataset.cmsEditorKey;
      const belongs = key?.startsWith(`${activeSection}:`) || (activeSection === "services" && key?.startsWith("service:")) || (activeSection === "work" && key?.startsWith("work:"));
      if (!belongs) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      selectEditorKey(key);
    }, true);
  }

  function selectEditorKey(key) {
    const selector = `[data-core-editor-key="${CSS.escape(key)}"]`;
    const exact = editorBody.querySelector(selector);
    const fallback = key.includes(":") ? editorBody.querySelector(`[data-core-editor-key="${CSS.escape(key.split(":").slice(0, 2).join(":"))}"]`) : null;
    const target = exact || fallback;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("is-selected");
      window.setTimeout(() => target.classList.remove("is-selected"), 1600);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function injectStyles() {
    if (document.getElementById("core-sections-editor-styles")) return;
    const style = document.createElement("style");
    style.id = "core-sections-editor-styles";
    style.textContent = `
      .core-editor-item{border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:10px;background:rgba(255,255,255,.025);margin:0 0 10px;transition:border-color .2s,background .2s}
      .core-editor-item.is-selected{border-color:rgba(160,137,229,.85);background:rgba(160,137,229,.08)}
      .core-editor-item-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .core-editor-item-head strong{font-size:11px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .core-editor-item-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .core-editor-item-body{display:grid;gap:9px}
      .core-mini-button{border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(255,255,255,.05);color:inherit;padding:6px 8px;font:inherit;font-size:10px;cursor:pointer}
      .core-mini-button:hover:not(:disabled){border-color:rgba(160,137,229,.55);background:rgba(160,137,229,.12)}
      .core-mini-button.is-danger:hover:not(:disabled){border-color:rgba(255,107,74,.6);background:rgba(255,107,74,.1)}
      .core-mini-button:disabled{opacity:.35;cursor:not-allowed}
      .core-editor-check{display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(244,245,247,.75)}
      .core-media-block{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
      .core-media-block code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:rgba(244,245,247,.52)}
      .core-scale-value{float:right;color:rgba(244,245,247,.48);font-size:10px}
      .field select{width:100%;min-height:38px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#0c0d13;color:inherit;padding:8px}
    `;
    document.head.appendChild(style);
  }
})();
