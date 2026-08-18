(() => {
  const iframe = document.getElementById("sitePreview");
  const stage = document.getElementById("previewStage");
  const address = document.getElementById("previewAddress");
  const deviceLabel = document.getElementById("deviceLabel");
  const marketLabel = document.getElementById("marketLabel");
  const contentStateLabel = document.getElementById("contentStateLabel");
  const viewTitle = document.getElementById("viewTitle");
  const openLive = document.getElementById("openLive");
  const refresh = document.getElementById("refreshPreview");
  const previewArea = document.querySelector(".preview-area");
  const inspector = document.getElementById("contentInspector");
  const toggleInspectorButton = document.getElementById("toggleInspector");
  const toggleInspectorLabel = document.getElementById("toggleInspectorLabel");

  const cmsStatusTitle = document.getElementById("cmsStatusTitle");
  const cmsStatusText = document.getElementById("cmsStatusText");
  const statusDot = document.querySelector(".status-dot");

  const editorTitle = document.getElementById("editorTitle");
  const editorBody = document.getElementById("editorBody");
  const editorStateChip = document.getElementById("editorStateChip");
  const saveDraftButton = document.getElementById("saveDraft");
  const publishButton = document.getElementById("publishContent");
  const discardButton = document.getElementById("discardChanges");
  const saveIndicator = document.getElementById("saveIndicator");
  const footerStatus = document.getElementById("footerStatus");
  const footerDetail = document.getElementById("footerDetail");
  const toastStack = document.getElementById("toastStack");

  const langButtons = [...document.querySelectorAll("[data-lang]")];
  const marketButtons = [...document.querySelectorAll("[data-market]")];
  const deviceButtons = [...document.querySelectorAll("[data-device]")];
  const sectionButtons = [...document.querySelectorAll("[data-section]")];

  const sections = {
    hero: "Home",
    trustedTitle: "Trusted by",
    about: "About",
    travel: "Worldwide",
    services: "Services",
    picture: "Sound for Picture",
    work: "Selected Work",
    testimonials: "Testimonials",
    rental: "Rental",
    contact: "Contact"
  };

  const state = {
    market: localStorage.getItem("sdlive-admin-market") || "colombia",
    lang: localStorage.getItem("sdlive-admin-lang") || "root",
    device: localStorage.getItem("sdlive-admin-device") || "desktop",
    inspectorCollapsed: localStorage.getItem("sdlive-admin-inspector-collapsed") === "true",
    section: "hero",
    userEmail: "",
    heroEntry: null,
    savedDraft: null,
    workingDraft: null,
    isDirty: false,
    busy: false,
    revisions: []
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    return JSON.stringify(value);
  }

  function routeFor(lang) {
    const fileMode = window.location.protocol === "file:";

    if (fileMode) {
      if (lang === "en") return "../en/index.html";
      if (lang === "es") return "../es-co/index.html";
      return "../index.html";
    }

    if (lang === "en") return "/en/";
    if (lang === "es") return "/es-co/";
    return "/";
  }

  function publicLabel(lang) {
    if (lang === "en") return "sdlive.show/en/";
    if (lang === "es") return "sdlive.show/es-co/";
    return "sdlive.show/";
  }

  function currentUrl(includeSection = true) {
    const base = routeFor(state.lang);
    const hash =
      includeSection &&
      state.section &&
      state.section !== "hero"
        ? `#${state.section}`
        : "";

    return `${base}${hash}`;
  }

  function previewLanguage(doc) {
    if (state.lang === "es") return "es";
    if (state.lang === "en") return "en";

    return String(doc?.documentElement?.lang || "en")
      .toLowerCase()
      .startsWith("es")
      ? "es"
      : "en";
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

    toastStack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 4200);
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

  function setCmsStatus(mode, title, detail) {
    cmsStatusTitle.textContent = title;
    cmsStatusText.textContent = detail;

    statusDot.classList.toggle("is-loading", mode === "loading");
    statusDot.classList.toggle("is-error", mode === "error");
  }

  function updateMarketUI() {
    const isInternational = state.market === "international";

    marketButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.market === state.market
      );
    });

    marketLabel.textContent = isInternational ? "INT" : "COL";

    const rentalButton = sectionButtons.find(
      (button) => button.dataset.section === "rental"
    );

    if (rentalButton) {
      rentalButton.classList.toggle(
        "is-market-hidden",
        isInternational
      );
      rentalButton.disabled = isInternational;
      rentalButton.setAttribute(
        "aria-hidden",
        isInternational ? "true" : "false"
      );
    }
  }

  function applyMarketToPreview() {
    try {
      const doc = iframe.contentDocument;

      if (!doc?.documentElement) return false;

      doc.documentElement.dataset.market = state.market;
      return true;
    } catch {
      return false;
    }
  }

  function updatePreview({ reload = true } = {}) {
    if (reload) {
      iframe.src = currentUrl(true);
    }

    address.textContent =
      publicLabel(state.lang) +
      (state.section !== "hero" ? `#${state.section}` : "");

    openLive.href = currentUrl(true);
    viewTitle.textContent = sections[state.section] || "Site preview";

    langButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.lang === state.lang
      );
    });

    updateMarketUI();

    sectionButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.section === state.section
      );
    });

    deviceButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.device === state.device
      );
    });

    stage.dataset.device = state.device;
    deviceLabel.textContent =
      state.device === "mobile"
        ? "Mobile · 390px"
        : "Desktop";
  }

  function jumpInsidePreview(section) {
    try {
      const doc = iframe.contentDocument;
      const target = doc?.getElementById(section);

      if (!target) return false;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      return true;
    } catch {
      return false;
    }
  }

  function setTextWithLocales(element, localized, lang) {
    if (!element || !localized) return;

    element.dataset.en = localized.en || "";
    element.dataset.es = localized.es || "";
    element.textContent = localized[lang] || "";
  }

  function createBrandWordmarkNode(doc) {
    const wordmark = doc.createElement("span");
    wordmark.className = "brand-wordmark-text";
    wordmark.setAttribute("aria-label", "SD.Live");
    wordmark.append(doc.createTextNode("SD"));

    const dot = doc.createElement("span");
    dot.className = "brand-wordmark-text__dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = ".";

    wordmark.append(dot, doc.createTextNode("Live"));
    return wordmark;
  }

  function styleBrandMentionsInPreview(root) {
    if (!root) return;

    const doc = root.ownerDocument || iframe.contentDocument;
    const view = doc?.defaultView;
    const NodeFilterRef = view?.NodeFilter;

    if (!doc || !NodeFilterRef) return;

    // Prefer the site's own canonical formatter when available.
    try {
      if (typeof iframe.contentWindow?.styleBrandMentions === "function") {
        iframe.contentWindow.styleBrandMentions(root);
        return;
      }
    } catch {
      // Same-origin fallback below.
    }

    const matches = [];
    const walker = doc.createTreeWalker(
      root,
      NodeFilterRef.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue?.includes("SD.Live")) {
            return NodeFilterRef.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (
            !parent ||
            parent.closest(
              ".brand-wordmark-text, script, style, textarea, noscript, svg"
            )
          ) {
            return NodeFilterRef.FILTER_REJECT;
          }

          return NodeFilterRef.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) matches.push(walker.currentNode);

    matches.forEach((textNode) => {
      const parts = textNode.nodeValue.split("SD.Live");
      const fragment = doc.createDocumentFragment();

      parts.forEach((part, index) => {
        if (part) fragment.append(doc.createTextNode(part));
        if (index < parts.length - 1) {
          fragment.append(createBrandWordmarkNode(doc));
        }
      });

      textNode.replaceWith(fragment);
    });
  }

  function updateInspectorVisibility() {
    const collapsed = Boolean(state.inspectorCollapsed);

    previewArea?.classList.toggle(
      "is-inspector-collapsed",
      collapsed
    );

    if (inspector) {
      inspector.setAttribute("aria-hidden", collapsed ? "true" : "false");
    }

    if (toggleInspectorButton) {
      toggleInspectorButton.setAttribute(
        "aria-expanded",
        collapsed ? "false" : "true"
      );
      toggleInspectorButton.title = collapsed
        ? "Show editor"
        : "Hide editor";
      toggleInspectorButton.classList.toggle("is-active", collapsed);
    }

    if (toggleInspectorLabel) {
      toggleInspectorLabel.textContent = collapsed
        ? "Show editor"
        : "Hide editor";
    }
  }

  function applyHeroDraftToPreview() {
    if (!state.workingDraft) return false;

    try {
      const doc = iframe.contentDocument;

      if (!doc) return false;

      const hero = doc.getElementById("hero");
      if (!hero) return false;

      const lang = previewLanguage(doc);
      const draft = state.workingDraft;

      const headlineSpans = hero.querySelectorAll("h1 > span");
      const accent = hero.querySelector("h1 > em");
      const lede = hero.querySelector(".hero-lede");
      const primary = hero.querySelector(".hero-actions .btn-primary");
      const secondary = hero.querySelector(".hero-actions .btn-ghost");
      const stats = [...hero.querySelectorAll(".hero-stats .stat-card")];

      setTextWithLocales(
        headlineSpans[0],
        draft.headline?.line1,
        lang
      );

      setTextWithLocales(
        headlineSpans[1],
        draft.headline?.line2,
        lang
      );

      setTextWithLocales(
        accent,
        draft.headline?.accent,
        lang
      );

      setTextWithLocales(lede, draft.lede, lang);

      setTextWithLocales(
        primary,
        draft.actions?.primary?.label,
        lang
      );

      setTextWithLocales(
        secondary,
        draft.actions?.secondary?.label,
        lang
      );

      if (primary && draft.actions?.primary?.href) {
        primary.setAttribute(
          "href",
          draft.actions.primary.href
        );
      }

      if (secondary && draft.actions?.secondary?.href) {
        secondary.setAttribute(
          "href",
          draft.actions.secondary.href
        );
      }

      stats.forEach((card, index) => {
        const stat = draft.stats?.[index];
        if (!stat) return;

        setTextWithLocales(
          card.querySelector(".stat-value"),
          stat.value,
          lang
        );

        setTextWithLocales(
          card.querySelector(".stat-label"),
          stat.label,
          lang
        );
      });

      // CMS stores the literal text "SD.Live". Rendering always restores
      // the brand wordmark treatment, including the floating midpoint dot.
      styleBrandMentionsInPreview(hero);

      return true;
    } catch {
      return false;
    }
  }

  function fallbackSetSupportedReveal(doc, marquee, card) {
    const revealId = card?.dataset.supportedReveal || "";
    const region = marquee.closest(".trusted-wrap") || doc;

    region
      .querySelectorAll(".supported-reveal")
      .forEach((reveal) => {
        const active = reveal.id === revealId;
        reveal.classList.toggle("is-active", active);
        reveal.setAttribute("aria-hidden", String(!active));
      });

    marquee
      .querySelectorAll(
        ".client-strip-card[data-supported-reveal]"
      )
      .forEach((item) => {
        const active =
          Boolean(revealId) &&
          item.dataset.supportedReveal === revealId;

        item.classList.toggle(
          "is-reveal-active",
          active
        );
        item.setAttribute(
          "aria-expanded",
          String(active)
        );
      });
  }

  function installDesktopBrandHoverBridge() {
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) return;

      doc.querySelectorAll("[data-marquee]").forEach((marquee) => {
        if (marquee.dataset.adminHoverBridgeBound === "true") {
          return;
        }

        marquee.dataset.adminHoverBridgeBound = "true";

        const region =
          marquee.closest(".trusted-wrap") || marquee;

        let closeTimer = 0;

        const pause = () => {
          marquee.dataset.interactionPaused = "true";

          if (
            typeof win.updateTrustedMarqueePlayback === "function"
          ) {
            win.updateTrustedMarqueePlayback(marquee);
          } else {
            marquee
              .querySelector(".trusted-track")
              ?.getAnimations()
              .forEach((animation) => animation.pause());
          }
        };

        const resume = () => {
          marquee.dataset.interactionPaused = "false";

          if (
            typeof win.updateTrustedMarqueePlayback === "function"
          ) {
            win.updateTrustedMarqueePlayback(marquee);
          } else {
            marquee
              .querySelector(".trusted-track")
              ?.getAnimations()
              .forEach((animation) => animation.play());
          }
        };

        const reveal = (card) => {
          if (
            typeof win.setSupportedBrandsReveal === "function"
          ) {
            win.setSupportedBrandsReveal(marquee, card);
          } else {
            fallbackSetSupportedReveal(doc, marquee, card);
          }
        };

        const clearTimer = () => {
          if (!closeTimer) return;
          window.clearTimeout(closeTimer);
          closeTimer = 0;
        };

        const close = () => {
          clearTimer();
          reveal(null);
          resume();
        };

        const scheduleClose = () => {
          clearTimer();
          closeTimer = window.setTimeout(close, 260);
        };

        marquee.addEventListener("pointerover", (event) => {
          if (state.device !== "desktop") return;

          const card = event.target.closest?.(
            ".client-strip-card[data-supported-reveal]"
          );

          if (!card || !marquee.contains(card)) return;

          clearTimer();
          pause();
          reveal(card);
        });

        marquee.addEventListener("pointerout", (event) => {
          if (state.device !== "desktop") return;

          const card = event.target.closest?.(
            ".client-strip-card[data-supported-reveal]"
          );

          if (!card || !marquee.contains(card)) return;

          const nextCard = event.relatedTarget?.closest?.(
            ".client-strip-card[data-supported-reveal]"
          );

          if (nextCard && marquee.contains(nextCard)) {
            return;
          }

          const revealId =
            card.dataset.supportedReveal || "";

          const targetReveal =
            revealId
              ? doc.getElementById(revealId)
              : null;

          if (
            targetReveal &&
            targetReveal.contains(event.relatedTarget)
          ) {
            return;
          }

          scheduleClose();
        });

        region
          .querySelectorAll(".supported-reveal")
          .forEach((revealElement) => {
            revealElement.addEventListener(
              "pointerenter",
              () => {
                if (state.device !== "desktop") return;
                clearTimer();
                pause();
              }
            );

            revealElement.addEventListener(
              "pointerleave",
              (event) => {
                if (state.device !== "desktop") return;

                const nextCard =
                  event.relatedTarget?.closest?.(
                    ".client-strip-card[data-supported-reveal]"
                  );

                if (
                  nextCard &&
                  marquee.contains(nextCard)
                ) {
                  return;
                }

                scheduleClose();
              }
            );
          });
      });
    } catch {
      // Preview still functions without the editor-only hover bridge.
    }
  }

  function localizedField({
    label,
    path,
    multiline = false,
    full = false
  }) {
    const wrapper = document.createElement("div");
    wrapper.className = `field-grid${full ? " field-grid--full" : ""}`;

    for (const lang of ["en", "es"]) {
      const field = document.createElement("div");
      field.className = "field";

      const fieldLabel = document.createElement("label");
      const language = document.createElement("span");
      language.className = "field-language";
      language.textContent = lang.toUpperCase();

      fieldLabel.append(
        language,
        document.createTextNode(label)
      );

      const input = document.createElement(
        multiline ? "textarea" : "input"
      );

      input.dataset.editPath = `${path}.${lang}`;
      input.value =
        getAtPath(
          state.workingDraft,
          `${path}.${lang}`
        ) ?? "";

      if (!multiline) {
        input.type = "text";
      }

      field.append(fieldLabel, input);
      wrapper.appendChild(field);
    }

    return wrapper;
  }

  function simpleField({
    label,
    path,
    help = "",
    full = true
  }) {
    const field = document.createElement("div");
    field.className = `field${full ? " field--full" : ""}`;

    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.editPath = path;
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

  function renderHeroEditor() {
    if (!state.workingDraft) {
      editorBody.innerHTML =
        '<div class="editor-loading">Loading Hero from D1…</div>';
      return;
    }

    editorTitle.textContent = "Hero";
    editorBody.replaceChildren();

    const headline = detailsSection("Headline", true);
    headline.content.append(
      localizedField({
        label: "Line 1",
        path: "headline.line1"
      }),
      localizedField({
        label: "Line 2",
        path: "headline.line2"
      }),
      localizedField({
        label: "Accent line",
        path: "headline.accent"
      })
    );

    const lede = detailsSection("Description", true);
    lede.content.append(
      localizedField({
        label: "Hero description",
        path: "lede",
        multiline: true
      })
    );

    const actions = detailsSection("Calls to action");
    actions.content.append(
      localizedField({
        label: "Primary label",
        path: "actions.primary.label"
      }),
      simpleField({
        label: "Primary target",
        path: "actions.primary.href",
        help: "Internal section anchor, for example #services."
      }),
      localizedField({
        label: "Secondary label",
        path: "actions.secondary.label"
      }),
      simpleField({
        label: "Secondary target",
        path: "actions.secondary.href",
        help: "Internal section anchor, for example #work."
      })
    );

    const stats = detailsSection("Capability cards");
    state.workingDraft.stats.forEach((stat, index) => {
      const card = document.createElement("div");
      card.className = "stat-editor";

      const title = document.createElement("div");
      title.className = "stat-editor-title";
      title.textContent = `Card ${index + 1}`;

      card.append(
        title,
        localizedField({
          label: "Value",
          path: `stats.${index}.value`
        }),
        localizedField({
          label: "Label",
          path: `stats.${index}.label`
        })
      );

      stats.content.appendChild(card);
    });

    const history = detailsSection("Revision history");
    history.content.appendChild(
      renderRevisionList()
    );

    editorBody.append(
      headline.details,
      lede.details,
      actions.details,
      stats.details,
      history.details
    );

    editorBody
      .querySelectorAll("[data-edit-path]")
      .forEach((input) => {
        input.addEventListener("input", () => {
          setAtPath(
            state.workingDraft,
            input.dataset.editPath,
            input.value
          );

          state.isDirty =
            stable(state.workingDraft) !==
            stable(state.savedDraft);

          applyHeroDraftToPreview();
          updateEditorState();
        });
      });

    updateEditorState();
  }

  function renderRevisionList() {
    const list = document.createElement("div");
    list.className = "revision-list";

    if (!state.revisions.length) {
      const empty = document.createElement("div");
      empty.className = "field-help";
      empty.textContent =
        "No Save or Publish revisions yet.";
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

  function renderUnavailableEditor() {
    editorTitle.textContent =
      sections[state.section] || "Section";

    editorBody.innerHTML = `
      <div class="editor-empty">
        <strong>This section is preview-only in V3.</strong><br>
        Hero is the first section connected to D1. Once Save/Publish is verified here, the same editor pattern will be extended to the rest of the site.
      </div>
    `;

    editorStateChip.textContent = "Preview";
    editorStateChip.className = "editor-state-chip";

    saveDraftButton.disabled = true;
    publishButton.disabled = true;
    discardButton.disabled = true;
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
        cursor[key] =
          /^\d+$/.test(parts[index + 1])
            ? []
            : {};
      }

      cursor = cursor[key];
    });
  }

  function updateEditorState() {
    if (state.section !== "hero") {
      renderUnavailableEditor();
      return;
    }

    if (!state.heroEntry || !state.workingDraft) {
      editorStateChip.textContent = "Loading";
      editorStateChip.className = "editor-state-chip";
      saveDraftButton.disabled = true;
      publishButton.disabled = true;
      discardButton.disabled = true;
      return;
    }

    const unpublished =
      Boolean(state.heroEntry.hasUnpublishedChanges) ||
      state.isDirty;

    if (state.busy) {
      editorStateChip.textContent = "Working";
      editorStateChip.className = "editor-state-chip";
    } else if (state.isDirty) {
      editorStateChip.textContent = "Unsaved";
      editorStateChip.className =
        "editor-state-chip is-dirty";
    } else if (state.heroEntry.hasUnpublishedChanges) {
      editorStateChip.textContent = "Draft";
      editorStateChip.className =
        "editor-state-chip is-dirty";
    } else {
      editorStateChip.textContent = "Published";
      editorStateChip.className =
        "editor-state-chip is-published";
    }

    contentStateLabel.textContent =
      state.isDirty
        ? "Unsaved preview"
        : state.heroEntry.hasUnpublishedChanges
          ? "Draft saved"
          : "CMS published";

    saveIndicator.textContent =
      state.isDirty
        ? "Unsaved"
        : state.heroEntry.hasUnpublishedChanges
          ? "Draft"
          : "Synced";

    saveIndicator.classList.toggle(
      "is-dirty",
      unpublished
    );

    discardButton.disabled =
      state.busy || !state.isDirty;

    saveDraftButton.disabled =
      state.busy || !state.isDirty;

    publishButton.disabled =
      state.busy ||
      state.isDirty ||
      !state.heroEntry.hasUnpublishedChanges;

    publishButton.title =
      state.isDirty
        ? "Save the draft first."
        : !state.heroEntry.hasUnpublishedChanges
          ? "No unpublished draft."
          : "Publish the saved draft to CMS.";
  }

  async function loadWhoAmI() {
    setCmsStatus(
      "loading",
      "Connecting CMS",
      "Checking Cloudflare Access…"
    );

    const data = await fetchJson("/api/admin/whoami");

    state.userEmail = data.email || "";

    setCmsStatus(
      "ready",
      "CMS connected",
      state.userEmail || "Authenticated"
    );
  }

  async function loadHero() {
    const data = await fetchJson(
      "/api/admin/content/hero"
    );

    state.heroEntry = data.entry;
    state.savedDraft = clone(data.entry.draft);
    state.workingDraft = clone(data.entry.draft);
    state.isDirty = false;

    applyHeroDraftToPreview();
  }

  async function loadRevisions() {
    try {
      const data = await fetchJson(
        "/api/admin/content/hero/revisions"
      );

      state.revisions = data.revisions || [];
    } catch {
      state.revisions = [];
    }
  }

  async function loadCms() {
    try {
      await loadWhoAmI();
      await Promise.all([
        loadHero(),
        loadRevisions()
      ]);

      renderHeroEditor();
      updateEditorState();

      footerStatus.textContent =
        "Hero editor connected to D1.";

      footerDetail.textContent =
        "Preview changes are local until Save Draft. Publish updates the CMS; live-site binding comes next.";
    } catch (error) {
      setCmsStatus(
        "error",
        "CMS unavailable",
        error.message
      );

      editorStateChip.textContent = "Error";
      editorStateChip.className =
        "editor-state-chip is-error";

      editorBody.innerHTML =
        `<div class="editor-error">${escapeHtml(error.message)}</div>`;

      footerStatus.textContent =
        "Could not load the CMS.";

      footerDetail.textContent =
        "Check the Access session and Worker deployment.";
    }
  }

  async function saveDraft() {
    if (
      state.busy ||
      !state.isDirty ||
      !state.workingDraft
    ) {
      return;
    }

    state.busy = true;
    updateEditorState();

    try {
      const data = await fetchJson(
        "/api/admin/content/hero",
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

      state.heroEntry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.isDirty = false;

      await loadRevisions();
      renderHeroEditor();
      applyHeroDraftToPreview();

      showToast(
        "Draft saved.",
        "The public site has not changed."
      );
    } catch (error) {
      showToast(
        "Save failed.",
        error.message,
        "error"
      );
    } finally {
      state.busy = false;
      updateEditorState();
    }
  }

  async function publishContent() {
    if (
      state.busy ||
      state.isDirty ||
      !state.heroEntry?.hasUnpublishedChanges
    ) {
      return;
    }

    state.busy = true;
    updateEditorState();

    try {
      const data = await fetchJson(
        "/api/admin/content/hero/publish",
        {
          method: "POST"
        }
      );

      state.heroEntry = data.entry;
      state.savedDraft = clone(data.entry.draft);
      state.workingDraft = clone(data.entry.draft);
      state.isDirty = false;

      await loadRevisions();
      renderHeroEditor();
      applyHeroDraftToPreview();

      showToast(
        "Published in CMS.",
        "D1 Published now matches Draft. Live-site binding is the next step."
      );
    } catch (error) {
      showToast(
        "Publish failed.",
        error.message,
        "error"
      );
    } finally {
      state.busy = false;
      updateEditorState();
    }
  }

  function discardChanges() {
    if (!state.isDirty || !state.savedDraft) return;

    state.workingDraft = clone(state.savedDraft);
    state.isDirty = false;

    renderHeroEditor();
    applyHeroDraftToPreview();
    updateEditorState();

    showToast(
      "Unsaved changes discarded."
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  marketButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.market = button.dataset.market;
      localStorage.setItem(
        "sdlive-admin-market",
        state.market
      );

      if (
        state.market === "international" &&
        state.section === "rental"
      ) {
        state.section = "hero";
      }

      const applied = applyMarketToPreview();
      updatePreview({ reload: !applied });

      if (applied && state.section !== "hero") {
        jumpInsidePreview(state.section);
      }

      applyHeroDraftToPreview();
    });
  });

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.lang = button.dataset.lang;

      localStorage.setItem(
        "sdlive-admin-lang",
        state.lang
      );

      updatePreview();
    });
  });

  deviceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.device = button.dataset.device;

      localStorage.setItem(
        "sdlive-admin-device",
        state.device
      );

      updatePreview({ reload: false });

      if (state.device === "desktop") {
        installDesktopBrandHoverBridge();
      }
    });
  });

  sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.section;

      const jumped =
        jumpInsidePreview(state.section);

      updatePreview({ reload: !jumped });

      if (state.section === "hero") {
        renderHeroEditor();
        applyHeroDraftToPreview();
      } else {
        renderUnavailableEditor();
      }
    });
  });

  toggleInspectorButton?.addEventListener("click", () => {
    state.inspectorCollapsed = !state.inspectorCollapsed;

    localStorage.setItem(
      "sdlive-admin-inspector-collapsed",
      String(state.inspectorCollapsed)
    );

    updateInspectorVisibility();
  });

  refresh.addEventListener("click", () => {
    try {
      iframe.contentWindow.location.reload();
    } catch {
      iframe.src = currentUrl(true);
    }
  });

  saveDraftButton.addEventListener(
    "click",
    saveDraft
  );

  publishButton.addEventListener(
    "click",
    publishContent
  );

  discardButton.addEventListener(
    "click",
    discardChanges
  );

  iframe.addEventListener("load", () => {
    applyMarketToPreview();

    window.setTimeout(() => {
      applyMarketToPreview();
      applyHeroDraftToPreview();
      try {
        styleBrandMentionsInPreview(iframe.contentDocument?.body);
      } catch {
        // Preview remains usable if the iframe is not ready yet.
      }
      installDesktopBrandHoverBridge();

      if (state.section !== "hero") {
        jumpInsidePreview(state.section);
      }
    }, 80);

    window.setTimeout(() => {
      installDesktopBrandHoverBridge();
    }, 500);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.isDirty) return;

    event.preventDefault();
    event.returnValue = "";
  });

  updateInspectorVisibility();
  updatePreview();
  loadCms();
})();
