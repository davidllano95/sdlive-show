(() => {
  if (window.SDLIVE_TRUSTED_EDITOR) return;
  window.SDLIVE_TRUSTED_EDITOR = true;

  const sectionButton = document.querySelector(
    '[data-section="trustedTitle"]'
  );
  const allSectionButtons = [
    ...document.querySelectorAll("[data-section]")
  ];
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

  const state = {
    active: false,
    loaded: false,
    loading: false,
    busy: false,
    entry: null,
    savedDraft: null,
    workingDraft: null,
    revisions: [],
    dirty: false
  };

  injectStyles();

  function clone(value) {
    return value == null
      ? value
      : JSON.parse(JSON.stringify(value));
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
      throw new Error(
        data?.detail ||
        data?.error ||
        `Request failed (${response.status})`
      );
    }

    return data;
  }

  function showToast(title, detail = "", type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;

    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);

    if (detail) {
      toast.append(document.createTextNode(` ${detail}`));
    }

    toastStack?.appendChild(toast);

    window.setTimeout(() => toast.remove(), 4200);
  }

  function getAtPath(object, path) {
    return path
      .split(".")
      .reduce(
        (value, key) =>
          value == null ? undefined : value[key],
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
        cursor[key] = /^\d+$/.test(parts[index + 1])
          ? []
          : {};
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
    if (!element || !localized) return;

    element.dataset.en = localized.en || "";
    element.dataset.es = localized.es || "";
    element.textContent = localized[lang] || "";
  }

  function addExtraClasses(element, value) {
    String(value || "")
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => element.classList.add(className));
  }

  function makeImage(doc, image, baseClass = "") {
    if (!image?.src) return null;

    const img = doc.createElement("img");
    img.src = image.src;
    img.alt = image.alt || "";

    if (baseClass) img.classList.add(baseClass);
    addExtraClasses(img, image.className);

    if (Number(image.width) > 0) {
      img.width = Number(image.width);
    }

    if (Number(image.height) > 0) {
      img.height = Number(image.height);
    }

    return img;
  }

  function buildClientCard(doc, client, lang) {
    const card = doc.createElement("figure");
    card.className = "client-strip-card";
    addExtraClasses(card, client.cardClass);
    card.dataset.client = client.id;

    if (client.reveal?.id) {
      card.dataset.supportedReveal = client.reveal.id;
      card.setAttribute("aria-expanded", "false");
    }

    const frame = doc.createElement("div");
    frame.className = "client-logo-frame";

    const logo = makeImage(doc, client.logo, "client-logo");
    if (logo) frame.appendChild(logo);

    const caption = doc.createElement("figcaption");
    const name = doc.createElement("strong");
    name.textContent = client.name || "Untitled client";
    caption.appendChild(name);

    const roleText = client.role?.[lang] || "";
    if (roleText) {
      const role = doc.createElement("span");
      applyLocalized(role, client.role, lang);
      caption.appendChild(role);
    }

    card.append(frame, caption);
    return card;
  }

  function buildReveal(doc, client, lang) {
    const reveal = client.reveal;
    if (!reveal?.id) return null;

    const wrapper = doc.createElement("div");
    wrapper.id = reveal.id;
    wrapper.className = "supported-reveal";
    addExtraClasses(wrapper, reveal.className);
    wrapper.setAttribute("aria-hidden", "true");

    const inner = doc.createElement("div");
    inner.className = "supported-reveal-inner";

    const label = doc.createElement("p");
    applyLocalized(label, reveal.label, lang);
    inner.appendChild(label);

    let logos = null;

    const ensureLogos = () => {
      if (logos) return logos;

      logos = doc.createElement("div");
      logos.className = "supported-reveal-logos";
      addExtraClasses(logos, reveal.layoutClass);
      inner.appendChild(logos);
      return logos;
    };

    (reveal.items || []).forEach((item) => {
      if (item.type === "collaboration") {
        const credit = doc.createElement("div");
        credit.className = "collaboration-credit";

        const image = makeImage(doc, item.image);
        if (image) credit.appendChild(image);

        const copy = doc.createElement("div");
        copy.className = "collaboration-credit-copy";

        const title = doc.createElement("strong");
        title.textContent = item.title || "Collaboration";
        copy.appendChild(title);

        (item.lines || []).forEach((localized) => {
          const line = doc.createElement("span");
          applyLocalized(line, localized, lang);
          copy.appendChild(line);
        });

        credit.appendChild(copy);
        inner.appendChild(credit);
        return;
      }

      const image = makeImage(doc, item);
      if (!image) return;

      if (item.tileClass) {
        const tile = doc.createElement("span");
        tile.className = "supported-brand-tile";
        addExtraClasses(tile, item.tileClass);
        tile.appendChild(image);
        ensureLogos().appendChild(tile);
      } else {
        ensureLogos().appendChild(image);
      }
    });

    wrapper.appendChild(inner);
    return wrapper;
  }

  function applyDraftToPreview() {
    if (!state.workingDraft) return false;

    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const section = doc?.querySelector(".trusted-wrap");

      if (!doc || !section) return false;

      const lang = previewLanguage(doc);
      const draft = state.workingDraft;

      const container = doc.createElement("div");
      container.className = "container";

      const title = doc.createElement("p");
      title.className = "trusted-label";
      title.id = "trustedTitle";
      applyLocalized(title, draft.title, lang);
      container.appendChild(title);

      const marquee = doc.createElement("div");
      marquee.className = "trusted-marquee";
      marquee.dataset.marquee = "";
      marquee.dataset.inViewport = "true";
      marquee.dataset.interactionPaused = "false";
      marquee.setAttribute("aria-label", "SD.Live collaborators");

      const track = doc.createElement("div");
      track.className = "trusted-track";

      const set = doc.createElement("div");
      set.className = "trusted-set";

      (draft.clients || []).forEach((client) => {
        set.appendChild(buildClientCard(doc, client, lang));
      });

      track.appendChild(set);
      marquee.appendChild(track);

      const children = [container, marquee];

      (draft.clients || []).forEach((client) => {
        const reveal = buildReveal(doc, client, lang);
        if (reveal) children.push(reveal);
      });

      section.replaceChildren(...children);
      section.setAttribute("aria-labelledby", "trustedTitle");

      if (typeof win?.buildTrustedMarquee === "function") {
        win.buildTrustedMarquee(marquee);
      }

      return true;
    } catch {
      return false;
    }
  }

  function markDirty() {
    state.dirty =
      stable(state.workingDraft) !==
      stable(state.savedDraft);

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

      const input = document.createElement(
        multiline ? "textarea" : "input"
      );
      if (!multiline) input.type = "text";
      input.dataset.trustedPath = `${path}.${lang}`;
      input.value =
        getAtPath(
          state.workingDraft,
          `${path}.${lang}`
        ) ?? "";

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
    input.dataset.trustedPath = path;
    input.value = getAtPath(state.workingDraft, path) ?? "";

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
    button.className = `trusted-mini-button${danger ? " is-danger" : ""}`;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function nextClientId() {
    const used = new Set(
      (state.workingDraft?.clients || []).map((client) => client.id)
    );

    let index = 1;
    while (used.has(`client-${index}`)) index += 1;
    return `client-${index}`;
  }

  function addClient() {
    const id = nextClientId();

    state.workingDraft.clients.push({
      id,
      name: "New client",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "",
        alt: "",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    });

    markDirty();
    renderEditor();
  }

  function addReveal(clientIndex) {
    const client = state.workingDraft.clients[clientIndex];
    if (!client || client.reveal) return;

    client.reveal = {
      id: `${client.id}-supported`,
      className: "",
      label: {
        en: `Brands supported through ${client.name}`,
        es: `Marcas atendidas a través de ${client.name}`
      },
      layoutClass: "",
      items: [
        {
          type: "logo",
          src: "",
          alt: "",
          className: "",
          tileClass: "",
          width: 800,
          height: 240
        }
      ]
    };

    markDirty();
    renderEditor();
  }

  function addLogoItem(clientIndex) {
    const reveal = state.workingDraft.clients[clientIndex]?.reveal;
    if (!reveal) return;

    reveal.items.push({
      type: "logo",
      src: "",
      alt: "",
      className: "",
      tileClass: "",
      width: 800,
      height: 240
    });

    markDirty();
    renderEditor();
  }

  function moveItem(array, index, delta) {
    const next = index + delta;
    if (next < 0 || next >= array.length) return;

    const [item] = array.splice(index, 1);
    array.splice(next, 0, item);
    markDirty();
    renderEditor();
  }

  function renderRevealItem(clientIndex, itemIndex, item) {
    const wrapper = document.createElement("div");
    wrapper.className = "trusted-subitem";

    const head = document.createElement("div");
    head.className = "trusted-item-head";

    const title = document.createElement("strong");
    title.textContent =
      item.type === "collaboration"
        ? item.title || `Collaboration ${itemIndex + 1}`
        : item.alt || `Brand logo ${itemIndex + 1}`;

    const actions = document.createElement("div");
    actions.className = "trusted-item-actions";

    const items = state.workingDraft.clients[clientIndex].reveal.items;

    actions.append(
      actionButton("↑", () => moveItem(items, itemIndex, -1), {
        disabled: itemIndex === 0
      }),
      actionButton("↓", () => moveItem(items, itemIndex, 1), {
        disabled: itemIndex === items.length - 1
      }),
      actionButton(
        "Remove",
        () => {
          if (items.length === 1) {
            state.workingDraft.clients[clientIndex].reveal = null;
          } else {
            items.splice(itemIndex, 1);
          }
          markDirty();
          renderEditor();
        },
        { danger: true }
      )
    );

    head.append(title, actions);
    wrapper.appendChild(head);

    const base = `clients.${clientIndex}.reveal.items.${itemIndex}`;

    if (item.type === "collaboration") {
      wrapper.append(
        simpleField({
          label: "Collaboration title",
          path: `${base}.title`
        }),
        simpleField({
          label: "Image asset path",
          path: `${base}.image.src`,
          help: "Use an existing assets/ path. Media Library comes later."
        }),
        simpleField({
          label: "Image alt text",
          path: `${base}.image.alt`
        })
      );

      (item.lines || []).forEach((line, lineIndex) => {
        wrapper.appendChild(
          localizedField({
            label: `Credit line ${lineIndex + 1}`,
            path: `${base}.lines.${lineIndex}`
          })
        );
      });
    } else {
      wrapper.append(
        simpleField({
          label: "Logo asset path",
          path: `${base}.src`,
          help: "Use an existing assets/ path. Media Library comes later."
        }),
        simpleField({
          label: "Logo alt text",
          path: `${base}.alt`
        })
      );
    }

    return wrapper;
  }

  function renderClientEditor(client, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "trusted-collection-item";

    const head = document.createElement("div");
    head.className = "trusted-item-head";

    const titleWrap = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.className = "trusted-item-kicker";
    kicker.textContent = `Client ${index + 1}`;
    const title = document.createElement("strong");
    title.textContent = client.name || client.id;
    titleWrap.append(kicker, title);

    const actions = document.createElement("div");
    actions.className = "trusted-item-actions";

    actions.append(
      actionButton(
        "↑",
        () => moveItem(state.workingDraft.clients, index, -1),
        { disabled: index === 0 }
      ),
      actionButton(
        "↓",
        () => moveItem(state.workingDraft.clients, index, 1),
        { disabled: index === state.workingDraft.clients.length - 1 }
      ),
      actionButton(
        client.id === "wlive" ? "Required" : "Delete",
        () => {
          if (client.id === "wlive") return;
          state.workingDraft.clients.splice(index, 1);
          markDirty();
          renderEditor();
        },
        {
          danger: client.id !== "wlive",
          disabled: client.id === "wlive" || state.workingDraft.clients.length <= 1
        }
      )
    );

    head.append(titleWrap, actions);
    wrapper.appendChild(head);

    wrapper.append(
      simpleField({
        label: "Client name",
        path: `clients.${index}.name`
      }),
      localizedField({
        label: "Role / relationship",
        path: `clients.${index}.role`
      }),
      simpleField({
        label: "Logo asset path",
        path: `clients.${index}.logo.src`,
        help: "Existing assets/ path. New uploads will move to the future Media Library."
      }),
      simpleField({
        label: "Logo alt text",
        path: `clients.${index}.logo.alt`
      })
    );

    const reveal = client.reveal;
    const revealBlock = document.createElement("div");
    revealBlock.className = "trusted-reveal-editor";

    const revealHead = document.createElement("div");
    revealHead.className = "trusted-item-head";

    const revealTitle = document.createElement("strong");
    revealTitle.textContent = reveal
      ? "Supported brands / collaborations"
      : "No supported-brand reveal";

    const revealActions = document.createElement("div");
    revealActions.className = "trusted-item-actions";

    if (reveal) {
      revealActions.append(
        actionButton("Add logo", () => addLogoItem(index)),
        actionButton(
          "Remove reveal",
          () => {
            state.workingDraft.clients[index].reveal = null;
            markDirty();
            renderEditor();
          },
          { danger: true }
        )
      );
    } else {
      revealActions.append(
        actionButton("Add supported brands", () => addReveal(index))
      );
    }

    revealHead.append(revealTitle, revealActions);
    revealBlock.appendChild(revealHead);

    if (reveal) {
      revealBlock.appendChild(
        localizedField({
          label: "Reveal heading",
          path: `clients.${index}.reveal.label`
        })
      );

      reveal.items.forEach((item, itemIndex) => {
        revealBlock.appendChild(
          renderRevealItem(index, itemIndex, item)
        );
      });
    }

    wrapper.appendChild(revealBlock);
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
      meta.textContent =
        `${revision.created_at}` +
        (revision.actor_email
          ? ` · ${revision.actor_email}`
          : "");

      row.append(type, meta);
      list.appendChild(row);
    });

    return list;
  }

  function bindInputs() {
    editorBody
      .querySelectorAll("[data-trusted-path]")
      .forEach((input) => {
        input.addEventListener("input", () => {
          setAtPath(
            state.workingDraft,
            input.dataset.trustedPath,
            input.value
          );
          markDirty();
        });
      });
  }

  function renderEditor() {
    if (!state.active) return;

    editorTitle.textContent = "Trusted by";
    editorBody.replaceChildren();

    if (state.loading || !state.workingDraft) {
      editorBody.innerHTML =
        '<div class="editor-loading">Loading Trusted By from D1…</div>';
      updateStateUI();
      return;
    }

    const titleSection = detailsSection("Section heading", true);
    titleSection.content.appendChild(
      localizedField({
        label: "Trusted by label",
        path: "title"
      })
    );

    const clientsSection = detailsSection("Clients", true);

    const toolbar = document.createElement("div");
    toolbar.className = "trusted-collection-toolbar";

    const count = document.createElement("span");
    count.textContent = `${state.workingDraft.clients.length} clients`;

    toolbar.append(
      count,
      actionButton("Add client", addClient)
    );

    clientsSection.content.appendChild(toolbar);

    state.workingDraft.clients.forEach((client, index) => {
      clientsSection.content.appendChild(
        renderClientEditor(client, index)
      );
    });

    const history = detailsSection("Revision history");
    history.content.appendChild(renderRevisionList());

    editorBody.append(
      titleSection.details,
      clientsSection.details,
      history.details
    );

    bindInputs();
    updateStateUI();
  }

  function updateStateUI() {
    if (!state.active) return;

    if (state.loading || !state.entry || !state.workingDraft) {
      editorStateChip.textContent = "Loading";
      editorStateChip.className = "editor-state-chip";
      saveDraftButton.disabled = true;
      publishButton.disabled = true;
      discardButton.disabled = true;
      return;
    }

    const unpublished =
      Boolean(state.entry.hasUnpublishedChanges) || state.dirty;

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

    contentStateLabel.textContent =
      state.dirty
        ? "Trusted · unsaved preview"
        : state.entry.hasUnpublishedChanges
          ? "Trusted · draft saved"
          : state.entry.source === "static-default"
            ? "Trusted · static seed"
            : "Trusted · CMS published";

    saveIndicator.textContent =
      state.dirty
        ? "Unsaved"
        : state.entry.hasUnpublishedChanges
          ? "Draft"
          : "Synced";

    saveIndicator.classList.toggle("is-dirty", unpublished);

    discardButton.disabled = state.busy || !state.dirty;
    saveDraftButton.disabled = state.busy || !state.dirty;
    publishButton.disabled =
      state.busy ||
      state.dirty ||
      !state.entry.hasUnpublishedChanges;

    publishButton.title =
      state.dirty
        ? "Save the draft first."
        : !state.entry.hasUnpublishedChanges
          ? "No unpublished Trusted By draft."
          : "Publish the saved Trusted By draft to D1.";
  }

  async function loadRevisions() {
    try {
      const data = await fetchJson(
        "/api/admin/content/trusted/revisions"
      );
      state.revisions = data.revisions || [];
    } catch {
      state.revisions = [];
    }
  }

  async function loadTrusted() {
    if (state.loading) return;

    state.loading = true;
    renderEditor();

    try {
      const [data] = await Promise.all([
        fetchJson("/api/admin/content/trusted"),
        loadRevisions()
      ]);

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;
      state.loaded = true;
      applyDraftToPreview();
    } catch (error) {
      editorStateChip.textContent = "Error";
      editorStateChip.className = "editor-state-chip is-error";
      editorBody.innerHTML =
        `<div class="editor-error">${escapeHtml(error.message)}</div>`;
      showToast("Trusted By unavailable.", error.message, "error");
    } finally {
      state.loading = false;
      renderEditor();
    }
  }

  async function saveDraft() {
    if (
      state.busy ||
      !state.dirty ||
      !state.workingDraft
    ) {
      return;
    }

    state.busy = true;
    updateStateUI();

    try {
      const data = await fetchJson(
        "/api/admin/content/trusted",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            draft: state.workingDraft
          })
        }
      );

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;

      await loadRevisions();
      applyDraftToPreview();
      renderEditor();

      showToast(
        "Trusted By draft saved.",
        "The public site has not changed yet."
      );
    } catch (error) {
      showToast("Save failed.", error.message, "error");
    } finally {
      state.busy = false;
      updateStateUI();
    }
  }

  async function publishContent() {
    if (
      state.busy ||
      state.dirty ||
      !state.entry?.hasUnpublishedChanges
    ) {
      return;
    }

    state.busy = true;
    updateStateUI();

    try {
      const data = await fetchJson(
        "/api/admin/content/trusted/publish",
        { method: "POST" }
      );

      state.entry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.dirty = false;

      await loadRevisions();
      applyDraftToPreview();
      renderEditor();

      showToast(
        "Trusted By published in CMS.",
        "Public SSR binding is the next gate."
      );
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
    showToast("Trusted By unsaved changes discarded.");
  }

  function activate() {
    state.active = true;

    footerStatus.textContent =
      "Trusted By editor connected to D1.";
    footerDetail.textContent =
      "Preview edits are local until Save Draft. Publish updates D1; public edge binding is the next gate.";

    renderEditor();

    if (!state.loaded && !state.loading) {
      void loadTrusted();
    } else {
      applyDraftToPreview();
    }
  }

  function deactivate() {
    state.active = false;
  }

  allSectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.section === "trustedTitle") {
        activate();
      } else {
        deactivate();
      }
    });
  });

  saveDraftButton.addEventListener(
    "click",
    (event) => {
      if (!state.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void saveDraft();
    },
    true
  );

  publishButton.addEventListener(
    "click",
    (event) => {
      if (!state.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void publishContent();
    },
    true
  );

  discardButton.addEventListener(
    "click",
    (event) => {
      if (!state.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      discardChanges();
    },
    true
  );

  iframe.addEventListener("load", () => {
    if (!state.loaded) return;

    window.setTimeout(() => {
      applyDraftToPreview();
    }, 140);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;

    event.preventDefault();
    event.returnValue = "";
  });

  function injectStyles() {
    if (document.getElementById("trusted-editor-styles")) return;

    const style = document.createElement("style");
    style.id = "trusted-editor-styles";
    style.textContent = `
      .trusted-collection-toolbar,
      .trusted-item-head,
      .trusted-item-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .trusted-collection-toolbar {
        margin-bottom: 12px;
        color: var(--muted, #9ba3b5);
        font-size: 12px;
      }

      .trusted-collection-item,
      .trusted-subitem,
      .trusted-reveal-editor {
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 12px;
        background: rgba(255,255,255,.025);
      }

      .trusted-collection-item + .trusted-collection-item {
        margin-top: 12px;
      }

      .trusted-reveal-editor,
      .trusted-subitem {
        margin-top: 12px;
      }

      .trusted-subitem {
        background: rgba(160,137,229,.035);
      }

      .trusted-item-head {
        align-items: flex-start;
        margin-bottom: 10px;
      }

      .trusted-item-head > div:first-child {
        display: grid;
        gap: 2px;
      }

      .trusted-item-kicker {
        color: rgba(255,255,255,.48);
        font-size: 10px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .trusted-item-actions {
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .trusted-mini-button {
        min-height: 28px;
        padding: 5px 8px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 7px;
        background: rgba(255,255,255,.055);
        color: inherit;
        font: inherit;
        font-size: 11px;
      }

      .trusted-mini-button:hover:not(:disabled) {
        border-color: rgba(160,137,229,.5);
        background: rgba(160,137,229,.12);
      }

      .trusted-mini-button.is-danger:hover:not(:disabled) {
        border-color: rgba(255,107,74,.55);
        background: rgba(255,107,74,.1);
      }

      .trusted-mini-button:disabled {
        opacity: .38;
        cursor: default;
      }

      .trusted-collection-item .field-grid,
      .trusted-collection-item .field,
      .trusted-subitem .field-grid,
      .trusted-subitem .field {
        margin-top: 10px;
      }
    `;

    document.head.appendChild(style);
  }
})();
