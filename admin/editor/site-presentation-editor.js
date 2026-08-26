(() => {
  if (window.SDLiveSitePresentationEditor) return;
  window.SDLiveSitePresentationEditor = true;

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
  const sectionNav = document.querySelector(".section-nav");
  if (!iframe || !editorBody || !saveButton || !publishButton || !discardButton || !sectionNav) return;

  const ALLOWED_TARGETS = [
    ["#about", "About"], ["#travel", "Reach"], ["#services", "Services"],
    ["#picture", "Beyond Live"], ["#work", "Selected Work"],
    ["#international", "International"], ["#testimonials", "Testimonials"],
    ["#rental", "Rental"], ["#contact", "Contact"]
  ];
  const MANAGED = new Set(["header", "travel", "picture"]);
  let active = null;
  let entry = null;
  let saved = null;
  let working = null;
  let busy = false;

  injectStyles();
  installHeaderButton();
  bindSectionButtons();
  bindActions();
  iframe.addEventListener("load", () => {
    if (active && working) window.setTimeout(applyPreview, 120);
  });

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function stable(value) { return JSON.stringify(value); }
  function dirty() { return Boolean(working && saved && stable(working) !== stable(saved)); }
  function localizedLang(doc) {
    return String(doc?.documentElement?.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }
  function getAtPath(object, path) {
    return String(path).split(".").reduce((value, key) => value == null ? undefined : value[key], object);
  }
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
  function toast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const node = document.createElement("div");
    node.className = `toast is-${type}`;
    const strong = document.createElement("strong"); strong.textContent = title; node.append(strong);
    if (detail) node.append(document.createTextNode(` ${detail}`));
    toastStack.append(node); window.setTimeout(() => node.remove(), 4400);
  }

  function installHeaderButton() {
    if (sectionNav.querySelector('[data-site-presentation-section="header"]')) return;
    const home = sectionNav.querySelector('[data-section="hero"]');
    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-link";
    button.dataset.sitePresentationSection = "header";
    button.textContent = "Header";
    if (home?.nextSibling) sectionNav.insertBefore(button, home.nextSibling);
    else sectionNav.append(button);
    button.addEventListener("click", () => void activate("header"));
  }

  function bindSectionButtons() {
    sectionNav.querySelectorAll("[data-section]").forEach((button) => {
      if (button.dataset.sitePresentationBound === "true") return;
      button.dataset.sitePresentationBound = "true";
      button.addEventListener("click", () => {
        const section = button.dataset.section;
        if (section === "travel" || section === "picture") {
          window.setTimeout(() => void activate(section), 0);
        } else {
          active = null;
          sectionNav.querySelector('[data-site-presentation-section="header"]')?.classList.remove("is-active");
        }
      });
    });
  }

  function bindActions() {
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
  }

  async function ensureLoaded(force = false) {
    if (entry && !force) return;
    const data = await fetchJson("/api/admin/content/site-presentation");
    entry = data.entry;
    saved = clone(entry.draft);
    working = clone(entry.draft);
  }

  async function activate(section) {
    if (!MANAGED.has(section)) return;
    active = section;
    sectionNav.querySelectorAll(".section-link").forEach((button) => {
      const key = button.dataset.sitePresentationSection || button.dataset.section;
      button.classList.toggle("is-active", key === section);
    });
    editorTitle.textContent = section === "header" ? "Header navigation" : section === "travel" ? "Reach · Alcance" : "Beyond Live · Más allá de lo en vivo";
    footerStatus.textContent = "Site presentation editor connected to D1.";
    footerDetail.textContent = "Header targets are bounded internal anchors. Draft changes remain private until Publish.";
    try {
      await ensureLoaded();
      if (active !== section) return;
      render();
      applyPreview();
      updateState();
      if (section !== "header") jump(section);
    } catch (error) {
      editorBody.innerHTML = `<p class="field-help">${escapeHtml(error.message)}</p>`;
      toast("Could not load Site presentation.", error.message, "error");
    }
  }

  function jump(section) {
    try { iframe.contentDocument?.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
  }

  function render() {
    editorBody.replaceChildren();
    if (active === "header") renderHeader();
    else if (active === "travel") renderTravel();
    else renderPicture();
  }

  function renderHeader() {
    const note = document.createElement("p");
    note.className = "site-presentation-note";
    note.textContent = "Only approved internal sections can be added. Sound Design and the Start Project CTA remain system-owned.";
    editorBody.append(note);

    const list = document.createElement("div");
    list.className = "site-nav-editor-list";
    working.header.items.forEach((item, index) => list.append(headerItem(item, index)));
    editorBody.append(list);

    const unused = ALLOWED_TARGETS.filter(([target]) => !working.header.items.some((item) => item.target === target));
    if (unused.length) {
      const addRow = document.createElement("div"); addRow.className = "site-nav-add-row";
      const select = document.createElement("select");
      unused.forEach(([target, label]) => {
        const option = document.createElement("option"); option.value = target; option.textContent = `${label} · ${target}`; select.append(option);
      });
      const add = document.createElement("button"); add.type = "button"; add.className = "site-presentation-button"; add.textContent = "+ Add header item";
      add.addEventListener("click", () => {
        const [target, label] = ALLOWED_TARGETS.find(([value]) => value === select.value) || [];
        if (!target) return;
        const id = target.slice(1).replace(/[^A-Za-z0-9_-]/g, "-");
        working.header.items.push({ id, target, label: { en: label, es: label }, visible: true });
        markDirty(true);
      });
      addRow.append(select, add); editorBody.append(addRow);
    }
  }

  function headerItem(item, index) {
    const card = document.createElement("div"); card.className = "site-nav-editor-card";
    const head = document.createElement("div"); head.className = "site-nav-editor-head";
    const title = document.createElement("strong"); title.textContent = item.target;
    const controls = document.createElement("div"); controls.className = "site-nav-order-controls";
    const up = mini("↑", "Move up", () => moveHeader(index, index - 1)); up.disabled = index === 0;
    const down = mini("↓", "Move down", () => moveHeader(index, index + 1)); down.disabled = index === working.header.items.length - 1;
    const remove = mini("Remove", "Remove header item", () => { working.header.items.splice(index, 1); markDirty(true); });
    controls.append(up, down, remove); head.append(title, controls); card.append(head);

    card.append(localizedField("Label", `header.items.${index}.label`));
    const meta = document.createElement("div"); meta.className = "site-nav-meta-grid";
    const targetField = document.createElement("label"); targetField.className = "field"; targetField.innerHTML = "<span>Approved target</span>";
    const targetSelect = document.createElement("select");
    ALLOWED_TARGETS.forEach(([target, label]) => {
      const option = document.createElement("option"); option.value = target; option.textContent = `${label} · ${target}`; option.selected = target === item.target; option.disabled = target !== item.target && working.header.items.some((other) => other.target === target); targetSelect.append(option);
    });
    targetSelect.addEventListener("change", () => { item.target = targetSelect.value; item.id = targetSelect.value.slice(1); markDirty(true); });
    targetField.append(targetSelect);
    const visible = document.createElement("label"); visible.className = "site-nav-visible";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = item.visible;
    checkbox.addEventListener("change", () => { item.visible = checkbox.checked; markDirty(); });
    visible.append(checkbox, document.createTextNode("Visible in header"));
    meta.append(targetField, visible); card.append(meta);
    return card;
  }

  function moveHeader(from, to) {
    if (to < 0 || to >= working.header.items.length) return;
    const [item] = working.header.items.splice(from, 1); working.header.items.splice(to, 0, item); markDirty(true);
  }

  function renderTravel() {
    const section = details("Reach copy", true);
    section.body.append(
      localizedField("Eyebrow", "travel.eyebrow"), localizedField("Title", "travel.title"), localizedField("Body", "travel.body", true),
      simpleField("Stat value", "travel.statValue"), localizedField("Stat label", "travel.statLabel")
    );
    editorBody.append(section.root);
  }

  function renderPicture() {
    const copy = details("Beyond Live copy", true);
    copy.body.append(localizedField("Eyebrow", "picture.eyebrow"), localizedField("Title", "picture.title"), localizedField("Body", "picture.body", true), localizedField("CTA label", "picture.ctaLabel"));
    editorBody.append(copy.root);
    const tags = details("Tags", true);
    const field = document.createElement("div"); field.className = "field field--full";
    const label = document.createElement("label"); label.textContent = "Tags · one per line";
    const textarea = document.createElement("textarea"); textarea.rows = 8; textarea.value = working.picture.tags.join("\n");
    textarea.addEventListener("input", () => {
      working.picture.tags = textarea.value.split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 12);
      markDirty();
    });
    field.append(label, textarea); tags.body.append(field); editorBody.append(tags.root);
  }

  function localizedField(label, path, multiline = false) {
    const grid = document.createElement("div"); grid.className = "field-grid field-grid--full";
    ["en", "es"].forEach((lang) => {
      const field = document.createElement("div"); field.className = "field";
      const labelEl = document.createElement("label"); const badge = document.createElement("span"); badge.className = "field-language"; badge.textContent = lang.toUpperCase(); labelEl.append(badge, document.createTextNode(label));
      const input = document.createElement(multiline ? "textarea" : "input"); if (!multiline) input.type = "text"; else input.rows = 5;
      const full = `${path}.${lang}`; input.value = getAtPath(working, full) ?? "";
      input.addEventListener("input", () => { setAtPath(working, full, input.value); markDirty(); });
      field.append(labelEl, input); grid.append(field);
    });
    return grid;
  }

  function simpleField(label, path) {
    const field = document.createElement("div"); field.className = "field field--full";
    const labelEl = document.createElement("label"); labelEl.textContent = label;
    const input = document.createElement("input"); input.type = "text"; input.value = getAtPath(working, path) ?? "";
    input.addEventListener("input", () => { setAtPath(working, path, input.value); markDirty(); });
    field.append(labelEl, input); return field;
  }

  function details(title, open = false) {
    const root = document.createElement("details"); root.className = "editor-section"; root.open = open;
    const summary = document.createElement("summary"); summary.textContent = title;
    const body = document.createElement("div"); body.className = "editor-section-content"; root.append(summary, body); return { root, body };
  }
  function mini(text, title, handler) {
    const button = document.createElement("button"); button.type = "button"; button.className = "site-presentation-mini"; button.textContent = text; button.title = title; button.addEventListener("click", handler); return button;
  }

  function markDirty(rerender = false) {
    applyPreview(); updateState(); if (rerender) render();
  }

  function applyLocalized(element, localized, lang) {
    if (!element || !localized) return;
    element.dataset.en = localized.en || ""; element.dataset.es = localized.es || ""; element.textContent = localized[lang] || "";
  }

  function applyPreview() {
    if (!working) return;
    try {
      const doc = iframe.contentDocument; if (!doc) return;
      const lang = localizedLang(doc);
      if (active === "header") applyHeaderPreview(doc, lang);
      if (active === "travel" || active === "header") applyTravelPreview(doc, lang);
      if (active === "picture" || active === "header") applyPicturePreview(doc, lang);
    } catch {}
  }

  function applyHeaderPreview(doc, lang) {
    const nav = doc.querySelector(".main-nav"); if (!nav) return;
    const managedTargets = new Set(ALLOWED_TARGETS.map(([target]) => target));
    nav.querySelectorAll(":scope > a").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (managedTargets.has(href) && !anchor.classList.contains("mobile-project-cta")) anchor.remove();
    });
    const marker = nav.firstElementChild;
    [...working.header.items].filter((item) => item.visible).forEach((item) => {
      const anchor = doc.createElement("a"); anchor.href = item.target; anchor.dataset.en = item.label.en; anchor.dataset.es = item.label.es; anchor.textContent = item.label[lang] || "";
      if (item.target === "#rental") anchor.classList.add("local-market-only");
      nav.insertBefore(anchor, marker);
    });
  }
  function applyTravelPreview(doc, lang) {
    const root = doc.getElementById("travel"); if (!root) return;
    applyLocalized(root.querySelector(".section-head .eyebrow"), working.travel.eyebrow, lang);
    applyLocalized(root.querySelector(".section-head h2"), working.travel.title, lang);
    applyLocalized(root.querySelector(".section-head p"), working.travel.body, lang);
    if (root.querySelector(".reach-stat strong")) root.querySelector(".reach-stat strong").textContent = working.travel.statValue;
    applyLocalized(root.querySelector(".reach-stat span"), working.travel.statLabel, lang);
  }
  function applyPicturePreview(doc, lang) {
    const root = doc.getElementById("picture"); if (!root) return;
    applyLocalized(root.querySelector(".eyebrow"), working.picture.eyebrow, lang);
    applyLocalized(root.querySelector("h2"), working.picture.title, lang);
    applyLocalized(root.querySelector(".picture-grid > .reveal > p"), working.picture.body, lang);
    applyLocalized(root.querySelector(".section-detail-link a"), working.picture.ctaLabel, lang);
    const list = root.querySelector(".picture-tags"); if (list) { list.replaceChildren(); working.picture.tags.forEach((tag) => { const li = doc.createElement("li"); li.textContent = tag; list.append(li); }); }
  }

  async function saveDraft() {
    if (!working || busy || !dirty()) return;
    busy = true; updateState();
    try {
      const data = await fetchJson("/api/admin/content/site-presentation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: working }) });
      entry = data.entry; saved = clone(entry.draft); working = clone(entry.draft); render(); applyPreview(); toast("Site presentation Draft saved.", "Published content is unchanged.");
    } catch (error) { toast("Save failed.", error.message, "error"); }
    finally { busy = false; updateState(); }
  }
  async function publish() {
    if (!working || busy) return;
    if (dirty()) await saveDraft();
    if (dirty()) return;
    busy = true; updateState();
    try {
      const data = await fetchJson("/api/admin/content/site-presentation/publish", { method: "POST" });
      entry = data.entry; saved = clone(entry.draft); working = clone(entry.draft); render(); applyPreview(); toast("Site presentation published.", "Header, Reach and Beyond Live now use Published D1.");
    } catch (error) { toast("Publish failed.", error.message, "error"); }
    finally { busy = false; updateState(); }
  }
  function discard() {
    if (!saved || busy) return;
    working = clone(saved); render(); applyPreview(); updateState(); toast("Draft changes discarded.");
  }

  function updateState() {
    if (!active) return;
    const changed = dirty();
    saveButton.disabled = busy || !changed; publishButton.disabled = busy; discardButton.disabled = busy || !changed;
    editorStateChip.textContent = busy ? "Working" : changed ? "Unsaved" : entry?.hasUnpublishedChanges ? "Draft" : "Published";
    editorStateChip.className = `editor-state-chip${changed ? " is-dirty" : ""}`;
    if (contentState) contentState.textContent = changed ? "Draft · unsaved" : entry?.hasUnpublishedChanges ? "Draft saved" : "Published";
    if (saveIndicator) saveIndicator.textContent = busy ? "Working…" : changed ? "Unsaved" : "Synced";
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function injectStyles() {
    if (document.getElementById("site-presentation-editor-style")) return;
    const style = document.createElement("style"); style.id = "site-presentation-editor-style";
    style.textContent = `
      .site-presentation-note{margin:0 0 12px;padding:10px 11px;border:1px solid var(--border);border-radius:9px;background:rgba(160,137,229,.06);color:var(--soft);font-size:10px;line-height:1.55}
      .site-nav-editor-list{display:grid;gap:9px}.site-nav-editor-card{padding:10px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.025)}
      .site-nav-editor-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.site-nav-editor-head strong{font-size:10px;color:var(--accent)}
      .site-nav-order-controls{display:flex;gap:5px}.site-presentation-mini,.site-presentation-button{appearance:none;border:1px solid var(--border);border-radius:7px;background:rgba(255,255,255,.04);color:var(--soft);font:inherit;font-size:9px;padding:6px 8px;cursor:pointer}.site-presentation-mini:disabled{opacity:.3;cursor:default}
      .site-nav-meta-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.site-nav-visible{display:flex;align-items:center;gap:6px;min-height:36px;color:var(--soft);font-size:9px}
      .site-nav-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px}.site-nav-add-row select,.site-nav-editor-card select{width:100%;min-height:36px;border:1px solid var(--border);border-radius:8px;background:var(--panel-strong);color:var(--text);padding:6px 8px;font:inherit;font-size:9px}
    `;
    document.head.append(style);
  }
})();
