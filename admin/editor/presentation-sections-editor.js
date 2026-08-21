(() => {
  if (window.SDLIVE_PRESENTATION_SECTIONS_EDITOR) return;
  window.SDLIVE_PRESENTATION_SECTIONS_EDITOR = true;

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
  const selectModeButton = document.getElementById("toggleSelectMode");
  if (!iframe || !editorBody || !saveDraftButton || !publishButton || !discardButton) return;

  const SECTIONS = new Set(["rental", "contact"]);
  const LABELS = { rental: "Rental", contact: "Contact" };
  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";
  const entries = new Map();
  let activeSection = null;
  let busy = false;
  let boundPreviewDocument = null;

  injectStyles();
  bindSectionButtons();
  bindActions();
  iframe.addEventListener("load", () => {
    boundPreviewDocument = null;
    if (!activeSection) return;
    window.setTimeout(() => {
      applyDraftToPreview(activeSection);
      bindPreviewSelect();
      jumpPreview(activeSection, false);
    }, 140);
  });

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function stable(value) { return JSON.stringify(value); }
  function state(section = activeSection) { return entries.get(section) || null; }
  function working(section = activeSection) { return state(section)?.workingDraft || null; }
  function dirty(section = activeSection) {
    const current = state(section);
    return Boolean(current && stable(current.workingDraft) !== stable(current.savedDraft));
  }
  function resolveMediaSource(source) {
    const value = String(source || "");
    return value.startsWith(LOGICAL_MEDIA_PREFIX) ? `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}` : value;
  }
  function getAtPath(object, path) { return String(path).split(".").reduce((value, key) => value == null ? undefined : value[key], object); }
  function setAtPath(object, path, value) {
    const parts = String(path).split(".");
    let cursor = object;
    parts.forEach((key, index) => {
      if (index === parts.length - 1) cursor[key] = value;
      else { cursor[key] ||= {}; cursor = cursor[key]; }
    });
  }
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    return data;
  }
  function showToast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;
    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);
    if (detail) toast.append(document.createTextNode(` ${detail}`));
    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4600);
  }

  function bindSectionButtons() {
    document.querySelectorAll(".section-link[data-section]").forEach((button) => {
      if (button.dataset.presentationSectionsBound === "true") return;
      button.dataset.presentationSectionsBound = "true";
      button.addEventListener("click", () => {
        const section = button.dataset.section;
        if (SECTIONS.has(section)) window.setTimeout(() => void activate(section), 0);
        else activeSection = null;
      });
    });
  }
  function bindActions() {
    saveDraftButton.addEventListener("click", (event) => {
      if (!activeSection) return;
      event.preventDefault(); event.stopImmediatePropagation(); void saveDraft();
    }, true);
    publishButton.addEventListener("click", (event) => {
      if (!activeSection) return;
      event.preventDefault(); event.stopImmediatePropagation(); void publish();
    }, true);
    discardButton.addEventListener("click", (event) => {
      if (!activeSection) return;
      event.preventDefault(); event.stopImmediatePropagation(); discard();
    }, true);
  }

  async function loadSection(section, force = false) {
    const existing = entries.get(section);
    if (existing?.loaded && !force) return existing;
    entries.set(section, { ...(existing || {}), loading: true, loaded: false });
    updateStateUI();
    const [content, revisions] = await Promise.all([
      fetchJson(`/api/admin/content/${section}`),
      fetchJson(`/api/admin/content/${section}/revisions`).catch(() => ({ revisions: [] }))
    ]);
    const next = {
      loaded: true,
      loading: false,
      entry: content.entry,
      savedDraft: clone(content.entry.draft),
      workingDraft: clone(content.entry.draft),
      revisions: revisions.revisions || []
    };
    entries.set(section, next);
    return next;
  }

  async function activate(section) {
    if (!SECTIONS.has(section)) return;
    activeSection = section;
    document.querySelectorAll(".section-link[data-section]").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
    if (editorTitle) editorTitle.textContent = `${LABELS[section]} CMS`;
    if (viewTitle) viewTitle.textContent = LABELS[section];
    if (footerStatus) footerStatus.textContent = section === "rental" ? "Rental presentation editor connected to D1 + R2." : "Contact editor connected to D1.";
    if (footerDetail) footerDetail.textContent = section === "rental" ? "Prices, availability and quote math stay system-owned; this CMS edits presentation copy and equipment media only." : "Preview changes stay local until Save Draft; Publish is the only action that changes the public Home.";
    jumpPreview(section, true);
    try {
      await loadSection(section);
      if (activeSection !== section) return;
      renderEditor();
      applyDraftToPreview(section);
      bindPreviewSelect();
      updateStateUI();
    } catch (error) {
      editorBody.innerHTML = `<p class="field-help">${escapeHtml(error.message)}</p>`;
      showToast(`Could not load ${LABELS[section]}.`, error.message, "error");
    }
  }

  function jumpPreview(section, smooth = true) {
    try {
      const target = iframe.contentDocument?.getElementById(section);
      if (target) target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      if (address) address.textContent = `sdlive.show/#${section}`;
      if (openLive) openLive.href = `/#${section}`;
      return Boolean(target);
    } catch { return false; }
  }
  function previewLang(doc) { return String(doc?.documentElement?.lang || "en").toLowerCase().startsWith("es") ? "es" : "en"; }
  function applyLocalized(element, value, lang) {
    if (!element || !value) return;
    element.dataset.en = value.en || "";
    element.dataset.es = value.es || "";
    element.textContent = value[lang] || "";
  }
  function setImage(img, image, hiddenAlt = false) {
    if (!img || !image) return;
    img.src = resolveMediaSource(image.src);
    if (!hiddenAlt) img.alt = image.alt || "";
    if (Number(image.width) > 0) img.width = Number(image.width);
    if (Number(image.height) > 0) img.height = Number(image.height);
    img.style.scale = String(Math.min(1.8, Math.max(0.5, Number(image.scale) || 1)));
  }

  function applyDraftToPreview(section = activeSection) {
    const draft = working(section);
    if (!draft) return false;
    try {
      const doc = iframe.contentDocument;
      const root = doc?.getElementById(section);
      if (!doc || !root) return false;
      const lang = previewLang(doc);
      if (section === "rental") patchRental(doc, root, draft, lang);
      else patchContact(doc, root, draft, lang);
      root.dataset.contentSource = "admin-draft";
      bindPreviewSelect();
      return true;
    } catch { return false; }
  }

  function patchRental(doc, root, draft, lang) {
    applyLocalized(root.querySelector(".section-head .eyebrow"), draft.heading.eyebrow, lang);
    applyLocalized(root.querySelector(".section-head h2"), draft.heading.title, lang);
    const headingParagraphs = root.querySelectorAll(".section-head > p");
    if (headingParagraphs[0]) applyLocalized(headingParagraphs[0], draft.heading.intro, lang);
    applyLocalized(root.querySelector(".rental-price-disclaimer"), draft.heading.disclaimer, lang);
    applyLocalized(root.querySelector(".rental-subhead .eyebrow"), draft.recommended.eyebrow, lang);
    applyLocalized(root.querySelector(".rental-subhead h3"), draft.recommended.title, lang);
    applyLocalized(root.querySelector(".rental-subhead p"), draft.recommended.intro, lang);
    applyLocalized(root.querySelector(".rental-cart-hint .eyebrow"), draft.cartHint.eyebrow, lang);
    applyLocalized(root.querySelector(".rental-cart-hint p"), draft.cartHint.body, lang);
    const groupSelectors = { consoles: "#mixingEquipmentTitle", stageRacks: "#stageRackEquipmentTitle", wireless: "#wirelessEquipmentTitle", pa: "#paEquipmentTitle", tools: "#productionToolsTitle" };
    Object.entries(groupSelectors).forEach(([key, selector]) => applyLocalized(root.querySelector(selector), draft.groups[key], lang));
    Object.entries(draft.presets).forEach(([id, preset]) => {
      const card = root.querySelector(`[data-rental-preset="${CSS.escape(id)}"]`);
      if (!card) return;
      applyLocalized(card.querySelector(".rental-config-kicker"), preset.kicker, lang);
      applyLocalized(card.querySelector(":scope > strong"), preset.title, lang);
      applyLocalized(card.querySelector(":scope > small"), preset.action, lang);
      card.dataset.cmsEditorKey = `rental:preset:${id}`;
    });
    Object.entries(draft.items).forEach(([id, item]) => {
      const card = root.querySelector(`[data-rental-item="${CSS.escape(id)}"]`);
      if (!card) return;
      card.dataset.cmsEditorKey = `rental:item:${id}`;
      applyLocalized(card.querySelector(".equipment-card-body > h4"), item.title, lang);
      const paragraphs = card.querySelectorAll(".equipment-card-body > p");
      if (paragraphs[0]) applyLocalized(paragraphs[0], item.description, lang);
      if (paragraphs[1] && item.technicalNote) applyLocalized(paragraphs[1], item.technicalNote, lang);
      card.querySelectorAll("img").forEach((img) => setImage(img, item.image, img.getAttribute("aria-hidden") === "true"));
    });
    applyLocalized(root.querySelector(".rental-sourcing .eyebrow"), draft.sourcing.eyebrow, lang);
    applyLocalized(root.querySelector(".rental-sourcing h3"), draft.sourcing.title, lang);
    applyLocalized(root.querySelector(".rental-sourcing p"), draft.sourcing.body, lang);
    root.querySelector(".section-head")?.setAttribute("data-cms-editor-key", "rental:heading");
    root.querySelector(".rental-subhead")?.setAttribute("data-cms-editor-key", "rental:recommended");
    root.querySelector(".rental-cart-hint")?.setAttribute("data-cms-editor-key", "rental:cartHint");
    root.querySelector(".rental-sourcing")?.setAttribute("data-cms-editor-key", "rental:sourcing");
  }

  function patchContact(doc, root, draft, lang) {
    applyLocalized(root.querySelector(".contact-info .eyebrow"), draft.eyebrow, lang);
    applyLocalized(root.querySelector(".contact-info h2"), draft.title, lang);
    applyLocalized(root.querySelector(".contact-info > p"), draft.body, lang);
    applyLocalized(root.querySelector('label[for="cfName"]'), draft.form.nameLabel, lang);
    applyLocalized(root.querySelector('label[for="cfEmail"]'), draft.form.emailLabel, lang);
    applyLocalized(root.querySelector('label[for="cfMessage"]'), draft.form.messageLabel, lang);
    applyLocalized(root.querySelector('#contactForm button[type="submit"]'), draft.form.buttonLabel, lang);
    applyLocalized(root.querySelector("#contactForm .contact-form-note"), draft.form.note, lang);
    root.querySelector(".contact-info")?.setAttribute("data-cms-editor-key", "contact:copy");
    root.querySelector("#contactForm")?.setAttribute("data-cms-editor-key", "contact:form");
  }

  function renderEditor() {
    editorBody.replaceChildren();
    if (activeSection === "rental") renderRentalEditor(working());
    else renderContactEditor(working());
    updateStateUI();
  }

  function renderRentalEditor(draft) {
    const systemNote = document.createElement("div");
    systemNote.className = "presentation-system-note";
    systemNote.innerHTML = "<strong>System-owned fields</strong><span>Pricing, stock/availability, preset equipment composition and quote calculations are intentionally not editable here.</span>";
    editorBody.appendChild(systemNote);

    const heading = details("Rental heading", true, "rental:heading");
    heading.body.append(localizedField("Eyebrow", "heading.eyebrow"), localizedField("Title", "heading.title"), localizedField("Intro", "heading.intro", true, 6), localizedField("Price disclaimer", "heading.disclaimer", true, 3));
    editorBody.appendChild(heading.root);
    const recommended = details("Recommended configurations heading", false, "rental:recommended");
    recommended.body.append(localizedField("Eyebrow", "recommended.eyebrow"), localizedField("Title", "recommended.title"), localizedField("Intro", "recommended.intro", true, 5));
    editorBody.appendChild(recommended.root);
    const presets = details("Preset presentation", false);
    Object.entries(draft.presets).forEach(([id, preset]) => {
      const block = itemBlock(preset.title.en || id, `rental:preset:${id}`);
      block.body.append(localizedField("Kicker", `presets.${id}.kicker`), localizedField("Title", `presets.${id}.title`), localizedField("Action label", `presets.${id}.action`));
      presets.body.appendChild(block.root);
    });
    editorBody.appendChild(presets.root);
    const hint = details("Cart guidance", false, "rental:cartHint");
    hint.body.append(localizedField("Eyebrow", "cartHint.eyebrow"), localizedField("Body", "cartHint.body", true, 5));
    editorBody.appendChild(hint.root);
    const groups = details("Equipment group headings", false);
    Object.keys(draft.groups).forEach((id) => groups.body.appendChild(localizedField(id, `groups.${id}`)));
    editorBody.appendChild(groups.root);
    const items = details(`Equipment presentation · ${Object.keys(draft.items).length} items`, true);
    Object.entries(draft.items).forEach(([id, item]) => {
      const block = itemBlock(item.title.en || id, `rental:item:${id}`);
      block.body.append(
        localizedField("Title", `items.${id}.title`),
        localizedField("Description", `items.${id}.description`, true, 5),
        localizedField("Technical note", `items.${id}.technicalNote`, true, 5),
        simpleField("Image alt", `items.${id}.image.alt`),
        mediaControls(`items.${id}.image`, "rental", `${item.title.en || id} image`),
        scaleControl("Image size", `items.${id}.image.scale`)
      );
      items.body.appendChild(block.root);
    });
    editorBody.appendChild(items.root);
    const sourcing = details("Individual equipment & sourcing", false, "rental:sourcing");
    sourcing.body.append(localizedField("Eyebrow", "sourcing.eyebrow"), localizedField("Title", "sourcing.title"), localizedField("Body", "sourcing.body", true, 5));
    editorBody.appendChild(sourcing.root);
  }

  function renderContactEditor() {
    const copy = details("Contact copy", true, "contact:copy");
    copy.body.append(localizedField("Eyebrow", "eyebrow"), localizedField("Title", "title"), localizedField("Intro", "body", true, 5));
    editorBody.appendChild(copy.root);
    const form = details("Contact form copy", true, "contact:form");
    form.body.append(localizedField("Name label", "form.nameLabel"), localizedField("Email label", "form.emailLabel"), localizedField("Message label", "form.messageLabel"), localizedField("Submit button", "form.buttonLabel"), localizedField("Form note", "form.note", true, 4));
    editorBody.appendChild(form.root);
    const note = document.createElement("p");
    note.className = "field-help";
    note.textContent = "Email routing, Turnstile and submission behavior stay system-owned and are not editable from this content panel.";
    editorBody.appendChild(note);
  }

  function details(title, open = false, key = "") {
    const root = document.createElement("details");
    root.className = "editor-section";
    root.open = open;
    if (key) root.dataset.presentationEditorKey = key;
    const summary = document.createElement("summary"); summary.textContent = title;
    const body = document.createElement("div"); body.className = "editor-section-content";
    root.append(summary, body); return { root, body };
  }
  function itemBlock(title, key) {
    const root = document.createElement("div"); root.className = "presentation-editor-item"; root.dataset.presentationEditorKey = key;
    const head = document.createElement("strong"); head.textContent = title;
    const body = document.createElement("div"); body.className = "presentation-editor-item-body";
    root.append(head, body); return { root, body };
  }
  function localizedField(label, path, multiline = false, rows = 4) {
    const wrapper = document.createElement("div"); wrapper.className = "field-grid field-grid--full";
    ["en", "es"].forEach((lang) => {
      const field = document.createElement("div"); field.className = "field";
      const labelEl = document.createElement("label");
      const language = document.createElement("span"); language.className = "field-language"; language.textContent = lang.toUpperCase();
      labelEl.append(language, document.createTextNode(label));
      const input = document.createElement(multiline ? "textarea" : "input");
      if (!multiline) input.type = "text"; else input.rows = rows;
      const full = `${path}.${lang}`; input.value = getAtPath(working(), full) ?? "";
      input.addEventListener("input", () => { setAtPath(working(), full, input.value); markDirty(); });
      field.append(labelEl, input); wrapper.appendChild(field);
    });
    return wrapper;
  }
  function simpleField(label, path) {
    const field = document.createElement("div"); field.className = "field field--full";
    const labelEl = document.createElement("label"); labelEl.textContent = label;
    const input = document.createElement("input"); input.type = "text"; input.value = getAtPath(working(), path) ?? "";
    input.addEventListener("input", () => { setAtPath(working(), path, input.value); markDirty(); });
    field.append(labelEl, input); return field;
  }
  function scaleControl(label, path) {
    const field = document.createElement("div"); field.className = "field field--full";
    const labelEl = document.createElement("label"); const value = document.createElement("span"); value.className = "presentation-scale-value";
    const range = document.createElement("input"); range.type = "range"; range.min = "0.5"; range.max = "1.8"; range.step = "0.05"; range.value = String(Number(getAtPath(working(), path)) || 1);
    const sync = () => value.textContent = `${Math.round(Number(range.value) * 100)}%`; sync();
    range.addEventListener("input", () => { setAtPath(working(), path, Number(range.value)); sync(); markDirty(); });
    labelEl.append(document.createTextNode(label), value); field.append(labelEl, range); return field;
  }
  function mediaControls(path, folder, label) {
    const block = document.createElement("div"); block.className = "presentation-media-block";
    const code = document.createElement("code"); code.textContent = getAtPath(working(), `${path}.src`) || "No image";
    const upload = document.createElement("button"); upload.type = "button"; upload.className = "presentation-mini-button"; upload.textContent = "Replace image";
    const choose = document.createElement("button"); choose.type = "button"; choose.className = "presentation-mini-button"; choose.textContent = "Choose from library";
    const file = document.createElement("input"); file.type = "file"; file.accept = "image/png,image/jpeg,image/webp"; file.hidden = true;
    upload.addEventListener("click", () => file.click());
    file.addEventListener("change", () => { const [selected] = file.files || []; file.value = ""; if (selected) void uploadMedia(path, folder, selected, label); });
    choose.addEventListener("click", () => {
      if (!window.SDLiveMediaLibrary?.open) { showToast("Media Library is not ready.", "Reload the Editor and try again.", "error"); return; }
      window.SDLiveMediaLibrary.open({ folder, onSelect: (media) => {
        const image = getAtPath(working(), path); image.src = media.logicalRef || `${LOGICAL_MEDIA_PREFIX}${media.key}`; markDirty(); renderEditor();
      }});
    });
    block.append(code, upload, choose, file); return block;
  }
  async function uploadMedia(path, folder, file, label) {
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return showToast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return showToast("Image too large.", "Maximum upload size is 5 MB.", "error");
    busy = true; updateStateUI();
    try {
      const form = new FormData(); form.set("folder", folder); form.set("file", file);
      const data = await fetchJson("/api/admin/media/upload", { method: "POST", body: form });
      const image = getAtPath(working(), path); image.src = `${LOGICAL_MEDIA_PREFIX}${data.media.key}`; markDirty(); renderEditor();
      showToast(`${label} uploaded to R2.`, "Save Draft to keep the reference; live remains unchanged until Publish.");
    } catch (error) { showToast("Upload failed.", error.message, "error"); }
    finally { busy = false; updateStateUI(); }
  }

  function markDirty() { applyDraftToPreview(); updateStateUI(); }
  async function saveDraft() {
    if (!activeSection || busy || !working()) return;
    busy = true; updateStateUI();
    try {
      const data = await fetchJson(`/api/admin/content/${activeSection}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: working() }) });
      const current = state(); current.entry = data.entry; current.savedDraft = clone(data.entry.draft); current.workingDraft = clone(data.entry.draft);
      showToast(`${LABELS[activeSection]} Draft saved.`, "Public site unchanged until Publish.");
      renderEditor(); applyDraftToPreview();
    } catch (error) { showToast("Save Draft failed.", error.message, "error"); }
    finally { busy = false; updateStateUI(); }
  }
  async function publish() {
    if (!activeSection || busy || dirty()) return;
    busy = true; updateStateUI();
    try {
      const data = await fetchJson(`/api/admin/content/${activeSection}/publish`, { method: "POST" });
      const current = state(); current.entry = data.entry; current.savedDraft = clone(data.entry.draft); current.workingDraft = clone(data.entry.draft);
      showToast(`${LABELS[activeSection]} published.`, "The automatic Failsafe will verify the public result.");
      updateStateUI();
    } catch (error) { showToast("Publish failed.", error.message, "error"); }
    finally { busy = false; updateStateUI(); }
  }
  function discard() {
    const current = state(); if (!current?.savedDraft || busy) return;
    current.workingDraft = clone(current.savedDraft); renderEditor(); applyDraftToPreview(); showToast("Unsaved preview changes discarded.");
  }
  function updateStateUI() {
    if (!activeSection) return;
    const current = state(); const loading = current?.loading; const isDirty = dirty(); const unpublished = Boolean(current?.entry?.hasUnpublishedChanges);
    saveDraftButton.disabled = Boolean(busy || loading || !isDirty);
    publishButton.disabled = Boolean(busy || loading || isDirty || (!unpublished && current?.entry?.source === "cms"));
    discardButton.disabled = Boolean(busy || loading || !isDirty);
    if (editorStateChip) { editorStateChip.textContent = loading ? "Loading" : isDirty ? "Unsaved" : unpublished ? "Draft saved" : "Published"; editorStateChip.classList.toggle("is-warning", isDirty || unpublished); }
    if (saveIndicator) saveIndicator.textContent = busy ? "Working…" : isDirty ? "Unsaved preview changes" : unpublished ? "Draft saved · live unchanged" : "Draft and Published in sync";
    if (contentStateLabel) contentStateLabel.textContent = isDirty ? "Unsaved" : unpublished ? "Draft" : "Published";
  }

  function bindPreviewSelect() {
    if (!activeSection) return;
    let doc; try { doc = iframe.contentDocument; } catch { return; }
    if (!doc || boundPreviewDocument === doc) return;
    boundPreviewDocument = doc;
    doc.addEventListener("click", (event) => {
      if (!activeSection || selectModeButton?.getAttribute("aria-pressed") === "false") return;
      const target = event.target.closest?.("[data-cms-editor-key]");
      if (!target) return;
      const key = target.dataset.cmsEditorKey || "";
      if (!key.startsWith(`${activeSection}:`)) return;
      event.preventDefault(); event.stopImmediatePropagation(); selectKey(key);
    }, true);
  }
  function selectKey(key) {
    const target = editorBody.querySelector(`[data-presentation-editor-key="${CSS.escape(key)}"]`);
    if (!target) return;
    if (target.tagName === "DETAILS") target.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-selected"); window.setTimeout(() => target.classList.remove("is-selected"), 1500);
  }
  function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
  function injectStyles() {
    if (document.getElementById("presentation-sections-editor-styles")) return;
    const style = document.createElement("style"); style.id = "presentation-sections-editor-styles";
    style.textContent = `
      .presentation-system-note{display:grid;gap:3px;margin:0 0 12px;padding:10px 11px;border:1px solid rgba(160,137,229,.2);border-radius:9px;background:rgba(160,137,229,.05)}
      .presentation-system-note strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em}.presentation-system-note span{font-size:10px;color:rgba(244,245,247,.58)}
      .presentation-editor-item{display:grid;gap:9px;margin:0 0 10px;padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(255,255,255,.025);transition:.2s}
      .presentation-editor-item.is-selected,[data-presentation-editor-key].is-selected{border-color:rgba(160,137,229,.85)!important;background:rgba(160,137,229,.08)!important}
      .presentation-editor-item>strong{font-size:11px}.presentation-editor-item-body{display:grid;gap:9px}
      .presentation-media-block{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center}.presentation-media-block code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:rgba(244,245,247,.52)}
      .presentation-mini-button{border:1px solid rgba(255,255,255,.12);border-radius:7px;background:rgba(255,255,255,.05);color:inherit;padding:6px 8px;font:inherit;font-size:9px;cursor:pointer}.presentation-mini-button:hover{border-color:rgba(160,137,229,.55);background:rgba(160,137,229,.12)}
      .presentation-scale-value{float:right;color:rgba(244,245,247,.48);font-size:10px}
    `;
    document.head.appendChild(style);
  }
})();
