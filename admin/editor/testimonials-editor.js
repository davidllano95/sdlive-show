(() => {
  if (window.SDLIVE_TESTIMONIALS_EDITOR) return;
  window.SDLIVE_TESTIMONIALS_EDITOR = true;

  const sectionButton = document.querySelector('[data-section="testimonials"]');
  const allSectionButtons = [...document.querySelectorAll("[data-section]")];
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
  const selectionName = document.getElementById("selectionName");
  const selectionSelector = document.getElementById("selectionSelector");
  const selectionHint = document.getElementById("selectionHint");
  const selectModeButton = document.getElementById("toggleSelectMode");

  if (
    !sectionButton ||
    !iframe ||
    !editorBody ||
    !saveDraftButton ||
    !publishButton ||
    !discardButton
  ) {
    return;
  }

  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";

  const state = {
    active: false,
    loaded: false,
    loading: false,
    busy: false,
    entry: null,
    savedDraft: null,
    workingDraft: null,
    revisions: [],
    dirty: false,
    boundPreviewDocument: null
  };

  injectStyles();

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    return JSON.stringify(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
      throw new Error(
        response.redirected
          ? "Access session may have expired."
          : `Unexpected response (${response.status}).`
      );
    }

    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    }

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
    return path.split(".").reduce(
      (value, key) => (value == null ? undefined : value[key]),
      object
    );
  }

  function setAtPath(object, path, value) {
    const parts = path.split(".");
    let cursor = object;

    parts.forEach((key, index) => {
      const final = index === parts.length - 1;
      if (final) {
        cursor[key] = value;
        return;
      }

      if (cursor[key] == null) {
        cursor[key] = /^\d+$/.test(parts[index + 1]) ? [] : {};
      }
      cursor = cursor[key];
    });
  }

  function previewLanguage(doc) {
    return String(doc?.documentElement?.lang || "en")
      .toLowerCase()
      .startsWith("es")
      ? "es"
      : "en";
  }

  function applyLocalized(element, localized, lang) {
    element.dataset.en = localized?.en || "";
    element.dataset.es = localized?.es || "";
    element.textContent = localized?.[lang] || "";
  }

  function makePreviewLogo(doc, logo) {
    if (!logo?.src) return null;

    const brand = doc.createElement("div");
    brand.className = "testimonial-brand";
    brand.setAttribute("aria-hidden", "true");

    const image = doc.createElement("img");
    image.className = "testimonial-company-logo";
    String(logo.className || "")
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => image.classList.add(className));
    image.src = resolveMediaSource(logo.src);
    image.alt = logo.alt || "";
    image.loading = "lazy";
    if (Number(logo.width) > 0) image.width = Number(logo.width);
    if (Number(logo.height) > 0) image.height = Number(logo.height);

    const scale = Math.min(1.8, Math.max(0.5, Number(logo.scale) || 1));
    if (Math.abs(scale - 1) > 0.0001) image.style.scale = String(scale);

    brand.appendChild(image);
    return brand;
  }

  function makePreviewCard(doc, item, lang) {
    const card = doc.createElement("article");
    card.className = "testimonial-card glass";
    if (item.featured) card.classList.add("testimonial-card--featured");
    card.dataset.testimonialId = item.id;

    const logo = makePreviewLogo(doc, item.logo);
    if (logo) card.appendChild(logo);

    const quote = doc.createElement("p");
    applyLocalized(quote, item.quote, lang);

    const author = doc.createElement("div");
    author.className = "testimonial-author";

    const name = doc.createElement("div");
    name.className = "testimonial-name";
    name.textContent = item.name || "Untitled testimonial";

    const role = doc.createElement("div");
    role.className = "testimonial-role";
    applyLocalized(role, item.role, lang);

    author.append(name, role);
    card.append(quote, author);
    return card;
  }

  function applyDraftToPreview() {
    if (!state.workingDraft) return false;

    try {
      const doc = iframe.contentDocument;
      const section = doc?.querySelector(".testimonials--public#testimonials");
      if (!doc || !section) return false;

      const lang = previewLanguage(doc);
      const draft = state.workingDraft;
      const container = doc.createElement("div");
      container.className = "container";

      const head = doc.createElement("div");
      head.className = "section-head";

      const eyebrow = doc.createElement("span");
      eyebrow.className = "eyebrow";
      applyLocalized(eyebrow, draft.eyebrow, lang);

      const title = doc.createElement("h2");
      title.id = "testimonialsTitle";
      applyLocalized(title, draft.title, lang);

      head.append(eyebrow, title);

      const grid = doc.createElement("div");
      grid.className = "testimonial-grid";
      (draft.items || []).forEach((item) => {
        grid.appendChild(makePreviewCard(doc, item, lang));
      });

      container.append(head, grid);
      section.replaceChildren(container);
      section.setAttribute("aria-labelledby", "testimonialsTitle");
      section.dataset.contentSource = "admin-draft";
      bindPreviewSelect();
      return true;
    } catch {
      return false;
    }
  }

  function markDirty() {
    state.dirty = stable(state.workingDraft) !== stable(state.savedDraft);
    applyDraftToPreview();
    updateStateUI();
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

  function localizedField({ label, path, multiline = false }) {
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
      if (multiline) input.rows = 6;
      input.value = getAtPath(state.workingDraft, `${path}.${lang}`) ?? "";
      input.addEventListener("input", () => {
        setAtPath(state.workingDraft, `${path}.${lang}`, input.value);
        markDirty();
      });

      field.append(fieldLabel, input);
      wrapper.appendChild(field);
    }

    return wrapper;
  }

  function simpleField({ label, path, help = "" }) {
    const field = document.createElement("div");
    field.className = "field field--full";

    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.value = getAtPath(state.workingDraft, path) ?? "";
    input.addEventListener("input", () => {
      setAtPath(state.workingDraft, path, input.value);
      markDirty();
    });

    field.append(fieldLabel, input);
    if (help) {
      const note = document.createElement("p");
      note.className = "field-help";
      note.textContent = help;
      field.appendChild(note);
    }

    return field;
  }

  function actionButton(label, handler, { danger = false, disabled = false } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `testimonials-mini-button${danger ? " is-danger" : ""}`;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function moveItem(index, delta) {
    const items = state.workingDraft.items;
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(next, 0, item);
    markDirty();
    renderEditor();
  }

  function nextTestimonialId() {
    const used = new Set((state.workingDraft?.items || []).map((item) => item.id));
    let index = 1;
    while (used.has(`testimonial-${index}`)) index += 1;
    return `testimonial-${index}`;
  }

  function addTestimonial() {
    state.workingDraft.items.push({
      id: nextTestimonialId(),
      name: "New testimonial",
      role: { en: "", es: "" },
      quote: {
        en: "Add the English testimonial here.",
        es: "Agrega aquí el testimonio en español."
      },
      featured: false,
      logo: null
    });
    markDirty();
    renderEditor();
  }

  async function uploadLogo(index, file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      showToast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      showToast("Image too large.", "Maximum upload size is 5 MB.", "error");
      return;
    }

    state.busy = true;
    updateStateUI();

    try {
      const form = new FormData();
      form.set("folder", "testimonials");
      form.set("file", file);

      const data = await fetchJson("/api/admin/media/upload", {
        method: "POST",
        body: form
      });

      const item = state.workingDraft.items[index];
      const previous = item.logo || {};
      item.logo = {
        src: `${LOGICAL_MEDIA_PREFIX}${data.media.key}`,
        alt: previous.alt || item.name || "Testimonial company",
        className: previous.className || "",
        width: Number(previous.width) > 0 ? Number(previous.width) : 800,
        height: Number(previous.height) > 0 ? Number(previous.height) : 320,
        scale: Number(previous.scale) || 1
      };

      markDirty();
      renderEditor();
      showToast("Logo uploaded to R2.", "Save Draft to keep this reference.");
    } catch (error) {
      showToast("Upload failed.", error.message, "error");
    } finally {
      state.busy = false;
      updateStateUI();
    }
  }

  function renderLogoEditor(item, index) {
    const block = document.createElement("div");
    block.className = "testimonials-media-block";

    const head = document.createElement("div");
    head.className = "testimonials-item-head";

    const label = document.createElement("strong");
    label.textContent = "Company / partner logo";

    const controls = document.createElement("div");
    controls.className = "testimonials-item-actions";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.hidden = true;
    fileInput.addEventListener("change", () => {
      const [file] = fileInput.files || [];
      fileInput.value = "";
      if (file) void uploadLogo(index, file);
    });

    controls.appendChild(
      actionButton(item.logo?.src ? "Replace" : "Upload", () => fileInput.click())
    );

    if (item.logo?.src) {
      controls.appendChild(
        actionButton("Remove", () => {
          state.workingDraft.items[index].logo = null;
          markDirty();
          renderEditor();
        }, { danger: true })
      );
    }

    head.append(label, controls);
    block.append(head, fileInput);

    if (!item.logo?.src) {
      const note = document.createElement("p");
      note.className = "field-help";
      note.textContent = "Optional. New uploads are stored in R2 and referenced from D1.";
      block.appendChild(note);
      return block;
    }

    const source = document.createElement("code");
    source.className = "testimonials-media-source";
    source.textContent = item.logo.src;
    block.appendChild(source);

    block.appendChild(simpleField({
      label: "Logo alt text",
      path: `items.${index}.logo.alt`
    }));

    const scaleField = document.createElement("div");
    scaleField.className = "field field--full";
    const scaleLabel = document.createElement("label");
    const scaleValue = document.createElement("span");
    const scale = Math.round((Number(item.logo.scale) || 1) * 100);
    scaleLabel.textContent = "Visual logo size ";
    scaleValue.textContent = `${scale}%`;
    scaleLabel.appendChild(scaleValue);

    const range = document.createElement("input");
    range.type = "range";
    range.min = "50";
    range.max = "180";
    range.step = "5";
    range.value = String(scale);
    range.addEventListener("input", () => {
      const next = Number(range.value) / 100;
      state.workingDraft.items[index].logo.scale = next;
      scaleValue.textContent = `${range.value}%`;
      markDirty();
    });

    scaleField.append(scaleLabel, range);
    block.appendChild(scaleField);
    return block;
  }

  function renderTestimonialEditor(item, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "testimonials-collection-item";
    wrapper.dataset.testimonialEditorId = item.id;

    const head = document.createElement("div");
    head.className = "testimonials-item-head";

    const titleWrap = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.className = "testimonials-item-kicker";
    kicker.textContent = `Testimonial ${index + 1}`;
    const title = document.createElement("strong");
    title.textContent = item.name || item.id;
    titleWrap.append(kicker, title);

    const actions = document.createElement("div");
    actions.className = "testimonials-item-actions";
    actions.append(
      actionButton("↑", () => moveItem(index, -1), { disabled: index === 0 }),
      actionButton("↓", () => moveItem(index, 1), {
        disabled: index === state.workingDraft.items.length - 1
      }),
      actionButton("Delete", () => {
        if (state.workingDraft.items.length <= 1) return;
        state.workingDraft.items.splice(index, 1);
        markDirty();
        renderEditor();
      }, {
        danger: true,
        disabled: state.workingDraft.items.length <= 1
      })
    );

    head.append(titleWrap, actions);
    wrapper.appendChild(head);

    wrapper.append(
      simpleField({ label: "Name", path: `items.${index}.name` }),
      localizedField({ label: "Role / company", path: `items.${index}.role` }),
      localizedField({ label: "Quote", path: `items.${index}.quote`, multiline: true })
    );

    const featured = document.createElement("label");
    featured.className = "testimonials-toggle-row";
    const featuredInput = document.createElement("input");
    featuredInput.type = "checkbox";
    featuredInput.checked = Boolean(item.featured);
    featuredInput.addEventListener("change", () => {
      state.workingDraft.items[index].featured = featuredInput.checked;
      markDirty();
    });
    const featuredCopy = document.createElement("span");
    featuredCopy.innerHTML = "<strong>Featured card</strong><small>Uses the current wider / highlighted testimonial treatment.</small>";
    featured.append(featuredInput, featuredCopy);
    wrapper.append(featured, renderLogoEditor(item, index));
    return wrapper;
  }

  function renderRevisionList() {
    const list = document.createElement("div");
    list.className = "revision-list";

    if (!state.revisions.length) {
      const empty = document.createElement("div");
      empty.className = "field-help";
      empty.textContent = "No Save or Publish revisions yet.";
      list.appendChild(empty);
      return list;
    }

    state.revisions.slice(0, 10).forEach((revision) => {
      const row = document.createElement("div");
      row.className = "revision-row";
      const type = document.createElement("span");
      type.className = "revision-type";
      type.textContent = revision.revision_type;
      const meta = document.createElement("span");
      meta.className = "revision-meta";
      meta.textContent = `${revision.created_at}` +
        (revision.actor_email ? ` · ${revision.actor_email}` : "");
      row.append(type, meta);
      list.appendChild(row);
    });

    return list;
  }

  function renderEditor() {
    if (!state.active) return;

    if (editorTitle) editorTitle.textContent = "Testimonials";
    editorBody.replaceChildren();

    if (state.loading || !state.workingDraft) {
      editorBody.innerHTML = '<div class="editor-loading">Loading Testimonials from D1…</div>';
      updateStateUI();
      return;
    }

    const heading = detailsSection("Section heading", true);
    heading.content.append(
      localizedField({ label: "Eyebrow", path: "eyebrow" }),
      localizedField({ label: "Heading", path: "title" })
    );

    const testimonials = detailsSection("Testimonials", true);
    const toolbar = document.createElement("div");
    toolbar.className = "testimonials-collection-toolbar";
    const count = document.createElement("span");
    count.textContent = `${state.workingDraft.items.length} testimonial${state.workingDraft.items.length === 1 ? "" : "s"}`;
    toolbar.append(count, actionButton("Add testimonial", addTestimonial));
    testimonials.content.appendChild(toolbar);

    state.workingDraft.items.forEach((item, index) => {
      testimonials.content.appendChild(renderTestimonialEditor(item, index));
    });

    const history = detailsSection("Revision history");
    history.content.appendChild(renderRevisionList());

    editorBody.append(heading.details, testimonials.details, history.details);
    updateStateUI();
  }

  function updateStateUI() {
    if (!state.active) return;

    if (state.loading || !state.entry || !state.workingDraft) {
      if (editorStateChip) {
        editorStateChip.textContent = "Loading";
        editorStateChip.className = "editor-state-chip";
      }
      saveDraftButton.disabled = true;
      publishButton.disabled = true;
      discardButton.disabled = true;
      return;
    }

    const unpublished = Boolean(state.entry.hasUnpublishedChanges) || state.dirty;

    if (editorStateChip) {
      if (state.busy) {
        editorStateChip.textContent = "Working";
        editorStateChip.className = "editor-state-chip";
      } else if (state.dirty) {
        editorStateChip.textContent = "Unsaved";
        editorStateChip.className = "editor-state-chip is-dirty";
      } else if (state.entry.hasUnpublishedChanges) {
        editorStateChip.textContent = "Draft";
        editorStateChip.className = "editor-state-chip is-dirty";
      } else if (state.entry.source === "static-default") {
        editorStateChip.textContent = "Static seed";
        editorStateChip.className = "editor-state-chip";
      } else {
        editorStateChip.textContent = "Published";
        editorStateChip.className = "editor-state-chip is-published";
      }
    }

    if (contentStateLabel) {
      contentStateLabel.textContent = state.dirty
        ? "Testimonials · unsaved preview"
        : state.entry.hasUnpublishedChanges
          ? "Testimonials · draft saved"
          : state.entry.source === "static-default"
            ? "Testimonials · static seed"
            : "Testimonials · CMS published";
    }

    if (saveIndicator) {
      saveIndicator.textContent = state.dirty
        ? "Unsaved"
        : state.entry.hasUnpublishedChanges
          ? "Draft"
          : "Synced";
      saveIndicator.classList.toggle("is-dirty", unpublished);
    }

    discardButton.disabled = state.busy || !state.dirty;
    saveDraftButton.disabled = state.busy || !state.dirty;
    publishButton.disabled = state.busy || state.dirty || !state.entry.hasUnpublishedChanges;
    publishButton.title = state.dirty
      ? "Save the draft first."
      : !state.entry.hasUnpublishedChanges
        ? "No unpublished Testimonials draft."
        : "Publish the saved Testimonials draft to the public Home.";
  }

  async function loadRevisions() {
    try {
      const data = await fetchJson("/api/admin/content/testimonials/revisions");
      state.revisions = data.revisions || [];
    } catch {
      state.revisions = [];
    }
  }

  async function loadTestimonials() {
    if (state.loading) return;
    state.loading = true;
    renderEditor();

    try {
      const [data] = await Promise.all([
        fetchJson("/api/admin/content/testimonials"),
        loadRevisions()
      ]);

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;
      state.loaded = true;
      applyDraftToPreview();
    } catch (error) {
      if (editorStateChip) {
        editorStateChip.textContent = "Error";
        editorStateChip.className = "editor-state-chip is-error";
      }
      editorBody.innerHTML = `<div class="editor-error">${escapeHtml(error.message)}</div>`;
      showToast("Testimonials unavailable.", error.message, "error");
    } finally {
      state.loading = false;
      renderEditor();
    }
  }

  async function saveDraft() {
    if (state.busy || !state.dirty || !state.workingDraft) return;
    state.busy = true;
    updateStateUI();

    try {
      const data = await fetchJson("/api/admin/content/testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: state.workingDraft })
      });

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;
      await loadRevisions();
      applyDraftToPreview();
      renderEditor();
      showToast("Testimonials draft saved.", "The public site has not changed yet.");
    } catch (error) {
      showToast("Save failed.", error.message, "error");
    } finally {
      state.busy = false;
      updateStateUI();
    }
  }

  async function publishContent() {
    if (state.busy || state.dirty || !state.entry?.hasUnpublishedChanges) return;
    state.busy = true;
    updateStateUI();

    try {
      const data = await fetchJson("/api/admin/content/testimonials/publish", {
        method: "POST"
      });

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;
      await loadRevisions();
      applyDraftToPreview();
      renderEditor();
      showToast("Testimonials published.", "The public Home now reads this Published revision at the edge.");
    } catch (error) {
      showToast("Publish failed.", error.message, "error");
    } finally {
      state.busy = false;
      updateStateUI();
    }
  }

  function discardChanges() {
    if (!state.dirty || !state.savedDraft) return;
    state.workingDraft = clone(state.savedDraft);
    state.dirty = false;
    applyDraftToPreview();
    renderEditor();
    showToast("Testimonials unsaved changes discarded.");
  }

  function selectTestimonial(id) {
    const target = editorBody.querySelector(`[data-testimonial-editor-id="${CSS.escape(id)}"]`);
    if (!target) return;

    const parentDetails = target.closest("details");
    if (parentDetails) parentDetails.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    if (selectionName) selectionName.textContent = `Testimonial · ${id}`;
    if (selectionSelector) selectionSelector.textContent = `[data-testimonial-id="${id}"]`;
    if (selectionHint) selectionHint.textContent = "Editing the exact testimonial selected in the preview.";
  }

  function bindPreviewSelect() {
    const doc = iframe.contentDocument;
    if (!doc || state.boundPreviewDocument === doc) return;
    state.boundPreviewDocument = doc;

    doc.addEventListener("click", (event) => {
      if (!state.active) return;
      if (selectModeButton?.getAttribute("aria-pressed") === "false") return;
      const card = event.target.closest?.(".testimonial-card[data-testimonial-id]");
      if (!card) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      selectTestimonial(card.dataset.testimonialId);
    }, true);
  }

  function activate() {
    state.active = true;
    if (footerStatus) footerStatus.textContent = "Testimonials editor connected to D1 + R2.";
    if (footerDetail) footerDetail.textContent = "Preview changes stay local until Save Draft. Publish updates the public Home through edge SSR.";

    renderEditor();
    bindPreviewSelect();

    if (!state.loaded && !state.loading) {
      void loadTestimonials();
    } else {
      applyDraftToPreview();
    }
  }

  function deactivate() {
    state.active = false;
  }

  allSectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.section === "testimonials") activate();
      else deactivate();
    });
  });

  saveDraftButton.addEventListener("click", (event) => {
    if (!state.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void saveDraft();
  }, true);

  publishButton.addEventListener("click", (event) => {
    if (!state.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void publishContent();
  }, true);

  discardButton.addEventListener("click", (event) => {
    if (!state.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    discardChanges();
  }, true);

  iframe.addEventListener("load", () => {
    state.boundPreviewDocument = null;
    bindPreviewSelect();
    if (!state.loaded) return;
    window.setTimeout(() => applyDraftToPreview(), 140);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function injectStyles() {
    if (document.getElementById("testimonials-editor-styles")) return;

    const style = document.createElement("style");
    style.id = "testimonials-editor-styles";
    style.textContent = `
      .testimonials-collection-toolbar,
      .testimonials-item-head,
      .testimonials-item-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .testimonials-collection-toolbar {
        margin-bottom: 12px;
        color: var(--muted, #9ba3b5);
        font-size: 12px;
      }
      .testimonials-collection-item,
      .testimonials-media-block {
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 12px;
        background: rgba(255,255,255,.025);
      }
      .testimonials-collection-item + .testimonials-collection-item,
      .testimonials-media-block {
        margin-top: 12px;
      }
      .testimonials-item-head {
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .testimonials-item-head > div:first-child {
        display: grid;
        gap: 2px;
      }
      .testimonials-item-kicker {
        color: rgba(255,255,255,.48);
        font-size: 10px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .testimonials-item-actions {
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .testimonials-mini-button {
        min-height: 28px;
        padding: 5px 8px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 7px;
        background: rgba(255,255,255,.055);
        color: inherit;
        font: inherit;
        font-size: 11px;
        cursor: pointer;
      }
      .testimonials-mini-button:hover:not(:disabled) {
        border-color: rgba(160,137,229,.5);
        background: rgba(160,137,229,.12);
      }
      .testimonials-mini-button.is-danger:hover:not(:disabled) {
        border-color: rgba(255,107,74,.55);
        background: rgba(255,107,74,.1);
      }
      .testimonials-mini-button:disabled {
        opacity: .38;
        cursor: default;
      }
      .testimonials-collection-item .field-grid,
      .testimonials-collection-item .field,
      .testimonials-media-block .field {
        margin-top: 10px;
      }
      .testimonials-toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        margin-top: 12px;
        padding: 9px 10px;
        border-radius: 9px;
        background: rgba(255,255,255,.035);
      }
      .testimonials-toggle-row span {
        display: grid;
        gap: 2px;
      }
      .testimonials-toggle-row small {
        color: rgba(255,255,255,.5);
        line-height: 1.35;
      }
      .testimonials-media-source {
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: rgba(255,255,255,.55);
        font-size: 10px;
      }
      .testimonials-media-block input[type="range"] {
        width: 100%;
      }
    `;
    document.head.appendChild(style);
  }
})();
