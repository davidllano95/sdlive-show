(() => {
  if (window.SDLiveRentalStabilizationEditor) return;
  window.SDLiveRentalStabilizationEditor = true;

  const rentalButton = document.querySelector('.section-link[data-section="rental"]');
  const sectionButtons = [...document.querySelectorAll('.section-link[data-section]')];
  const iframe = document.getElementById("sitePreview");
  const editorBody = document.getElementById("editorBody");
  const editorTitle = document.getElementById("editorTitle");
  const editorStateChip = document.getElementById("editorStateChip");
  const saveButton = document.getElementById("saveDraft");
  const publishButton = document.getElementById("publishContent");
  const discardButton = document.getElementById("discardChanges");
  const contentState = document.getElementById("contentStateLabel");
  const saveIndicator = document.getElementById("saveIndicator");
  const footerStatus = document.getElementById("footerStatus");
  const footerDetail = document.getElementById("footerDetail");
  const toastStack = document.getElementById("toastStack");
  const address = document.getElementById("previewAddress");
  const openLive = document.getElementById("openLive");
  if (!rentalButton || !iframe || !editorBody || !saveButton || !publishButton || !discardButton) return;

  const PRESETS = ["corporate", "digital", "theater", "livePro", "fohMonPro"];
  const GROUPS = {
    consoles: ["wing", "flow8", "lv1"],
    stageRacks: ["dl32", "stageGrid"],
    wireless: ["handhelds", "headsets"],
    pa: ["pa"],
    tools: ["labeler", "videoServer", "monitor"]
  };
  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";
  let active = false;
  let busy = false;
  let entry = null;
  let saved = null;
  let working = null;

  injectStyles();

  rentalButton.addEventListener("click", (event) => {
    if (rentalButton.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void activate();
  }, true);

  sectionButtons.filter((button) => button !== rentalButton).forEach((button) => {
    button.addEventListener("click", () => { active = false; }, true);
  });

  saveButton.addEventListener("click", (event) => {
    if (!active) return;
    event.preventDefault(); event.stopImmediatePropagation(); void saveDraft();
  }, true);
  publishButton.addEventListener("click", (event) => {
    if (!active) return;
    event.preventDefault(); event.stopImmediatePropagation(); void publish();
  }, true);
  discardButton.addEventListener("click", (event) => {
    if (!active) return;
    event.preventDefault(); event.stopImmediatePropagation(); discard();
  }, true);

  iframe.addEventListener("load", () => {
    if (!active || !working) return;
    window.setTimeout(() => { applyPreview(); jumpPreview(false); }, 150);
  });

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function stable(value) { return JSON.stringify(value); }
  function clamp(value, min, max, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }
  function dirty() { return Boolean(working && saved && stable(working) !== stable(saved)); }
  function getAtPath(object, path) { return String(path).split(".").reduce((value, key) => value == null ? undefined : value[key], object); }
  function setAtPath(object, path, value) {
    const parts = String(path).split("."); let cursor = object;
    parts.forEach((key, index) => { if (index === parts.length - 1) cursor[key] = value; else { cursor[key] ||= {}; cursor = cursor[key]; } });
  }
  function resolveMedia(source) {
    const value = String(source || "");
    return value.startsWith(LOGICAL_MEDIA_PREFIX) ? `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}` : value;
  }
  function previewLang(doc) { return String(doc?.documentElement?.lang || "en").toLowerCase().startsWith("es") ? "es" : "en"; }
  function applyLocalized(element, value, lang) {
    if (!element || !value) return;
    element.dataset.en = value.en || ""; element.dataset.es = value.es || ""; element.textContent = value[lang] || "";
  }
  function focusPreviewItem(id, smooth = false) {
    try {
      const card = iframe.contentDocument?.querySelector(`#rental [data-rental-item="${CSS.escape(id)}"]`);
      card?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center", inline: "nearest" });
    } catch {}
  }
  function updateMediaPathLabel(id) {
    const code = editorBody.querySelector(`[data-rental-media-editor="${CSS.escape(id)}"] code`);
    if (code) code.textContent = working?.items?.[id]?.image?.src || "";
  }
  function setRentalImageSource(id, source) {
    const image = working?.items?.[id]?.image;
    const value = String(source || "").trim();
    if (!image || !value) return;
    image.src = value;
    updateMediaPathLabel(id);
    changed();
    focusPreviewItem(id);
  }
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    return data;
  }
  function toast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const node = document.createElement("div"); node.className = `toast is-${type}`;
    const strong = document.createElement("strong"); strong.textContent = title; node.append(strong);
    if (detail) node.append(document.createTextNode(` ${detail}`)); toastStack.append(node); window.setTimeout(() => node.remove(), 4500);
  }

  function normalizeDraft(value) {
    const draft = clone(value);
    draft.recommended.cards ||= PRESETS.map((presetKey) => ({
      id: `preset-${presetKey}`,
      presetKey,
      kicker: clone(draft.presets[presetKey].kicker),
      title: clone(draft.presets[presetKey].title),
      action: clone(draft.presets[presetKey].action),
      visible: true
    }));
    draft.recommended.itemOrder ||= Object.fromEntries(Object.entries(GROUPS).map(([group, ids]) => [group, [...ids]]));
    Object.values(draft.items || {}).forEach((item) => {
      if (!item?.image) return;
      const desired = clamp(item.image.displayScale ?? item.image.scale, 0.5, 2.5, 1);
      item.image.displayScale = desired;
      item.image.scale = desired;
      item.image.positionX = clamp(item.image.positionX, -100, 100, 0);
      item.image.positionY = clamp(item.image.positionY, -100, 100, 0);
    });
    return draft;
  }

  function storageDraft() {
    const draft = clone(working);
    Object.values(draft.items || {}).forEach((item) => {
      if (!item?.image) return;
      const desired = clamp(item.image.displayScale ?? item.image.scale, 0.5, 2.5, 1);
      item.image.displayScale = desired;
      item.image.scale = Math.min(1.8, desired);
      item.image.positionX = clamp(item.image.positionX, -100, 100, 0);
      item.image.positionY = clamp(item.image.positionY, -100, 100, 0);
    });
    return draft;
  }

  async function activate() {
    active = true;
    sectionButtons.forEach((button) => button.classList.toggle("is-active", button === rentalButton));
    if (editorTitle) editorTitle.textContent = "Rental · presentation";
    if (footerStatus) footerStatus.textContent = "Rental presentation V2 · D1 + R2";
    if (footerDetail) footerDetail.textContent = "Prices, availability, preset composition and quote math remain system-owned. This panel controls copy, order and media presentation only.";
    jumpPreview(true);
    editorBody.innerHTML = '<div class="editor-loading">Loading Rental presentation from D1…</div>';
    try {
      const data = await fetchJson("/api/admin/content/rental");
      if (!active) return;
      entry = data.entry;
      saved = normalizeDraft(entry.draft);
      working = clone(saved);
      render(); applyPreview(); updateState();
    } catch (error) {
      editorBody.innerHTML = `<p class="field-help">${escapeHtml(error.message)}</p>`;
      toast("Rental unavailable.", error.message, "error");
    }
  }

  function jumpPreview(smooth = true) {
    try { iframe.contentDocument?.getElementById("rental")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }); } catch {}
    if (address) address.textContent = "sdlive.show/#rental";
    if (openLive) openLive.href = "/#rental";
  }

  function render() {
    if (!active || !working) return;
    editorBody.replaceChildren();
    const note = document.createElement("div"); note.className = "rental-v2-system-note";
    note.innerHTML = "<strong>Presentation-only controls</strong><span>CMS never owns Rental prices, availability, preset equipment composition or quote calculations.</span>";
    editorBody.append(note);

    const copy = details("Section copy", false);
    copy.body.append(
      localizedField("Eyebrow", "heading.eyebrow"), localizedField("Title", "heading.title"), localizedField("Intro", "heading.intro", true), localizedField("Price disclaimer", "heading.disclaimer", true),
      localizedField("Recommended eyebrow", "recommended.eyebrow"), localizedField("Recommended title", "recommended.title"), localizedField("Recommended intro", "recommended.intro", true),
      localizedField("Cart hint eyebrow", "cartHint.eyebrow"), localizedField("Cart hint body", "cartHint.body", true),
      localizedField("Sourcing eyebrow", "sourcing.eyebrow"), localizedField("Sourcing title", "sourcing.title"), localizedField("Sourcing body", "sourcing.body", true)
    );
    editorBody.append(copy.root);

    const cards = details(`Recommended cards · ${working.recommended.cards.length}`, true);
    cards.body.appendChild(recommendedToolbar());
    working.recommended.cards.forEach((card, index) => cards.body.appendChild(cardEditor(card, index)));
    editorBody.append(cards.root);

    for (const [group, defaultIds] of Object.entries(GROUPS)) {
      const order = working.recommended.itemOrder[group] || [...defaultIds];
      const groupSection = details(`Equipment · ${group}`, group === "consoles");
      groupSection.body.append(localizedField("Group label", `groups.${group}`));
      order.forEach((id, index) => groupSection.body.appendChild(itemEditor(group, id, index, order)));
      editorBody.append(groupSection.root);
    }
    updateState();
  }

  function recommendedToolbar() {
    const row = document.createElement("div"); row.className = "rental-v2-toolbar";
    const info = document.createElement("span"); info.textContent = "Cards may reuse a supported preset. Their equipment composition stays backend-owned.";
    const add = button("+ Add card", () => {
      const presetKey = "corporate";
      let index = 1; const ids = new Set(working.recommended.cards.map((card) => card.id));
      while (ids.has(`card-${index}`)) index += 1;
      working.recommended.cards.push({ id: `card-${index}`, presetKey, kicker: clone(working.presets[presetKey].kicker), title: clone(working.presets[presetKey].title), action: clone(working.presets[presetKey].action), visible: true });
      changed(true);
    });
    row.append(info, add); return row;
  }

  function cardEditor(card, index) {
    const block = document.createElement("div"); block.className = "rental-v2-item";
    const head = document.createElement("div"); head.className = "rental-v2-item-head";
    const title = document.createElement("strong"); title.textContent = card.title?.en || card.id;
    const actions = document.createElement("div"); actions.className = "rental-v2-actions";
    actions.append(
      button("↑", () => moveArray(working.recommended.cards, index, -1), index === 0),
      button("↓", () => moveArray(working.recommended.cards, index, 1), index === working.recommended.cards.length - 1),
      button("Delete", () => { if (working.recommended.cards.length <= 1) return; working.recommended.cards.splice(index, 1); changed(true); }, working.recommended.cards.length <= 1, true)
    );
    head.append(title, actions); block.append(head);

    const preset = selectField("Supported system preset", `recommended.cards.${index}.presetKey`, PRESETS);
    preset.querySelector("select").addEventListener("change", () => changed(true), { once: true });
    block.append(preset, localizedField("Kicker", `recommended.cards.${index}.kicker`), localizedField("Title", `recommended.cards.${index}.title`), localizedField("Action label", `recommended.cards.${index}.action`), booleanField("Visible publicly", `recommended.cards.${index}.visible`));
    return block;
  }

  function itemEditor(group, id, index, order) {
    const item = working.items[id];
    const block = document.createElement("div"); block.className = "rental-v2-item"; block.dataset.rentalItemEditor = id;
    const head = document.createElement("div"); head.className = "rental-v2-item-head";
    const title = document.createElement("strong"); title.textContent = item?.title?.en || id;
    const actions = document.createElement("div"); actions.className = "rental-v2-actions";
    actions.append(button("Preview", () => focusPreviewItem(id, true)), button("↑", () => moveArray(order, index, -1), index === 0), button("↓", () => moveArray(order, index, 1), index === order.length - 1));
    head.append(title, actions); block.append(head);
    if (id === "pa") {
      const pairNote = document.createElement("p");
      pairNote.className = "field-help";
      pairNote.dataset.rentalPaPairNotice = "true";
      pairNote.textContent = "PA pair · both units always use the same image, size and position.";
      block.append(pairNote);
    }
    block.append(
      localizedField("Title", `items.${id}.title`), localizedField("Description", `items.${id}.description`, true), localizedField("Technical note", `items.${id}.technicalNote`, true),
      mediaEditor(id), scaleField(id), positionField(id, "positionX", "Horizontal position"), positionField(id, "positionY", "Vertical position")
    );
    return block;
  }

  function mediaEditor(id) {
    const image = working.items[id].image;
    const row = document.createElement("div"); row.className = "rental-v2-media"; row.dataset.rentalMediaEditor = id;
    const code = document.createElement("code"); code.textContent = image.src;
    const file = document.createElement("input"); file.type = "file"; file.accept = "image/png,image/jpeg,image/webp"; file.hidden = true;
    const upload = button("Replace", () => file.click());
    file.addEventListener("change", () => { const [selected] = file.files || []; file.value = ""; if (selected) void uploadMedia(id, selected); });
    const choose = button("Library", () => {
      if (!window.SDLiveMediaLibrary?.open) return toast("Media Library is not ready.", "Reload the Editor and try again.", "error");
      window.SDLiveMediaLibrary.open({ folder: "rental", onSelect: (media) => {
        setRentalImageSource(id, media.logicalPath || media.logicalRef || (LOGICAL_MEDIA_PREFIX + media.key));
      }});
    });
    row.append(code, upload, choose, file); return row;
  }

  async function uploadMedia(id, file) {
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return toast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return toast("Image too large.", "Maximum 5 MB.", "error");
    busy = true; updateState();
    try {
      const form = new FormData(); form.set("folder", "rental"); form.set("file", file);
      const data = await fetchJson("/api/admin/media/upload", { method: "POST", body: form });
      setRentalImageSource(id, data.media.logicalPath || (LOGICAL_MEDIA_PREFIX + data.media.key)); toast("Rental image uploaded.", "Save Draft to keep it.");
    } catch (error) { toast("Upload failed.", error.message, "error"); }
    finally { busy = false; updateState(); }
  }

  function scaleField(id) {
    const field = document.createElement("div"); field.className = "field field--full";
    const label = document.createElement("label"); const value = document.createElement("span"); value.className = "rental-v2-value";
    const range = document.createElement("input"); range.type = "range"; range.min = "50"; range.max = "250"; range.step = "5";
    range.value = String(Math.round(clamp(working.items[id].image.displayScale ?? working.items[id].image.scale, .5, 2.5, 1) * 100));
    const sync = () => value.textContent = `${range.value}%`; sync();
    range.addEventListener("input", () => { working.items[id].image.displayScale = Number(range.value) / 100; working.items[id].image.scale = Number(range.value) / 100; sync(); changed(); focusPreviewItem(id); });
    label.append(document.createTextNode("Image size"), value); field.append(label, range); return field;
  }

  function positionField(id, key, labelText) {
    const field = document.createElement("div"); field.className = "field field--full";
    const label = document.createElement("label"); const value = document.createElement("span"); value.className = "rental-v2-value";
    const range = document.createElement("input"); range.type = "range"; range.min = "-100"; range.max = "100"; range.step = "1"; range.value = String(clamp(working.items[id].image[key], -100, 100, 0));
    const sync = () => value.textContent = `${range.value}%`; sync();
    range.addEventListener("input", () => { working.items[id].image[key] = Number(range.value); sync(); changed(); focusPreviewItem(id); });
    label.append(document.createTextNode(labelText), value); field.append(label, range); return field;
  }

  function localizedField(labelText, path, multiline = false) {
    const grid = document.createElement("div"); grid.className = "field-grid field-grid--full";
    ["en", "es"].forEach((lang) => {
      const field = document.createElement("div"); field.className = "field";
      const label = document.createElement("label"); const badge = document.createElement("span"); badge.className = "field-language"; badge.textContent = lang.toUpperCase(); label.append(badge, document.createTextNode(labelText));
      const input = document.createElement(multiline ? "textarea" : "input"); if (!multiline) input.type = "text"; else input.rows = 4; input.value = getAtPath(working, `${path}.${lang}`) ?? "";
      input.addEventListener("input", () => { setAtPath(working, `${path}.${lang}`, input.value); changed(); }); field.append(label, input); grid.append(field);
    }); return grid;
  }

  function selectField(labelText, path, options) {
    const field = document.createElement("div"); field.className = "field field--full";
    const label = document.createElement("label"); label.textContent = labelText; const select = document.createElement("select");
    options.forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option); });
    select.value = getAtPath(working, path) || options[0]; select.addEventListener("change", () => { setAtPath(working, path, select.value); changed(); }); field.append(label, select); return field;
  }

  function booleanField(labelText, path) {
    const row = document.createElement("label"); row.className = "rental-v2-check"; const input = document.createElement("input"); input.type = "checkbox"; input.checked = getAtPath(working, path) !== false;
    input.addEventListener("change", () => { setAtPath(working, path, input.checked); changed(); }); row.append(input, document.createTextNode(labelText)); return row;
  }

  function details(title, open = false) {
    const root = document.createElement("details"); root.className = "editor-section"; root.open = open; const summary = document.createElement("summary"); summary.textContent = title; const body = document.createElement("div"); body.className = "editor-section-content"; root.append(summary, body); return { root, body };
  }
  function button(text, handler, disabled = false, danger = false) {
    const node = document.createElement("button"); node.type = "button"; node.className = `rental-v2-button${danger ? " is-danger" : ""}`; node.textContent = text; node.disabled = disabled; node.addEventListener("click", handler); return node;
  }
  function moveArray(array, index, delta) {
    const next = index + delta; if (!Array.isArray(array) || next < 0 || next >= array.length) return;
    const [item] = array.splice(index, 1); array.splice(next, 0, item); changed(true);
  }

  function changed(rerender = false) {
    applyPreview(); updateState(); if (rerender) render();
  }

  function renderRecommendedPreview(root, doc, lang) {
    const grid = root.querySelector(".rental-config-grid"); if (!grid) return;
    const templates = new Map([...grid.querySelectorAll("[data-rental-preset]")].map((card) => [card.dataset.rentalPreset, card.cloneNode(true)]));
    const nodes = [];
    working.recommended.cards.filter((card) => card.visible !== false).forEach((card) => {
      const template = templates.get(card.presetKey); if (!template) return;
      const clone = template.cloneNode(true); clone.dataset.rentalPresentationCardId = card.id;
      applyLocalized(clone.querySelector(".rental-config-kicker"), card.kicker, lang); applyLocalized(clone.querySelector("strong"), card.title, lang); applyLocalized(clone.querySelector("small"), card.action, lang); nodes.push(clone);
    });
    if (nodes.length) grid.replaceChildren(...nodes);
  }

  function applyPreview() {
    if (!working) return;
    try {
      const doc = iframe.contentDocument; const root = doc?.getElementById("rental"); if (!doc || !root) return;
      const lang = previewLang(doc);
      applyLocalized(root.querySelector(".section-head .eyebrow"), working.heading.eyebrow, lang); applyLocalized(root.querySelector(".section-head h2"), working.heading.title, lang);
      const headingPs = root.querySelectorAll(".section-head p"); applyLocalized(headingPs[0], working.heading.intro, lang); applyLocalized(root.querySelector(".rental-price-disclaimer"), working.heading.disclaimer, lang);
      applyLocalized(root.querySelector(".rental-subhead .eyebrow"), working.recommended.eyebrow, lang); applyLocalized(root.querySelector(".rental-subhead h3"), working.recommended.title, lang); applyLocalized(root.querySelector(".rental-subhead p"), working.recommended.intro, lang);
      applyLocalized(root.querySelector(".rental-cart-hint .eyebrow"), working.cartHint.eyebrow, lang); applyLocalized(root.querySelector(".rental-cart-hint p"), working.cartHint.body, lang);
      renderRecommendedPreview(root, doc, lang);

      for (const [group, ids] of Object.entries(working.recommended.itemOrder)) {
        const cards = ids.map((id) => root.querySelector(`[data-rental-item="${CSS.escape(id)}"]`)).filter(Boolean); const grid = cards[0]?.parentElement;
        if (grid && cards.every((card) => card.parentElement === grid)) cards.forEach((card) => grid.appendChild(card));
        const groupRoot = cards[0]?.closest(".equipment-group"); applyLocalized(groupRoot?.querySelector(".equipment-group-head h3"), working.groups[group], lang);
      }

      for (const [id, item] of Object.entries(working.items)) {
        const card = root.querySelector(`[data-rental-item="${CSS.escape(id)}"]`); if (!card) continue;
        applyLocalized(card.querySelector("h4"), item.title, lang);
        const bodyPs = [...card.querySelectorAll(".equipment-card-body > p")]; applyLocalized(bodyPs[0], item.description, lang); if (bodyPs[1]) applyLocalized(bodyPs[1], item.technicalNote, lang);
        const images = id === "pa"
          ? [...card.querySelectorAll(".equipment-pa-pair img")]
          : [...card.querySelectorAll(".equipment-card-visual img, .equipment-tool-visual img")];
        images.forEach((img, imageIndex) => {
          img.src = resolveMedia(item.image.src);
          if (id === "pa" && imageIndex > 0) { img.alt = ""; img.setAttribute("aria-hidden", "true"); }
          else { img.alt = item.image.alt || ""; if (id === "pa") img.removeAttribute("aria-hidden"); }
          img.style.scale = String(clamp(item.image.displayScale ?? item.image.scale, .5, 2.5, 1));
          img.style.translate = `${clamp(item.image.positionX, -100, 100, 0)}% ${clamp(item.image.positionY, -100, 100, 0)}%`;
        });
      }
      const sourcing = root.querySelector(".rental-sourcing, .rental-custom-source, [data-rental-sourcing]");
      if (sourcing) { applyLocalized(sourcing.querySelector(".eyebrow"), working.sourcing.eyebrow, lang); applyLocalized(sourcing.querySelector("h2,h3"), working.sourcing.title, lang); applyLocalized(sourcing.querySelector("p"), working.sourcing.body, lang); }
    } catch {}
  }

  async function saveDraft() {
    if (!active || busy || !dirty()) return;
    busy = true; updateState();
    try {
      const data = await fetchJson("/api/admin/content/rental", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: storageDraft() }) });
      entry = data.entry; saved = normalizeDraft(entry.draft); working = clone(saved); render(); applyPreview(); toast("Rental Draft saved.", "Public site remains unchanged until Publish.");
    } catch (error) { toast("Rental Save failed.", error.message, "error"); }
    finally { busy = false; updateState(); }
  }
  async function publish() {
    if (!active || busy) return;
    if (dirty()) return toast("Save Draft first.", "Publish uses the saved Rental Draft in D1.", "error");
    busy = true; updateState();
    try {
      const data = await fetchJson("/api/admin/content/rental/publish", { method: "POST" }); entry = data.entry; saved = normalizeDraft(entry.draft); working = clone(saved); render(); applyPreview(); toast("Rental published.", "Presentation changed; quote logic remains system-owned.");
    } catch (error) { toast("Rental Publish failed.", error.message, "error"); }
    finally { busy = false; updateState(); }
  }
  function discard() { if (!active || busy || !saved) return; working = clone(saved); render(); applyPreview(); updateState(); toast("Rental preview changes discarded."); }

  function updateState() {
    if (!active) return; const isDirty = dirty(); const unpublished = Boolean(entry?.hasUnpublishedChanges);
    saveButton.disabled = busy || !isDirty; discardButton.disabled = busy || !isDirty; publishButton.disabled = busy || isDirty || (!unpublished && entry?.source === "cms");
    if (editorStateChip) { editorStateChip.textContent = busy ? "Working" : isDirty ? "Unsaved" : unpublished ? "Draft saved" : "Published"; editorStateChip.className = `editor-state-chip${isDirty || unpublished ? " is-dirty" : " is-published"}`; }
    if (contentState) contentState.textContent = isDirty ? "Rental · unsaved" : unpublished ? "Rental · draft saved" : "Rental · published";
    if (saveIndicator) saveIndicator.textContent = busy ? "Working…" : isDirty ? "Unsaved" : unpublished ? "Draft" : "Synced";
  }

  function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
  function injectStyles() {
    if (document.getElementById("rental-v2-editor-style")) return; const style = document.createElement("style"); style.id = "rental-v2-editor-style";
    style.textContent = `
      .rental-v2-system-note{display:grid;gap:4px;margin:0 0 12px;padding:10px 11px;border:1px solid rgba(160,137,229,.24);border-radius:10px;background:rgba(160,137,229,.06)}.rental-v2-system-note strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em}.rental-v2-system-note span{font-size:10px;color:var(--soft);line-height:1.45}
      .rental-v2-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;color:var(--muted);font-size:9px}.rental-v2-item{display:grid;gap:9px;margin-bottom:9px;padding:10px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.025)}.rental-v2-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.rental-v2-item-head strong{font-size:10px}.rental-v2-actions{display:flex;gap:4px}
      .rental-v2-button{appearance:none;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.04);color:var(--soft);padding:6px 8px;font:inherit;font-size:9px;cursor:pointer}.rental-v2-button:disabled{opacity:.28;cursor:default}.rental-v2-button.is-danger{color:#ff9a82}.rental-v2-media{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center}.rental-v2-media code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9px}.rental-v2-check{display:flex;align-items:center;gap:7px;color:var(--soft);font-size:9px}.rental-v2-value{float:right;color:var(--accent);font-size:9px}
    `; document.head.append(style);
  }
})();
