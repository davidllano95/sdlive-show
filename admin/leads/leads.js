(() => {
  const shell = document.querySelector(".backoffice");
  const collapse = document.getElementById("collapseSidebar");
  const identity = document.getElementById("identity");
  const statusPill = document.getElementById("leadsStatus");
  const list = document.getElementById("leadList");
  const detail = document.getElementById("leadDetail");
  const search = document.getElementById("leadSearch");
  const sourceFilter = document.getElementById("leadSourceFilter");
  const statusFilter = document.getElementById("leadStatusFilter");
  const visibleCount = document.getElementById("visibleLeadCount");
  const metrics = {
    total: document.getElementById("metricTotal"),
    new: document.getElementById("metricNew"),
    contact: document.getElementById("metricContact"),
    rental: document.getElementById("metricRental")
  };

  const LEAD_STATUSES = ["new", "contacted", "quoted", "confirmed", "lost"];

  const state = {
    leads: [],
    selectedId: null
  };

  function safeStorageGet(key) {
    try { return window.localStorage?.getItem(key) ?? null; } catch { return null; }
  }

  function safeStorageSet(key, value) {
    try { window.localStorage?.setItem(key, value); } catch {}
  }

  const collapsed = safeStorageGet("sdlive-admin-dashboard-collapsed") === "true";
  shell?.classList.toggle("is-collapsed", collapsed);
  if (collapsed && collapse) collapse.textContent = "Expand";

  collapse?.addEventListener("click", () => {
    const next = !shell?.classList.contains("is-collapsed");
    shell?.classList.toggle("is-collapsed", next);
    safeStorageSet("sdlive-admin-dashboard-collapsed", String(next));
    collapse.textContent = next ? "Expand" : "Collapse";
  });

  async function api(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        ...options,
        headers,
        signal: controller.signal
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("Admin API timed out");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function setStatus(text, mode = "ok") {
    const label = statusPill?.querySelector("span");
    if (label) label.textContent = text;
    statusPill?.classList.toggle("is-error", mode === "error");
    statusPill?.classList.toggle("is-warning", mode === "warning");
  }

  function humanize(value) {
    return String(value || "—")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function projectLabel(lead) {
    return [lead.project?.date, lead.project?.city, lead.project?.venue]
      .filter(Boolean)
      .join(" · ") || humanize(lead.serviceCategory);
  }

  function searchableText(lead) {
    return [
      lead.id,
      lead.name,
      lead.email,
      lead.summary,
      lead.source,
      lead.status,
      lead.serviceCategory,
      lead.market,
      lead.project?.date,
      lead.project?.city,
      lead.project?.venue
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function filteredLeads() {
    const query = String(search?.value || "").trim().toLowerCase();
    const source = sourceFilter?.value || "all";
    const status = statusFilter?.value || "all";

    return state.leads.filter((lead) => {
      if (source !== "all" && lead.source !== source) return false;
      if (status !== "all" && lead.status !== status) return false;
      if (query && !searchableText(lead).includes(query)) return false;
      return true;
    });
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeBadge(text) {
    return element("span", "lead-badge", humanize(text));
  }

  function makeStatus(status) {
    const node = element("span", "lead-status", humanize(status));
    node.dataset.status = status || "new";
    return node;
  }

  function renderMetrics() {
    const leads = state.leads;
    if (metrics.total) metrics.total.textContent = String(leads.length);
    if (metrics.new) metrics.new.textContent = String(leads.filter((lead) => lead.status === "new").length);
    if (metrics.contact) metrics.contact.textContent = String(leads.filter((lead) => lead.source === "contact").length);
    if (metrics.rental) metrics.rental.textContent = String(leads.filter((lead) => lead.source === "rental").length);
  }

  function renderList() {
    if (!list) return;
    const leads = filteredLeads();
    list.innerHTML = "";
    if (visibleCount) visibleCount.textContent = `${leads.length} shown`;

    if (!leads.length) {
      list.appendChild(element("div", "leads-empty", "No leads match these filters."));
      return;
    }

    leads.forEach((lead) => {
      const button = element("button", "lead-row");
      button.type = "button";
      button.dataset.leadId = String(lead.id);
      button.classList.toggle("is-selected", lead.id === state.selectedId);

      const primary = element("div", "lead-row__primary");
      primary.appendChild(element("strong", "lead-row__name", lead.name || `Lead #${lead.id}`));
      primary.appendChild(element("span", "lead-row__email", lead.email || "No email"));
      primary.appendChild(element("span", "lead-row__project", projectLabel(lead)));

      const meta = element("div", "lead-row__meta");
      meta.append(makeBadge(lead.source), makeBadge(lead.serviceCategory));

      const statusWrap = element("div", "lead-row__status");
      statusWrap.appendChild(makeStatus(lead.status));
      statusWrap.appendChild(element("span", "lead-row__id", `#${lead.id}`));

      button.append(primary, meta, statusWrap);
      button.addEventListener("click", () => selectLead(lead.id));
      list.appendChild(button);
    });
  }

  function field(label, value, href = null) {
    const wrap = element("div", "lead-detail__field");
    wrap.appendChild(element("span", "", label));
    if (href && value) {
      const link = element("a", "", value);
      link.href = href;
      if (/^https?:/i.test(href)) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      wrap.appendChild(link);
    } else {
      wrap.appendChild(element("strong", "", value || "—"));
    }
    return wrap;
  }

  function section(title) {
    const node = element("section", "lead-detail__section");
    node.appendChild(element("h4", "", title));
    return node;
  }

  function appendDetailObject(sectionNode, details) {
    const entries = Object.entries(details || {}).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    });

    if (!entries.length) {
      sectionNode.appendChild(element("p", "lead-summary", "No additional structured details."));
      return;
    }

    const grid = element("div", "lead-detail__details");
    entries.forEach(([key, value]) => {
      const row = element("div", "lead-detail__detail-row");
      row.appendChild(element("span", "", humanize(key)));
      const display = typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
      row.appendChild(element("span", "", display));
      grid.appendChild(row);
    });
    sectionNode.appendChild(grid);
  }

  async function saveLeadStatus(lead, nextStatus, button, feedback) {
    if (!LEAD_STATUSES.includes(nextStatus) || nextStatus === lead.status) return;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Saving…";
    feedback.textContent = "Applying status…";

    try {
      const payload = await api("/api/admin/leads", {
        method: "PATCH",
        body: JSON.stringify({
          leadId: lead.id,
          status: nextStatus
        })
      });

      if (payload.changed) {
        lead.statusHistory = [
          {
            id: 0,
            leadId: lead.id,
            fromStatus: payload.previousStatus,
            toStatus: payload.status,
            actorEmail: payload.actor,
            createdAt: new Date().toISOString()
          },
          ...(Array.isArray(lead.statusHistory) ? lead.statusHistory : [])
        ];
      }

      lead.status = payload.status;
      lead.updatedAt = new Date().toISOString();
      renderMetrics();
      applyFilters();
      if (state.selectedId === lead.id) renderDetail(lead);
      setStatus(`Lead Core online · ${state.leads.length} loaded`);
    } catch (error) {
      console.error("Lead status update failed", error);
      feedback.textContent = error.message || "Could not update status.";
      feedback.classList.add("is-error");
      button.disabled = false;
      button.textContent = originalLabel;
      setStatus("Lead Core write failed", "error");
    }
  }

  function statusSection(lead) {
    const status = section("Pipeline status");
    const controls = element("div", "lead-status-control");
    const select = element("select", "lead-status-control__select");

    LEAD_STATUSES.forEach((value) => {
      const option = element("option", "", humanize(value));
      option.value = value;
      option.selected = value === lead.status;
      select.appendChild(option);
    });

    const button = element("button", "button lead-status-control__apply", "Apply status");
    button.type = "button";
    button.disabled = true;

    const feedback = element(
      "span",
      "lead-status-control__feedback",
      `Current: ${humanize(lead.status)}`
    );

    select.addEventListener("change", () => {
      const dirty = select.value !== lead.status;
      button.disabled = !dirty;
      feedback.classList.remove("is-error");
      feedback.textContent = dirty
        ? "Not applied yet."
        : `Current: ${humanize(lead.status)}`;
    });

    button.addEventListener("click", () => {
      saveLeadStatus(lead, select.value, button, feedback);
    });

    controls.append(select, button, feedback);
    status.appendChild(controls);
    return status;
  }

  function statusHistorySection(lead) {
    const history = section("Status history");
    const events = Array.isArray(lead.statusHistory) ? lead.statusHistory : [];

    if (!events.length) {
      history.appendChild(element(
        "p",
        "lead-status-history__empty",
        "No status changes recorded yet."
      ));
      return history;
    }

    const list = element("div", "lead-status-history");
    events.forEach((event) => {
      const item = element("div", "lead-status-history__item");
      const transition = element("div", "lead-status-history__transition");
      transition.append(
        makeStatus(event.fromStatus || "new"),
        element("span", "lead-status-history__arrow", "→"),
        makeStatus(event.toStatus || "new")
      );

      const meta = element("div", "lead-status-history__meta");
      meta.append(
        element("span", "", event.actorEmail || "Unknown actor"),
        element("time", "", formatTimestamp(event.createdAt))
      );

      item.append(transition, meta);
      list.appendChild(item);
    });

    history.appendChild(list);
    return history;
  }

  function renderDetail(lead) {
    if (!detail) return;
    detail.innerHTML = "";

    const header = element("div", "lead-detail__header");
    const headerTop = element("div", "lead-detail__header-top");
    const heading = element("div");
    heading.appendChild(element("span", "eyebrow", `Lead #${lead.id}`));
    heading.appendChild(element("h3", "", lead.name || `Lead #${lead.id}`));
    heading.appendChild(element("p", "", `${humanize(lead.source)} · ${humanize(lead.serviceCategory)}`));
    headerTop.append(heading, makeStatus(lead.status));
    header.appendChild(headerTop);
    detail.appendChild(header);

    detail.appendChild(statusSection(lead));
    detail.appendChild(statusHistorySection(lead));

    const contact = section("Contact");
    const contactGrid = element("div", "lead-detail__grid");
    contactGrid.append(
      field("Email", lead.email, lead.email ? `mailto:${lead.email}` : null),
      field("Preferred", humanize(lead.preferredContactChannel)),
      field("Phone", lead.contact?.phone, lead.contact?.phone ? `tel:${lead.contact.phone}` : null),
      field("WhatsApp", lead.contact?.whatsapp),
      field("Market", humanize(lead.market)),
      field("Language", String(lead.language || "—").toUpperCase())
    );
    contact.appendChild(contactGrid);
    detail.appendChild(contact);

    const project = section("Project");
    const projectGrid = element("div", "lead-detail__grid");
    projectGrid.append(
      field("Date", lead.project?.date),
      field("City", lead.project?.city),
      field("Venue", lead.project?.venue),
      field("Category", humanize(lead.serviceCategory))
    );
    project.appendChild(projectGrid);
    detail.appendChild(project);

    const summary = section("Message / summary");
    summary.appendChild(element("p", "lead-summary", lead.summary || "No message captured."));
    detail.appendChild(summary);

    const structured = section("Structured details");
    appendDetailObject(structured, lead.details);
    detail.appendChild(structured);

    const attribution = section("Attribution");
    const attributionGrid = element("div", "lead-detail__grid");
    attributionGrid.append(
      field("Source URL", lead.attribution?.sourceUrl, lead.attribution?.sourceUrl),
      field("Referrer", lead.attribution?.referrer, lead.attribution?.referrer),
      field("UTM source", lead.attribution?.utmSource),
      field("UTM medium", lead.attribution?.utmMedium),
      field("UTM campaign", lead.attribution?.utmCampaign),
      field("Updated", formatTimestamp(lead.updatedAt || lead.createdAt))
    );
    attribution.appendChild(attributionGrid);
    detail.appendChild(attribution);
  }

  function selectLead(id) {
    const lead = state.leads.find((item) => item.id === id);
    if (!lead) return;
    state.selectedId = lead.id;
    renderList();
    renderDetail(lead);
  }

  function applyFilters() {
    const visible = filteredLeads();
    if (state.selectedId && !visible.some((lead) => lead.id === state.selectedId)) {
      state.selectedId = null;
      if (detail) {
        detail.innerHTML = '<div class="lead-detail__empty"><span class="eyebrow">Lead detail</span><h3>Select an enquiry</h3><p>Choose a lead from the queue to inspect its data.</p></div>';
      }
    }
    renderList();
  }

  search?.addEventListener("input", applyFilters);
  sourceFilter?.addEventListener("change", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);

  async function load() {
    try {
      const [whoami, payload] = await Promise.all([
        api("/api/admin/whoami"),
        api("/api/admin/leads?limit=100")
      ]);

      if (identity) identity.textContent = whoami.email || payload.actor || "Authenticated";
      state.leads = Array.isArray(payload.leads) ? payload.leads : [];
      renderMetrics();
      renderList();
      setStatus(`Lead Core online · ${state.leads.length} loaded`);

      if (state.leads.length) {
        selectLead(state.leads[0].id);
      }
    } catch (error) {
      console.error("Lead workspace load failed", error);
      setStatus("Lead Core unavailable", "error");
      if (list) {
        list.innerHTML = "";
        list.appendChild(element("div", "leads-error", error.message || "Could not load leads."));
      }
      if (visibleCount) visibleCount.textContent = "Unavailable";
    }
  }

  load();
})();
