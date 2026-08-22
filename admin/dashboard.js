(() => {
  const shell = document.querySelector(".backoffice");
  const collapse = document.getElementById("collapseSidebar");
  const identity = document.getElementById("identity");
  const d1Status = document.getElementById("d1Status");
  const d1Detail = document.getElementById("d1Detail");
  const heroState = document.getElementById("heroState");
  const heroDetail = document.getElementById("heroDetail");
  const lastPublish = document.getElementById("lastPublish");
  const revisionCount = document.getElementById("revisionCount");
  const activity = document.getElementById("activity");
  const systemPill = document.getElementById("systemPill");

  const collapsed = localStorage.getItem("sdlive-admin-dashboard-collapsed") === "true";
  shell.classList.toggle("is-collapsed", collapsed);

  collapse?.addEventListener("click", () => {
    const next = !shell.classList.contains("is-collapsed");
    shell.classList.toggle("is-collapsed", next);
    localStorage.setItem("sdlive-admin-dashboard-collapsed", String(next));
    collapse.textContent = next ? "Expand" : "Collapse";
  });

  if (collapsed && collapse) collapse.textContent = "Expand";

  async function api(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store"
    });

    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      throw new Error("Unexpected response");
    }

    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function formatTimestamp(value) {
    if (!value) return "Not published yet";
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formatMoney(currency, value) {
    const amount = Number(value || 0);
    const isCop = currency === "COP";
    return new Intl.NumberFormat(isCop ? "es-CO" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: isCop ? 0 : 2,
      minimumFractionDigits: isCop ? 0 : 2
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  function ensureFinanceSection() {
    const existing = document.getElementById("financeOverview");
    if (existing) return existing;

    if (!document.querySelector('link[data-finance-dashboard-styles]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "./finance-dashboard.css";
      stylesheet.dataset.financeDashboardStyles = "true";
      document.head.appendChild(stylesheet);
    }

    const section = document.createElement("section");
    section.className = "section finance-overview";
    section.id = "financeOverview";
    section.innerHTML = `
      <div class="finance-heading">
        <div>
          <span class="eyebrow">SD.Live Track · Read-only</span>
          <h3>Finance overview</h3>
          <p>Live operational summary from the private Google Sheet. AppSheet remains the capture and workflow surface.</p>
        </div>
        <div class="finance-source" id="financeSource"><i></i><span>Connecting to SD.Live Track…</span></div>
      </div>

      <div class="finance-metrics">
        <article class="finance-card">
          <span class="finance-card__label">To invoice</span>
          <strong id="financeToInvoiceCount">—</strong>
          <div class="finance-money" id="financeToInvoiceMoney">Loading…</div>
          <small>Estado: Pendiente Envio</small>
        </article>
        <article class="finance-card finance-card--accent">
          <span class="finance-card__label">Collectible now</span>
          <strong id="financeReceivableCount">—</strong>
          <div class="finance-money" id="financeReceivableMoney">Loading…</div>
          <small>Invoice sent and workflow complete</small>
        </article>
        <article class="finance-card finance-card--warning">
          <span class="finance-card__label">Workflow blocked</span>
          <strong id="financeBlockedCount">—</strong>
          <div class="finance-money" id="financeBlockedMoney">Loading…</div>
          <small>Not included in collectible totals</small>
        </article>
        <article class="finance-card">
          <span class="finance-card__label">Received</span>
          <strong id="financePaidCount">—</strong>
          <div class="finance-money" id="financeReceivedMoney">Loading…</div>
          <small id="financeFees">Recorded fees: —</small>
        </article>
      </div>

      <div class="finance-detail-grid">
        <article class="finance-panel">
          <div class="finance-panel__head">
            <div>
              <span class="eyebrow">Accounts receivable</span>
              <h4>Aging</h4>
            </div>
            <span class="finance-records" id="financeRecordCount">— records</span>
          </div>
          <div class="finance-aging" id="financeAging">
            <div class="finance-empty">Loading aging…</div>
          </div>
        </article>

        <article class="finance-panel finance-panel--priority">
          <div class="finance-panel__head">
            <div>
              <span class="eyebrow">Collection queue</span>
              <h4>Priority</h4>
            </div>
            <span class="finance-records">Oldest first</span>
          </div>
          <div class="finance-priority" id="financePriority">
            <div class="finance-empty">Loading collection queue…</div>
          </div>
        </article>
      </div>
    `;

    const metrics = document.querySelector(".metrics");
    if (metrics) metrics.insertAdjacentElement("afterend", section);
    else document.querySelector(".content")?.prepend(section);
    return section;
  }

  function moneyPair(totals = {}) {
    return `${formatMoney("COP", totals.COP)} · ${formatMoney("USD", totals.USD)}`;
  }

  function renderAging(entries = []) {
    const root = document.getElementById("financeAging");
    if (!root) return;
    root.innerHTML = "";

    if (!entries.length) {
      root.innerHTML = '<div class="finance-empty">No collectible balances right now.</div>';
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "finance-aging-row";

      const main = document.createElement("div");
      const bucket = document.createElement("strong");
      bucket.textContent = entry.bucket || "Sin rango";
      const count = document.createElement("span");
      count.textContent = `${entry.count || 0} account${entry.count === 1 ? "" : "s"}`;
      main.append(bucket, count);

      const amounts = document.createElement("div");
      amounts.className = "finance-aging-money";
      amounts.textContent = moneyPair(entry.byCurrency || {});

      item.append(main, amounts);
      root.appendChild(item);
    });
  }

  function renderPriority(rows = []) {
    const root = document.getElementById("financePriority");
    if (!root) return;
    root.innerHTML = "";

    if (!rows.length) {
      root.innerHTML = '<div class="finance-empty">Nothing is ready for collection.</div>';
      return;
    }

    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "finance-priority-row";

      const identity = document.createElement("div");
      identity.className = "finance-priority-main";
      const client = document.createElement("strong");
      client.textContent = row.client || "Client";
      const project = document.createElement("span");
      project.textContent = row.project || "No project name";
      identity.append(client, project);

      const age = document.createElement("div");
      age.className = "finance-priority-age";
      const days = document.createElement("strong");
      days.textContent = Number.isFinite(Number(row.daysUnpaid))
        ? `${Number(row.daysUnpaid)}d`
        : "—";
      const bucket = document.createElement("span");
      bucket.textContent = row.aging || "";
      age.append(days, bucket);

      const amount = document.createElement("div");
      amount.className = "finance-priority-money";
      amount.textContent = row.currency === "USD"
        ? formatMoney("USD", row.netAmount)
        : formatMoney("COP", row.netAmount);

      item.append(identity, age, amount);
      root.appendChild(item);
    });
  }

  async function loadFinance() {
    ensureFinanceSection();
    const source = document.getElementById("financeSource");

    try {
      const data = await api("/api/admin/finance/summary");
      const summary = data.summary || {};
      const receivables = summary.receivables || {};
      const received = summary.received || {};

      document.getElementById("financeToInvoiceCount").textContent = String(summary.toInvoice?.count || 0);
      document.getElementById("financeToInvoiceMoney").textContent = moneyPair(summary.toInvoice?.grossByCurrency);
      document.getElementById("financeReceivableCount").textContent = String(receivables.count || 0);
      document.getElementById("financeReceivableMoney").textContent = moneyPair(receivables.netByCurrency);
      document.getElementById("financeBlockedCount").textContent = String(receivables.workflowBlockedCount || 0);
      document.getElementById("financeBlockedMoney").textContent = moneyPair(receivables.workflowBlockedNetByCurrency);
      document.getElementById("financePaidCount").textContent = String(received.paidCount || 0);
      document.getElementById("financeReceivedMoney").textContent = moneyPair(received.amountByCurrency);
      document.getElementById("financeFees").textContent = `Recorded fees: ${moneyPair(received.feesByCurrency)}`;
      document.getElementById("financeRecordCount").textContent = `${summary.recordCount || 0} records`;

      renderAging(receivables.aging || []);
      renderPriority(receivables.priority || []);

      source?.classList.remove("is-error");
      if (source?.querySelector("span")) {
        source.querySelector("span").textContent = `Live · ${summary.recordCount || 0} records · Google Sheets`;
      }
    } catch (error) {
      source?.classList.add("is-error");
      if (source?.querySelector("span")) source.querySelector("span").textContent = "Finance source unavailable";

      [
        "financeToInvoiceCount",
        "financeReceivableCount",
        "financeBlockedCount",
        "financePaidCount"
      ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = "Check";
      });

      [
        "financeToInvoiceMoney",
        "financeReceivableMoney",
        "financeBlockedMoney",
        "financeReceivedMoney"
      ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = error.message;
      });

      const aging = document.getElementById("financeAging");
      const priority = document.getElementById("financePriority");
      if (aging) aging.innerHTML = '<div class="finance-empty">Could not load finance data.</div>';
      if (priority) priority.innerHTML = '<div class="finance-empty">Could not load collection queue.</div>';
    }
  }

  async function load() {
    try {
      const [health, whoami, hero, revisions] = await Promise.all([
        api("/api/health"),
        api("/api/admin/whoami"),
        api("/api/admin/content/hero"),
        api("/api/admin/content/hero/revisions")
      ]);

      identity.textContent = whoami.email || "Authenticated";

      d1Status.textContent = health.ok ? "Online" : "Issue";
      d1Detail.textContent = health.database || "D1";

      const hasDraft = Boolean(hero.entry?.hasUnpublishedChanges);
      heroState.textContent = hasDraft ? "Draft pending" : "Published";
      heroDetail.textContent = hasDraft
        ? "Draft differs from Published"
        : "Draft and Published are in sync";

      lastPublish.textContent = hero.entry?.publishedAt
        ? formatTimestamp(hero.entry.publishedAt)
        : "Not yet";
      revisionCount.textContent = String(revisions.revisions?.length || 0);

      systemPill.querySelector("span").textContent = hasDraft
        ? "CMS online · draft pending"
        : "CMS online · synced";
      systemPill.classList.toggle("is-warning", hasDraft);

      const rows = revisions.revisions || [];
      if (!rows.length) {
        activity.innerHTML = '<div class="activity-empty">No revisions yet.</div>';
      } else {
        activity.innerHTML = "";
        rows.slice(0, 8).forEach((row) => {
          const item = document.createElement("div");
          item.className = "activity-row";

          const type = document.createElement("span");
          type.className = "activity-type";
          type.textContent = row.revision_type || "change";

          const meta = document.createElement("span");
          meta.className = "activity-meta";
          meta.textContent = row.actor_email || "SD.Live Admin";

          const time = document.createElement("span");
          time.className = "activity-time";
          time.textContent = formatTimestamp(row.created_at);

          item.append(type, meta, time);
          activity.appendChild(item);
        });
      }
    } catch (error) {
      d1Status.textContent = "Check";
      d1Detail.textContent = error.message;
      heroState.textContent = "Unavailable";
      heroDetail.textContent = "Could not read CMS";
      systemPill.classList.add("is-error");
      systemPill.querySelector("span").textContent = "Admin API check failed";
      activity.innerHTML = '<div class="activity-empty">Could not load CMS activity.</div>';
    }
  }

  load();
  loadFinance();
})();
