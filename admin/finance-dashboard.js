(() => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const state = {
    payload: null,
    selectedYear: null
  };

  function ensureStylesheet(href, marker) {
    if (document.querySelector(`link[data-${marker}]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[marker] = "true";
    document.head.appendChild(link);
  }

  function ensureStyles() {
    ensureStylesheet("./finance-dashboard.css", "financeDashboardStyles");
    ensureStylesheet("./mobile-dashboard.css", "mobileDashboardStyles");
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("Unexpected response");
    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    }
    return data;
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

  function compactMoney(currency, value) {
    const amount = Number(value || 0);
    const formatted = new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(Number.isFinite(amount) ? amount : 0);
    return `${currency} ${formatted}`;
  }

  function moneyPair(totals = {}) {
    return `COP ${formatMoney("COP", totals.COP)} · USD ${formatMoney("USD", totals.USD)}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function ensureSection() {
    const existing = document.getElementById("financeOverview");
    if (existing) return existing;

    const section = document.createElement("section");
    section.className = "section finance-overview";
    section.id = "financeOverview";
    section.innerHTML = `
      <div class="finance-heading">
        <div>
          <span class="eyebrow">SD.Live Track · Finance</span>
          <h3>Finance dashboard</h3>
          <p>Cash, production, clients, receivables and collection performance from the private read-only finance source.</p>
        </div>
        <div class="finance-heading__actions">
          <label class="finance-year-control">
            <span>Year</span>
            <select id="financeYear"></select>
          </label>
          <div class="finance-source" id="financeSource"><i></i><span>Connecting to SD.Live Track…</span></div>
        </div>
      </div>

      <div class="finance-metrics">
        <article class="finance-card">
          <span class="finance-card__label">To invoice</span>
          <strong id="financeToInvoiceCount">—</strong>
          <div class="finance-money" id="financeToInvoiceMoney">Loading…</div>
          <small>Work not yet put into collection</small>
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
          <small>Outstanding but not ready for collection</small>
        </article>
        <article class="finance-card">
          <span class="finance-card__label">Received all-time</span>
          <strong id="financePaidCount">—</strong>
          <div class="finance-money" id="financeReceivedMoney">Loading…</div>
          <small id="financeFees">Recorded fees: —</small>
        </article>
      </div>

      <div class="finance-section-title">
        <div>
          <span class="eyebrow">Cash received</span>
          <h4>Monthly performance</h4>
        </div>
        <span class="finance-period-label" id="financePeriodLabel">—</span>
      </div>

      <div class="finance-currency-grid">
        <article class="finance-panel finance-currency-panel">
          <div class="finance-panel__head">
            <div><span class="finance-currency-tag">COP</span><h4>Received in COP</h4></div>
          </div>
          <div class="finance-mini-metrics">
            <div><span>Total</span><strong id="financeCopTotal">—</strong></div>
            <div><span>Best month</span><strong id="financeCopBest">—</strong><small id="financeCopBestMonth">—</small></div>
            <div><span>Monthly avg</span><strong id="financeCopAverage">—</strong><small id="financeCopAverageBasis">—</small></div>
          </div>
          <div class="finance-chart" id="financeCopMonthlyChart" aria-label="Monthly COP received chart"></div>
        </article>

        <article class="finance-panel finance-currency-panel">
          <div class="finance-panel__head">
            <div><span class="finance-currency-tag">USD</span><h4>Received in USD</h4></div>
          </div>
          <div class="finance-mini-metrics">
            <div><span>Total</span><strong id="financeUsdTotal">—</strong></div>
            <div><span>Best month</span><strong id="financeUsdBest">—</strong><small id="financeUsdBestMonth">—</small></div>
            <div><span>Monthly avg</span><strong id="financeUsdAverage">—</strong><small id="financeUsdAverageBasis">—</small></div>
          </div>
          <div class="finance-chart" id="financeUsdMonthlyChart" aria-label="Monthly USD received chart"></div>
        </article>
      </div>

      <div class="finance-section-title">
        <div>
          <span class="eyebrow">Production vs cash</span>
          <h4>Generated vs received</h4>
        </div>
        <span class="finance-section-note">Net work by work date vs cash by payment date</span>
      </div>

      <div class="finance-currency-grid">
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">COP</span><h4>Generated vs received</h4></div></div>
          <div class="finance-chart finance-chart--large" id="financeCopGeneratedChart"></div>
        </article>
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">USD</span><h4>Generated vs received</h4></div></div>
          <div class="finance-chart finance-chart--large" id="financeUsdGeneratedChart"></div>
        </article>
      </div>

      <div class="finance-section-title">
        <div><span class="eyebrow">Clients</span><h4>Revenue concentration</h4></div>
        <span class="finance-section-note">Based on cash received</span>
      </div>

      <div class="finance-currency-grid">
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">COP</span><h4>Top clients</h4></div><span class="finance-records" id="financeCopConcentration">—</span></div>
          <div class="finance-bars" id="financeTopClientsCop"></div>
        </article>
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">USD</span><h4>Top clients</h4></div><span class="finance-records" id="financeUsdConcentration">—</span></div>
          <div class="finance-bars" id="financeTopClientsUsd"></div>
        </article>
      </div>

      <div class="finance-section-title">
        <div><span class="eyebrow">Accounts receivable</span><h4>Unpaid aging</h4></div>
        <span class="finance-section-note">Current outstanding net balances</span>
      </div>

      <div class="finance-currency-grid">
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">COP</span><h4>Unpaid COP</h4></div></div>
          <div class="finance-aging-chart" id="financeAgingCop"></div>
          <div class="finance-subsection"><span>Top debtors</span><div id="financeDebtorsCop" class="finance-debtors"></div></div>
        </article>
        <article class="finance-panel">
          <div class="finance-panel__head"><div><span class="finance-currency-tag">USD</span><h4>Unpaid USD</h4></div></div>
          <div class="finance-aging-chart" id="financeAgingUsd"></div>
          <div class="finance-subsection"><span>Top debtors</span><div id="financeDebtorsUsd" class="finance-debtors"></div></div>
        </article>
      </div>

      <div class="finance-section-title">
        <div><span class="eyebrow">Collection performance</span><h4>How efficiently cash arrives</h4></div>
        <span class="finance-section-note">Paid invoices in the selected year</span>
      </div>

      <div class="finance-currency-grid">
        <article class="finance-panel finance-performance" id="financePerformanceCop"></article>
        <article class="finance-panel finance-performance" id="financePerformanceUsd"></article>
      </div>

      <div class="finance-section-title">
        <div><span class="eyebrow">Planning</span><h4>Tax reserve</h4></div>
        <span class="finance-section-note">Management reserve only · not taxes owed</span>
      </div>

      <article class="finance-panel finance-tax-panel">
        <div class="finance-tax-summary" id="financeTaxSummary"></div>
        <form class="finance-tax-settings" id="financeTaxForm">
          <label class="finance-toggle-row">
            <input type="checkbox" id="financeTaxEnabled" />
            <span><strong>Enable tax reserve</strong><small>Calculate a planning reserve from cash received.</small></span>
          </label>
          <label><span>COP reserve %</span><input id="financeTaxCopRate" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="e.g. 25" /></label>
          <label><span>USD reserve %</span><input id="financeTaxUsdRate" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="e.g. 20" /></label>
          <label><span>Apply from</span><input id="financeTaxApplyFrom" type="date" /></label>
          <div class="finance-tax-actions"><button type="submit">Save reserve settings</button><span id="financeTaxStatus"></span></div>
        </form>
      </article>

      <div class="finance-detail-grid finance-detail-grid--bottom">
        <article class="finance-panel finance-panel--priority">
          <div class="finance-panel__head">
            <div><span class="eyebrow">Collection queue</span><h4>Priority</h4></div>
            <span class="finance-records">Oldest collectible first</span>
          </div>
          <div class="finance-priority" id="financePriority"><div class="finance-empty">Loading collection queue…</div></div>
        </article>
        <article class="finance-panel">
          <div class="finance-panel__head">
            <div><span class="eyebrow">Controls</span><h4>Data quality</h4></div>
            <span class="finance-records" id="financeRecordCount">— records</span>
          </div>
          <div class="finance-quality" id="financeQuality"></div>
        </article>
      </div>
    `;

    const metrics = document.querySelector(".metrics");
    if (metrics) metrics.insertAdjacentElement("afterend", section);
    else document.querySelector(".content")?.prepend(section);
    return section;
  }

  function createSvgElement(name, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  }

  function renderLineChart(rootId, datasets, currency, description) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = "";

    const width = 720;
    const height = 230;
    const left = 54;
    const right = 18;
    const top = 20;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const allValues = datasets.flatMap((dataset) => dataset.values.map((value) => Number(value || 0)));
    const maxValue = Math.max(1, ...allValues);

    const legend = document.createElement("div");
    legend.className = "finance-chart-legend";
    datasets.forEach((dataset, index) => {
      const item = document.createElement("span");
      item.className = `finance-chart-legend__item finance-chart-legend__item--${index}`;
      item.textContent = dataset.label;
      legend.appendChild(item);
    });
    root.appendChild(legend);

    const svg = createSvgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": description
    });

    for (let line = 0; line <= 4; line += 1) {
      const ratio = line / 4;
      const y = top + plotHeight * ratio;
      svg.appendChild(createSvgElement("line", {
        x1: left,
        x2: width - right,
        y1: y,
        y2: y,
        class: "finance-chart-grid"
      }));
      const value = maxValue * (1 - ratio);
      const label = createSvgElement("text", {
        x: left - 8,
        y: y + 4,
        "text-anchor": "end",
        class: "finance-chart-axis"
      });
      label.textContent = compactMoney(currency, value).replace(`${currency} `, "");
      svg.appendChild(label);
    }

    MONTHS.forEach((month, index) => {
      const x = left + (plotWidth * index) / 11;
      const label = createSvgElement("text", {
        x,
        y: height - 14,
        "text-anchor": "middle",
        class: "finance-chart-axis finance-chart-axis--month"
      });
      label.textContent = month;
      svg.appendChild(label);
    });

    datasets.forEach((dataset, datasetIndex) => {
      const points = dataset.values.map((rawValue, index) => {
        const value = Number(rawValue || 0);
        const x = left + (plotWidth * index) / 11;
        const y = top + plotHeight - (value / maxValue) * plotHeight;
        return { x, y, value };
      });

      const path = createSvgElement("path", {
        d: points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
        class: `finance-chart-line finance-chart-line--${datasetIndex}`
      });
      svg.appendChild(path);

      points.forEach((point, index) => {
        const circle = createSvgElement("circle", {
          cx: point.x,
          cy: point.y,
          r: 3.5,
          class: `finance-chart-point finance-chart-point--${datasetIndex}`
        });
        const title = createSvgElement("title");
        title.textContent = `${MONTHS[index]} · ${dataset.label}: ${formatMoney(currency, point.value)}`;
        circle.appendChild(title);
        svg.appendChild(circle);
      });
    });

    root.appendChild(svg);
  }

  function renderTopClients(rootId, rows, currency) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = "";
    if (!rows?.length) {
      root.innerHTML = '<div class="finance-empty">No received revenue in this currency for the selected year.</div>';
      return;
    }
    const max = Math.max(...rows.map((row) => Number(row.amount || 0)), 1);
    rows.forEach((row, index) => {
      const item = document.createElement("div");
      item.className = "finance-bar-row";
      const top = document.createElement("div");
      top.className = "finance-bar-row__top";
      const client = document.createElement("span");
      client.textContent = `${index + 1}. ${row.client}`;
      const amount = document.createElement("strong");
      amount.textContent = `${formatMoney(currency, row.amount)} · ${row.sharePercent}%`;
      top.append(client, amount);
      const track = document.createElement("div");
      track.className = "finance-bar-track";
      const fill = document.createElement("i");
      fill.style.width = `${Math.max(2, (Number(row.amount || 0) / max) * 100)}%`;
      track.appendChild(fill);
      item.append(top, track);
      root.appendChild(item);
    });
  }

  function renderAging(rootId, rows, currency) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = "";
    const max = Math.max(...(rows || []).map((row) => Number(row.amount || 0)), 1);
    (rows || []).forEach((row) => {
      const item = document.createElement("div");
      item.className = "finance-aging-bar";
      const meta = document.createElement("div");
      meta.className = "finance-aging-bar__meta";
      const label = document.createElement("span");
      label.textContent = row.label;
      const amount = document.createElement("strong");
      amount.textContent = formatMoney(currency, row.amount);
      meta.append(label, amount);

      const track = document.createElement("div");
      track.className = "finance-bar-track finance-bar-track--aging";
      const fill = document.createElement("i");
      fill.style.width = `${Number(row.amount || 0) > 0 ? Math.max(2, (Number(row.amount || 0) / max) * 100) : 0}%`;
      track.appendChild(fill);

      const detail = document.createElement("small");
      const blocked = Number(row.workflowBlockedCount || 0);
      detail.textContent = `${row.count || 0} account${row.count === 1 ? "" : "s"}${blocked ? ` · ${blocked} workflow blocked (${formatMoney(currency, row.workflowBlockedAmount)})` : ""}`;
      item.append(meta, track, detail);
      root.appendChild(item);
    });
  }

  function renderDebtors(rootId, rows, currency) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = "";
    if (!rows?.length) {
      root.innerHTML = '<div class="finance-empty finance-empty--compact">No outstanding balances.</div>';
      return;
    }
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "finance-debtor-row";
      const name = document.createElement("span");
      name.textContent = row.client;
      const meta = document.createElement("small");
      meta.textContent = `${row.count} account${row.count === 1 ? "" : "s"} · oldest ${row.maxDays || 0}d`;
      const amount = document.createElement("strong");
      amount.textContent = formatMoney(currency, row.amount);
      const identity = document.createElement("div");
      identity.append(name, meta);
      item.append(identity, amount);
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
      days.textContent = Number.isFinite(Number(row.daysUnpaid)) ? `${Number(row.daysUnpaid)}d` : "—";
      const bucket = document.createElement("span");
      bucket.textContent = row.aging || "";
      age.append(days, bucket);
      const amount = document.createElement("div");
      amount.className = "finance-priority-money";
      amount.textContent = formatMoney(row.currency === "USD" ? "USD" : "COP", row.netAmount);
      item.append(identity, age, amount);
      root.appendChild(item);
    });
  }

  function renderPerformance(rootId, currency, yearData) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = "";
    const payment = yearData.paymentPerformance?.[currency] || {};
    const fees = yearData.fees?.[currency] || {};
    const concentration = yearData.clientConcentration?.[currency] || {};

    const head = document.createElement("div");
    head.className = "finance-panel__head";
    head.innerHTML = `<div><span class="finance-currency-tag">${currency}</span><h4>Collection & fees</h4></div>`;

    const metrics = document.createElement("div");
    metrics.className = "finance-performance-grid";
    const values = [
      ["Average to pay", payment.averageDays === null || payment.averageDays === undefined ? "—" : `${payment.averageDays} days`],
      ["Median to pay", payment.medianDays === null || payment.medianDays === undefined ? "—" : `${payment.medianDays} days`],
      ["Top 3 concentration", `${concentration.top3SharePercent || 0}%`],
      ["Recorded fees", formatMoney(currency, fees.total || 0)],
      ["Effective fee rate", `${fees.effectiveRatePercent || 0}%`],
      ["Paid sample", `${payment.sampleSize || 0} payments`]
    ];
    values.forEach(([label, value]) => {
      const metric = document.createElement("div");
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      metric.append(span, strong);
      metrics.appendChild(metric);
    });

    const slow = document.createElement("div");
    slow.className = "finance-subsection finance-slowest";
    const label = document.createElement("span");
    label.textContent = "Slowest-paying clients";
    slow.appendChild(label);
    if (!payment.slowestClients?.length) {
      const empty = document.createElement("div");
      empty.className = "finance-empty finance-empty--compact";
      empty.textContent = "Not enough payment history yet.";
      slow.appendChild(empty);
    } else {
      payment.slowestClients.slice(0, 3).forEach((row) => {
        const item = document.createElement("div");
        item.className = "finance-slow-row";
        const name = document.createElement("span");
        name.textContent = row.client;
        const value = document.createElement("strong");
        value.textContent = `${row.averageDays}d avg · ${row.payments} payment${row.payments === 1 ? "" : "s"}`;
        item.append(name, value);
        slow.appendChild(item);
      });
    }

    root.append(head, metrics, slow);
  }

  function renderQuality(summary, analytics) {
    const root = document.getElementById("financeQuality");
    if (!root) return;
    root.innerHTML = "";
    const checks = [
      ["Paid rows missing received amount", summary.received?.missingReceivedAmountCount || 0],
      ["Unsupported currencies", summary.dataQuality?.unsupportedCurrencyCount || 0],
      ["Unpaid rows missing aging", analytics.dataQuality?.unpaidMissingAgingCount || 0],
      ["Paid rows missing payment date", analytics.dataQuality?.paidMissingPaymentDateCount || 0],
      ["Invalid payment durations", analytics.dataQuality?.invalidPaymentDurationCount || 0]
    ];
    checks.forEach(([label, count]) => {
      const item = document.createElement("div");
      item.className = `finance-quality-row ${count ? "is-warning" : "is-ok"}`;
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("strong");
      value.textContent = String(count);
      item.append(name, value);
      root.appendChild(item);
    });
  }

  function syncTaxForm(settings) {
    const reserve = settings?.taxReserve || {};
    const enabled = document.getElementById("financeTaxEnabled");
    const cop = document.getElementById("financeTaxCopRate");
    const usd = document.getElementById("financeTaxUsdRate");
    const applyFrom = document.getElementById("financeTaxApplyFrom");
    if (enabled) enabled.checked = Boolean(reserve.enabled);
    if (cop) cop.value = reserve.rates?.COP ?? "";
    if (usd) usd.value = reserve.rates?.USD ?? "";
    if (applyFrom) applyFrom.value = reserve.applyFrom || "";
  }

  function renderTaxReserve(yearData, currencyYear) {
    const root = document.getElementById("financeTaxSummary");
    if (!root) return;
    root.innerHTML = "";
    const reserve = yearData?.taxReserve || {};

    ["COP", "USD"].forEach((currency) => {
      const card = document.createElement("div");
      card.className = "finance-tax-card";
      const tag = document.createElement("span");
      tag.className = "finance-currency-tag";
      tag.textContent = currency;
      const data = reserve[currency];
      const totalReceived = currencyYear?.[currency]?.total || 0;
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      if (!reserve.enabled || !data) {
        title.textContent = "Not configured";
        detail.textContent = `Received ${formatMoney(currency, totalReceived)} · set a reserve rate when ready.`;
      } else {
        title.textContent = formatMoney(currency, data.reserveTotal);
        detail.textContent = `${data.ratePercent}% reserve · after reserve ${formatMoney(currency, data.afterReserve)}`;
      }
      card.append(tag, title, detail);
      root.appendChild(card);
    });
  }

  function renderYear(year) {
    if (!state.payload) return;
    const analytics = state.payload.analytics || {};
    const yearData = analytics.byYear?.[String(year)];
    if (!yearData) return;
    state.selectedYear = year;
    setText("financePeriodLabel", `${year} · YTD through ${MONTHS[(yearData.received?.COP?.averageMonthCount || 1) - 1] || "year end"}`);

    const pairs = [
      ["COP", "financeCopTotal", "financeCopBest", "financeCopBestMonth", "financeCopAverage", "financeCopAverageBasis", "financeCopMonthlyChart", "financeCopGeneratedChart"],
      ["USD", "financeUsdTotal", "financeUsdBest", "financeUsdBestMonth", "financeUsdAverage", "financeUsdAverageBasis", "financeUsdMonthlyChart", "financeUsdGeneratedChart"]
    ];

    pairs.forEach(([currency, totalId, bestId, bestMonthId, averageId, averageBasisId, monthlyChartId, generatedChartId]) => {
      const received = yearData.received[currency];
      setText(totalId, formatMoney(currency, received.total));
      setText(bestId, formatMoney(currency, received.bestMonth?.amount || 0));
      setText(bestMonthId, received.bestMonth ? MONTHS[received.bestMonth.month - 1] : "No payments yet");
      setText(averageId, formatMoney(currency, received.averageMonthly));
      setText(averageBasisId, `${received.averageMonthCount} month${received.averageMonthCount === 1 ? "" : "s"} including zero months`);
      renderLineChart(
        monthlyChartId,
        [{ label: "Received", values: received.monthly.map((entry) => entry.amount) }],
        currency,
        `${currency} cash received by month in ${year}`
      );
      const comparison = yearData.generatedVsReceived[currency] || [];
      renderLineChart(
        generatedChartId,
        [
          { label: "Generated", values: comparison.map((entry) => entry.generated) },
          { label: "Received", values: comparison.map((entry) => entry.received) }
        ],
        currency,
        `${currency} generated versus received in ${year}`
      );
    });

    renderTopClients("financeTopClientsCop", yearData.topClients.COP, "COP");
    renderTopClients("financeTopClientsUsd", yearData.topClients.USD, "USD");
    setText("financeCopConcentration", `Top 3 · ${yearData.clientConcentration.COP.top3SharePercent}%`);
    setText("financeUsdConcentration", `Top 3 · ${yearData.clientConcentration.USD.top3SharePercent}%`);
    renderPerformance("financePerformanceCop", "COP", yearData);
    renderPerformance("financePerformanceUsd", "USD", yearData);
    renderTaxReserve(yearData, yearData.received);
  }

  function renderPayload(data) {
    state.payload = data;
    const summary = data.summary || {};
    const analytics = data.analytics || {};
    const receivables = summary.receivables || {};
    const received = summary.received || {};

    setText("financeToInvoiceCount", String(summary.toInvoice?.count || 0));
    setText("financeToInvoiceMoney", moneyPair(summary.toInvoice?.grossByCurrency));
    setText("financeReceivableCount", String(receivables.count || 0));
    setText("financeReceivableMoney", moneyPair(receivables.netByCurrency));
    setText("financeBlockedCount", String(receivables.workflowBlockedCount || 0));
    setText("financeBlockedMoney", moneyPair(receivables.workflowBlockedNetByCurrency));
    setText("financePaidCount", String(received.paidCount || 0));
    setText("financeReceivedMoney", moneyPair(received.amountByCurrency));
    setText("financeFees", `Recorded fees: ${moneyPair(received.feesByCurrency)}`);
    setText("financeRecordCount", `${summary.recordCount || 0} records`);

    renderPriority(receivables.priority || []);
    renderAging("financeAgingCop", analytics.receivables?.aging?.COP || [], "COP");
    renderAging("financeAgingUsd", analytics.receivables?.aging?.USD || [], "USD");
    renderDebtors("financeDebtorsCop", analytics.receivables?.topDebtors?.COP || [], "COP");
    renderDebtors("financeDebtorsUsd", analytics.receivables?.topDebtors?.USD || [], "USD");
    renderQuality(summary, analytics);
    syncTaxForm(data.settings);

    const select = document.getElementById("financeYear");
    if (select) {
      select.innerHTML = "";
      (analytics.years || []).forEach((year) => {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        select.appendChild(option);
      });
      const preferred = state.selectedYear && analytics.years?.includes(state.selectedYear)
        ? state.selectedYear
        : analytics.defaultYear;
      select.value = String(preferred);
      renderYear(preferred);
    }

    const source = document.getElementById("financeSource");
    source?.classList.remove("is-error");
    if (source?.querySelector("span")) {
      source.querySelector("span").textContent = `Live · ${summary.recordCount || 0} records · Google Sheets`;
    }
  }

  function bindControls() {
    const select = document.getElementById("financeYear");
    select?.addEventListener("change", () => renderYear(Number(select.value)));

    const form = document.getElementById("financeTaxForm");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.getElementById("financeTaxStatus");
      const button = form.querySelector("button[type='submit']");
      const rawCop = document.getElementById("financeTaxCopRate")?.value ?? "";
      const rawUsd = document.getElementById("financeTaxUsdRate")?.value ?? "";
      const payload = {
        taxReserve: {
          enabled: Boolean(document.getElementById("financeTaxEnabled")?.checked),
          rates: {
            COP: rawCop === "" ? null : Number(rawCop),
            USD: rawUsd === "" ? null : Number(rawUsd)
          },
          applyFrom: document.getElementById("financeTaxApplyFrom")?.value || null
        }
      };

      try {
        if (button) button.disabled = true;
        if (status) status.textContent = "Saving…";
        await api("/api/admin/finance/settings", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        if (status) status.textContent = "Saved";
        const refreshed = await api("/api/admin/finance/dashboard");
        renderPayload(refreshed);
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  async function load() {
    ensureStyles();
    ensureSection();
    bindControls();
    const source = document.getElementById("financeSource");

    try {
      const data = await api("/api/admin/finance/dashboard");
      renderPayload(data);
    } catch (error) {
      source?.classList.add("is-error");
      if (source?.querySelector("span")) source.querySelector("span").textContent = "Finance source unavailable";
      ["financeToInvoiceCount", "financeReceivableCount", "financeBlockedCount", "financePaidCount"].forEach((id) => setText(id, "Check"));
      ["financeToInvoiceMoney", "financeReceivableMoney", "financeBlockedMoney", "financeReceivedMoney"].forEach((id) => setText(id, error.message));
      const priority = document.getElementById("financePriority");
      if (priority) priority.innerHTML = '<div class="finance-empty">Could not load finance data.</div>';
    }
  }

  window.SDLiveFinanceDashboard = { load };
})();
