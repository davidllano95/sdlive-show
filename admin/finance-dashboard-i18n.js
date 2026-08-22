(() => {
  const STORAGE_KEY = "sdlive-finance-language";
  const SUPPORTED = new Set(["en", "es"]);
  const textSource = new WeakMap();
  const textRendered = new WeakMap();
  const attrState = new WeakMap();
  let observer = null;
  let translating = false;

  const ES = Object.freeze({
    "Finance dashboard": "Panel financiero",
    "Cash, production, clients, receivables and collection performance from the private read-only finance source.": "Caja, producción, clientes, cuentas por cobrar y desempeño de cobro desde la fuente financiera privada de solo lectura.",
    "Year": "Año",
    "Connecting to SD.Live Track…": "Conectando con SD.Live Track…",
    "To invoice": "Por facturar",
    "Loading…": "Cargando…",
    "Work not yet put into collection": "Trabajo aún no puesto en cobro",
    "Collectible now": "Cobrable ahora",
    "Invoice sent and workflow complete": "Cuenta enviada y flujo completo",
    "Workflow blocked": "Flujo bloqueado",
    "Outstanding but not ready for collection": "Pendiente, pero aún no listo para cobro",
    "Received all-time": "Recibido histórico",
    "Recorded fees: —": "Comisiones registradas: —",
    "Cash received": "Dinero recibido",
    "Monthly performance": "Rendimiento mensual",
    "Received in COP": "Recibido en COP",
    "Received in USD": "Recibido en USD",
    "Total": "Total",
    "Best month": "Mejor mes",
    "Monthly avg": "Promedio mensual",
    "Production vs cash": "Producción vs caja",
    "Generated vs received": "Generado vs recibido",
    "Net work by work date vs cash by payment date": "Trabajo neto por fecha de trabajo vs caja por fecha de pago",
    "Clients": "Clientes",
    "Revenue concentration": "Concentración de ingresos",
    "Based on cash received": "Basado en dinero recibido",
    "Top clients": "Principales clientes",
    "Accounts receivable": "Cuentas por cobrar",
    "Unpaid aging": "Antigüedad de cuentas no pagadas",
    "Current outstanding net balances": "Saldos netos pendientes actuales",
    "Unpaid COP": "Cuentas no pagadas COP",
    "Unpaid USD": "Cuentas no pagadas USD",
    "0–30 days": "0–30 días",
    "31–60 days": "31–60 días",
    "61+ days": "61+ días",
    "Top debtors": "Principales deudores",
    "Collection performance": "Desempeño de cobro",
    "How efficiently cash arrives": "Eficiencia de entrada de caja",
    "Paid invoices in the selected year": "Cuentas pagadas en el año seleccionado",
    "Collection & fees": "Cobranza y comisiones",
    "Planning": "Planeación",
    "Tax reserve": "Reserva fiscal",
    "Management reserve only · not taxes owed": "Reserva de planeación · no representa impuestos adeudados",
    "Enable tax reserve": "Activar reserva fiscal",
    "Calculate a planning reserve from cash received.": "Calcula una reserva de planeación a partir del dinero recibido.",
    "COP reserve %": "Reserva COP %",
    "USD reserve %": "Reserva USD %",
    "Apply from": "Aplicar desde",
    "Save reserve settings": "Guardar configuración de reserva",
    "Collection queue": "Cola de cobranza",
    "Priority": "Prioridad",
    "Oldest collectible first": "Cobrables más antiguos primero",
    "Controls": "Controles",
    "Data quality": "Calidad de datos",
    "Received": "Recibido",
    "Generated": "Generado",
    "No received revenue in this currency for the selected year.": "No hay ingresos recibidos en esta moneda durante el año seleccionado.",
    "No outstanding balances.": "No hay saldos pendientes.",
    "Slowest-paying clients": "Clientes que más tardan en pagar",
    "Not enough payment history yet.": "Aún no hay suficiente historial de pagos.",
    "Average to pay": "Promedio para pagar",
    "Median to pay": "Mediana para pagar",
    "Top 3 concentration": "Concentración Top 3",
    "Recorded fees": "Comisiones registradas",
    "Effective fee rate": "Tasa efectiva de comisiones",
    "Paid sample": "Muestra pagada",
    "Not configured": "Sin configurar",
    "No payments yet": "Aún sin pagos",
    "Nothing is ready for collection.": "No hay nada listo para cobro.",
    "Loading collection queue…": "Cargando cola de cobranza…",
    "Could not load finance data.": "No se pudieron cargar los datos financieros.",
    "Finance source unavailable": "Fuente financiera no disponible",
    "Paid rows missing received amount": "Filas pagadas sin valor recibido",
    "Unsupported currencies": "Monedas no admitidas",
    "Unpaid rows missing aging": "Filas no pagadas sin antigüedad",
    "Paid rows missing payment date": "Filas pagadas sin fecha de pago",
    "Invalid payment durations": "Duraciones de pago inválidas",
    "Saving…": "Guardando…",
    "Saved": "Guardado",
    "e.g. 25": "ej. 25",
    "e.g. 20": "ej. 20",
    "Jan": "Ene",
    "Feb": "Feb",
    "Mar": "Mar",
    "Apr": "Abr",
    "May": "May",
    "Jun": "Jun",
    "Jul": "Jul",
    "Aug": "Ago",
    "Sep": "Sep",
    "Oct": "Oct",
    "Nov": "Nov",
    "Dec": "Dic"
  });

  function preferredLanguage() {
    const stored = String(localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (SUPPORTED.has(stored)) return stored;
    return String(navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  let language = preferredLanguage();

  function pluralEs(value, singular, plural) {
    return Number(value) === 1 ? singular : plural;
  }

  function translateDynamic(source) {
    let match;

    match = source.match(/^(\d{4}) · YTD through (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|year end)$/);
    if (match) {
      const through = match[2] === "year end" ? "fin de año" : (ES[match[2]] || match[2]);
      return `${match[1]} · Acumulado hasta ${through}`;
    }

    match = source.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) · (Received|Generated): (.+)$/);
    if (match) return `${ES[match[1]] || match[1]} · ${ES[match[2]] || match[2]}: ${match[3]}`;

    match = source.match(/^(\d+) months? including zero months$/);
    if (match) return `${match[1]} ${pluralEs(match[1], "mes", "meses")} incluyendo meses en cero`;

    match = source.match(/^(\d+) accounts? · oldest ([\d.]+)d$/);
    if (match) return `${match[1]} ${pluralEs(match[1], "cuenta", "cuentas")} · más antigua ${match[2]}d`;

    match = source.match(/^(\d+) accounts?(.*)$/);
    if (match) {
      let suffix = match[2] || "";
      suffix = suffix.replace(/ · (\d+) workflow blocked/, (_, count) => ` · ${count} ${pluralEs(count, "bloqueada por flujo", "bloqueadas por flujo")}`);
      return `${match[1]} ${pluralEs(match[1], "cuenta", "cuentas")}${suffix}`;
    }

    match = source.match(/^(\d+) payments?$/);
    if (match) return `${match[1]} ${pluralEs(match[1], "pago", "pagos")}`;

    match = source.match(/^([\d.]+) days$/);
    if (match) return `${match[1]} días`;

    match = source.match(/^([\d.]+)d avg · (\d+) payments?$/);
    if (match) return `${match[1]}d prom. · ${match[2]} ${pluralEs(match[2], "pago", "pagos")}`;

    match = source.match(/^Top 3 · ([\d.]+)%$/);
    if (match) return `Top 3 · ${match[1]}%`;

    match = source.match(/^Live · (\d+) records · Google Sheets$/);
    if (match) return `En vivo · ${match[1]} registros · Google Sheets`;

    match = source.match(/^(\d+) records$/);
    if (match) return `${match[1]} registros`;

    match = source.match(/^Recorded fees: (.+)$/);
    if (match) return `Comisiones registradas: ${match[1]}`;

    match = source.match(/^Received (.+) · set a reserve rate when ready\.$/);
    if (match) return `Recibido ${match[1]} · configura una tasa de reserva cuando estés listo.`;

    match = source.match(/^([\d.]+)% reserve · after reserve (.+)$/);
    if (match) return `${match[1]}% de reserva · después de reserva ${match[2]}`;

    match = source.match(/^(COP|USD) cash received by month in (\d{4})$/);
    if (match) return `Dinero recibido en ${match[1]} por mes en ${match[2]}`;

    match = source.match(/^(COP|USD) generated versus received in (\d{4})$/);
    if (match) return `${match[1]} generado vs recibido en ${match[2]}`;

    match = source.match(/^Monthly (COP|USD) received chart$/);
    if (match) return `Gráfica mensual de ${match[1]} recibido`;

    return ES[source] || source;
  }

  function translated(source) {
    return language === "es" ? translateDynamic(source) : source;
  }

  function translateTextNode(node) {
    const current = node.nodeValue;
    if (!current || !current.trim()) return;

    let source = textSource.get(node);
    const lastRendered = textRendered.get(node);
    if (source === undefined || (lastRendered !== undefined && current !== lastRendered && current !== source)) {
      source = current;
      textSource.set(node, source);
    }

    const output = translated(source);
    textRendered.set(node, output);
    if (node.nodeValue !== output) node.nodeValue = output;
  }

  function translateAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
    let state = attrState.get(element);
    if (!state) {
      state = {};
      attrState.set(element, state);
    }

    const current = element.getAttribute(name) || "";
    const previous = state[name];
    if (!previous || (previous.rendered !== undefined && current !== previous.rendered && current !== previous.source)) {
      state[name] = { source: current, rendered: current };
    }

    const output = translated(state[name].source);
    state[name].rendered = output;
    if (current !== output) element.setAttribute(name, output);
  }

  function translateRoot(root = document.getElementById("financeOverview")) {
    if (!root || translating) return;
    translating = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (parent && !parent.closest(".finance-language-control")) translateTextNode(node);
        node = walker.nextNode();
      }

      root.querySelectorAll("[aria-label], [placeholder], [title]").forEach((element) => {
        if (element.closest(".finance-language-control")) return;
        translateAttribute(element, "aria-label");
        translateAttribute(element, "placeholder");
        translateAttribute(element, "title");
      });
    } finally {
      translating = false;
    }
  }

  function updateLanguageControl() {
    const root = document.querySelector(".finance-language-control");
    if (!root) return;
    root.querySelectorAll("button[data-lang]").forEach((button) => {
      const active = button.dataset.lang === language;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    root.setAttribute("aria-label", language === "es" ? "Idioma del panel financiero" : "Finance dashboard language");
  }

  function setLanguage(next) {
    if (!SUPPORTED.has(next)) return;
    language = next;
    localStorage.setItem(STORAGE_KEY, language);
    updateLanguageControl();
    translateRoot();
  }

  function ensureLanguageControl() {
    const finance = document.getElementById("financeOverview");
    const actions = finance?.querySelector(".finance-heading__actions");
    if (!actions) return false;
    if (actions.querySelector(".finance-language-control")) {
      updateLanguageControl();
      return true;
    }

    const control = document.createElement("div");
    control.className = "finance-language-control";
    control.innerHTML = `
      <button type="button" data-lang="es" aria-pressed="false">ES</button>
      <button type="button" data-lang="en" aria-pressed="false">EN</button>
    `;
    control.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-lang]");
      if (button) setLanguage(button.dataset.lang);
    });
    actions.insertBefore(control, actions.firstChild);
    updateLanguageControl();
    return true;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-finance-i18n-styles]')) return;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "./finance-dashboard-i18n.css";
    stylesheet.dataset.financeI18nStyles = "true";
    document.head.appendChild(stylesheet);
  }

  function refresh() {
    ensureStyles();
    if (!ensureLanguageControl()) return;
    translateRoot();
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (translating) return;
      const relevant = mutations.some((mutation) => {
        if (mutation.type === "characterData") return mutation.target.parentElement?.closest("#financeOverview");
        if (mutation.type === "attributes") return mutation.target.closest?.("#financeOverview");
        return [...mutation.addedNodes].some((node) =>
          node.nodeType === Node.ELEMENT_NODE
            ? (node.matches?.("#financeOverview") || node.closest?.("#financeOverview") || node.querySelector?.("#financeOverview"))
            : node.parentElement?.closest?.("#financeOverview")
        );
      });
      if (relevant) queueMicrotask(refresh);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "placeholder", "title"] });
  }

  ensureStyles();
  observe();
  refresh();

  window.SDLiveFinanceI18n = {
    get language() { return language; },
    setLanguage,
    refresh,
    t(source) { return translated(String(source ?? "")); }
  };
})();
