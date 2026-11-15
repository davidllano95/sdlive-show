(() => {
  if (window.SDLiveFinanceIncomeReports) return;
  const COPY = {
    es: {
      title: "Reporte de ingresos", intro: "Genera un informe de solo lectura desde SD.Live Track (Google Sheets). Las cifras en COP y USD no se suman ni convierten.",
      basis: "Criterio", work: "Por fecha de trabajo", payment: "Por fecha de pago",
      start: "Desde", end: "Hasta", currency: "Moneda", client: "Cliente (opcional)", all: "Todas",
      generate: "Generar reporte", csv: "Descargar CSV completo",
      idle: "Selecciona un período y genera el informe. No modifica ningún registro.",
      loading: "Consultando Finance…", ready: "Reporte actualizado", empty: "Sin registros para este período.",
      owner: "Ingreso propio", bank: "Recibido en banco", gross: "Bruto facturado / registrado",
      third: "Bruto de terceros", rows: "Registros", quality: "Registros a revisar",
      warning: "Importes ausentes o distribuciones inválidas no se incluyen en el total de ingreso propio.",
      month: "Desglose mensual", clients: "Ingresos por cliente", detail: "Detalle de registros",
      noteWork: "Por fecha de trabajo: ingreso propio bruto registrado. Los importes recibidos asociados pueden corresponder a pagos de otros períodos.",
      notePayment: "Por fecha de pago: dinero propio recibido después de asignar proporcionalmente los cobros de terceros. Solo trabajos con Estado «Pagado».",
      caution: "Informe de gestión para revisión contable; no sustituye libros, soportes bancarios ni la revisión del contador. Las retenciones registradas en Sheets no se recalculan.",
      date: "Fecha", clientCol: "Cliente", project: "Trabajo", grossCol: "Bruto", ownCol: "Ingreso propio", issue: "Revisión",
      limited: "Se muestran los primeros 40 registros; el CSV contiene todos los registros filtrados.",
      failures: "No se pudo generar el reporte. Revisa el log de Finance o Cloudflare."
    },
    en: {
      title: "Income report", intro: "Generate a read-only report from SD.Live Track (Google Sheets). COP and USD figures are never combined or converted.",
      basis: "Basis", work: "By work date", payment: "By payment date",
      start: "From", end: "To", currency: "Currency", client: "Client (optional)", all: "All",
      generate: "Generate report", csv: "Download full CSV",
      idle: "Choose a period and generate the report. No source records will be changed.",
      loading: "Reading Finance…", ready: "Report updated", empty: "No records in this period.",
      owner: "Owner income", bank: "Bank received", gross: "Total transaction gross",
      third: "Third-party gross", rows: "Records", quality: "Rows requiring review",
      warning: "Missing amounts or invalid owner allocations are excluded from the owner-income total.",
      month: "Monthly breakdown", clients: "Income by client", detail: "Record detail",
      noteWork: "By work date: recorded owner gross. Associated bank receipts may have been paid in a different period.",
      notePayment: "By payment date: owner-attributable cash after proportional third-party allocations. Only rows marked Paid.",
      caution: "Management report for accounting review, not a substitute for accounting records, bank evidence or professional review. Recorded tax/fee fields are not recalculated.",
      date: "Date", clientCol: "Client", project: "Project", grossCol: "Gross", ownCol: "Owner amount", issue: "Review",
      limited: "Showing the first 40 records; the CSV contains every matching record.",
      failures: "Could not generate the report. Check the Finance or Cloudflare log."
    }
  };
  const state = { result: null, query: null };

  function language() {
    const active = window.SDLiveFinanceI18n?.language;
    if (active === "es" || active === "en") return active;
    return (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }
  function t(key) { return COPY[language()][key] || key; }
  function currentYearBogota() {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Bogota" }).format(new Date());
  }
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }
  function money(currency, value) {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
      style: "currency", currency,
      maximumFractionDigits: currency === "COP" ? 0 : 2
    }).format(value);
  }
  function buildQuery(csv = false) {
    const form = document.getElementById("financeIncomeReportForm");
    const params = new URLSearchParams({
      start: form.elements.start.value,
      end: form.elements.end.value,
      basis: form.elements.basis.value,
      currency: form.elements.currency.value,
      client: form.elements.client.value.trim()
    });
    if (csv) params.set("format", "csv");
    return "/api/admin/finance/income-report?" + params.toString();
  }
  function translate(root) {
    root.querySelectorAll("[data-report-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.reportI18n);
    });
    const clientInput = root.querySelector('input[name="client"]');
    if (clientInput) clientInput.placeholder = language() === "es" ? "Buscar cliente" : "Search client";
    if (state.result) render(state.result);
  }
  function metric(parent, label, value) {
    const box = el("div", "finance-income-metric");
    box.append(el("span", "", label), el("strong", "", value));
    parent.appendChild(box);
  }
  function renderTable(parent, headings, entries) {
    parent.replaceChildren();
    const wrapper = el("div", "finance-income-table-wrap");
    const table = el("table", "finance-income-table");
    const head = el("thead");
    const tr = el("tr");
    headings.forEach((heading) => tr.append(el("th", "", heading)));
    head.append(tr);
    const body = el("tbody");
    entries.forEach((values) => {
      const row = el("tr");
      values.forEach((value) => row.append(el("td", "", value ?? "—")));
      body.append(row);
    });
    table.append(head, body);
    wrapper.append(table);
    parent.appendChild(wrapper);
  }
  function render(report) {
    const root = document.getElementById("financeIncomeReports");
    if (!root) return;
    const result = root.querySelector("#financeIncomeResult");
    const metrics = root.querySelector("#financeIncomeMetrics");
    metrics.replaceChildren();
    const warningCount = Object.values(report.anomalies || {}).reduce((a, b) => a + Number(b || 0), 0);
    ["COP", "USD"].forEach((currency) => {
      const row = report.summary[currency] || {};
      metric(metrics, t("owner") + " · " + currency, money(currency, row.owner || 0));
      metric(metrics, t("gross") + " · " + currency, money(currency, row.gross || 0));
      metric(metrics, t("third") + " · " + currency, money(currency, row.thirdPartyGross || 0));
      metric(metrics, t("bank") + " · " + currency, money(currency, row.bank || 0));
    });
    metric(metrics, t("rows"), report.recordCount || 0);
    metric(metrics, t("quality"), warningCount);
    root.querySelector("#financeIncomeBasisNote").textContent = t(report.basis === "work" ? "noteWork" : "notePayment");
    root.querySelector("#financeIncomeWarning").textContent = warningCount ? t("warning") : "";
    const months = (report.monthly || []).map(row => [row.month, row.currency, money(row.currency, row.amount)]);
    renderTable(root.querySelector("#financeIncomeMonthly"), [t("date"), t("currency"), t("owner")], months);
    const clients = (report.byClient || []).slice(0, 30).map(row => [row.client, row.currency, money(row.currency, row.amount)]);
    renderTable(root.querySelector("#financeIncomeClients"), [t("clientCol"), t("currency"), t("owner")], clients);
    const basisDate = report.basis === "payment" ? "paymentDate" : "workDate";
    const rows = (report.records || []).slice(0, 40).map(row => [
      row[basisDate], row.client, row.project, row.currency,
      money(row.currency, row.gross),
      money(row.currency, report.basis === "payment" ? row.ownCashReceived : row.ownGross),
      row.review || "—"
    ]);
    renderTable(root.querySelector("#financeIncomeDetails"), [
      t("date"), t("clientCol"), t("project"), t("currency"), t("grossCol"), t("ownCol"), t("issue")
    ], rows);
    root.querySelector("#financeIncomeCountNote").textContent = report.recordCount > 40 ? t("limited") : "";
    root.querySelector("#financeIncomeEmpty").textContent = report.recordCount ? "" : t("empty");
    root.querySelector("#financeIncomeStatus").textContent = t("ready") + " · " + report.period.start + " – " + report.period.end;
    root.querySelector("#financeIncomeCsv").disabled = false;
    result.hidden = false;
  }
  async function submit() {
    const root = document.getElementById("financeIncomeReports");
    if (!root) return;
    const form = root.querySelector("#financeIncomeReportForm");
    if (!form.reportValidity()) return;
    const button = root.querySelector("#financeIncomeGenerate");
    const status = root.querySelector("#financeIncomeStatus");
    button.disabled = true;
    root.querySelector("#financeIncomeCsv").disabled = true;
    status.textContent = t("loading");
    try {
      const url = buildQuery();
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data?.error || "Report failed");
      state.result = data;
      state.query = url;
      render(data);
    } catch (error) {
      status.textContent = t("failures") + " (" + String(error.message).slice(0, 100) + ")";
      state.result = null;
      state.query = null;
    } finally {
      button.disabled = false;
    }
  }
  function install() {
    const overview = document.getElementById("financeOverview");
    if (!overview) return false;
    if (document.getElementById("financeIncomeReports")) return true;
    const root = el("section", "finance-income-panel");
    root.id = "financeIncomeReports";
    root.innerHTML = [
      '<div class="finance-income-heading"><h4 data-report-i18n="title"></h4><p data-report-i18n="intro"></p></div>',
      '<form id="financeIncomeReportForm" class="finance-income-form">',
      '<label><span data-report-i18n="basis"></span><select name="basis"><option value="payment" data-report-i18n="payment"></option><option value="work" data-report-i18n="work"></option></select></label>',
      '<label><span data-report-i18n="start"></span><input name="start" type="date" required></label>',
      '<label><span data-report-i18n="end"></span><input name="end" type="date" required></label>',
      '<label><span data-report-i18n="currency"></span><select name="currency"><option value="ALL" data-report-i18n="all"></option><option value="COP">COP</option><option value="USD">USD</option></select></label>',
      '<label><span data-report-i18n="client"></span><input name="client" type="search" maxlength="120"></label>',
      '<div class="finance-income-actions"><button type="submit" id="financeIncomeGenerate" data-report-i18n="generate"></button><button type="button" id="financeIncomeCsv" disabled data-report-i18n="csv"></button></div>',
      '</form><p class="finance-income-status" id="financeIncomeStatus" aria-live="polite" data-report-i18n="idle"></p>',
      '<div id="financeIncomeResult" hidden>',
      '<p class="finance-income-note" id="financeIncomeBasisNote"></p>',
      '<div id="financeIncomeMetrics" class="finance-income-metrics"></div>',
      '<p class="finance-income-warning" id="financeIncomeWarning"></p>',
      '<div class="finance-income-columns">',
      '<article><h5 data-report-i18n="month"></h5><div id="financeIncomeMonthly"></div></article>',
      '<article><h5 data-report-i18n="clients"></h5><div id="financeIncomeClients"></div></article>',
      '</div><article class="finance-income-detail"><h5 data-report-i18n="detail"></h5><p id="financeIncomeCountNote"></p><p id="financeIncomeEmpty"></p><div id="financeIncomeDetails"></div></article>',
      '</div><p class="finance-income-caution" data-report-i18n="caution"></p>'
    ].join("");
    const year = currentYearBogota();
    root.querySelector('[name="start"]').value = year + "-01-01";
    root.querySelector('[name="end"]').value = year + "-12-31";
    root.querySelector("#financeIncomeReportForm").addEventListener("submit", (event) => {
      event.preventDefault();
      submit();
    });
    root.querySelector("#financeIncomeCsv").addEventListener("click", () => {
      if (state.result && state.query) window.location.assign(buildQuery(true));
    });
    root.querySelector("#financeIncomeReportForm").addEventListener("change", () => {
      root.querySelector("#financeIncomeCsv").disabled = true;
      state.query = null;
    });
    root.querySelector('input[name="client"]').addEventListener("input", () => {
      root.querySelector("#financeIncomeCsv").disabled = true;
      state.query = null;
    });
    overview.appendChild(root);
    translate(root);
    window.SDLiveFinanceTabs?.install?.();
    return true;
  }
  document.addEventListener("click", (event) => {
    if (!event.target?.closest?.(".finance-language-control button[data-lang]")) return;
    setTimeout(() => {
      const root = document.getElementById("financeIncomeReports");
      if (root) translate(root);
    }, 0);
  });
  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 10000);
  window.SDLiveFinanceIncomeReports = { install, render };
})();
