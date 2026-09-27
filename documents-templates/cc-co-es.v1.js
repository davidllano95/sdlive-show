import { draftBaseCss, escapeHtml as e, formatDateLabel, formatMoney, safeBrand } from "./shared.js";

export const CC_CO_ES_TEMPLATE_VERSION = "cc-co-es@1";

const KIND_LABELS_ES = Object.freeze({
  professional_service: "Servicio",
  equipment: "Equipo",
  per_diem: "Viático",
  transport: "Transporte",
  reimbursable: "Reembolso",
  other: "Otro"
});

function bankRows(details = {}) {
  const rows = [
    ["Nombre del Banco", details.bankName],
    ["Routing Number", details.routingNumber],
    ["Tipo de cuenta", details.accountType],
    ["Número de cuenta", details.accountNumber],
    ["Dirección del banco", details.bankAddress]
  ].filter(([, value]) => value != null && String(value).trim());
  return rows.map(([label, value]) => `<dt>${e(label)}</dt><dd>${e(value)}</dd>`).join("");
}

function lineDateLabel(line) {
  const start = String(line?.serviceDate || "").trim();
  const end = String(line?.serviceDateEnd || "").trim();
  if (start && end && start !== end) return `${formatDateLabel(start, "es-CO")} – ${formatDateLabel(end, "es-CO")}`;
  return start ? formatDateLabel(start, "es-CO") : (end ? formatDateLabel(end, "es-CO") : "");
}

function isSimpleConceptLine(line) {
  const quantity = Number.isSafeInteger(Number(line?.quantity)) ? Number(line.quantity) : 0;
  return quantity <= 0
    && !String(line?.unit || "").trim()
    && !String(line?.serviceDate || "").trim()
    && !String(line?.serviceDateEnd || "").trim()
    && !String(line?.poNumber || "").trim()
    && !String(line?.reference || "").trim()
    && (!line?.kind || line.kind === "professional_service");
}

function conceptColgroup(hasDates, hasLinePos) {
  const widths = hasDates && hasLinePos
    ? [6, 27, 16, 22, 13, 16]
    : hasDates
      ? [6, 37, 17, 22, 18]
      : hasLinePos
        ? [6, 40, 17, 18, 19]
        : [7, 51, 20, 22];
  return `<colgroup>${widths.map((width) => `<col style="width:${width}%">`).join("")}</colgroup>`;
}

export function renderCuentaDeCobro(snapshot, { mode = "draft", signatureDataUri = null } = {}) {
  const draft = mode === "draft";
  const issuer = snapshot.issuer || {};
  const client = snapshot.client || {};
  const brand = safeBrand(issuer);
  const lines = snapshot.lines || [];
  const totalMinor = Number(snapshot.totalMinor || 0);
  const itemize = snapshot.itemize !== false;
  const simpleConceptsOnly = itemize && lines.length > 0 && lines.every(isSimpleConceptLine);
  const hasDates = itemize && !simpleConceptsOnly && lines.some((line) => String(line.serviceDate || line.serviceDateEnd || "").trim());
  const hasLinePos = itemize && !simpleConceptsOnly && lines.some((line) => String(line.poNumber || "").trim());
  const rows = itemize ? lines.map((line) => {
    if (simpleConceptsOnly) {
      return `<tr class="simple-concept-row"><td class="description-cell"><div class="line-description">${e(line.description)}</div></td><td class="num amount">${formatMoney(line.amountMinor, snapshot.currency, "es-CO")}</td></tr>`;
    }
    const quantity = Number.isSafeInteger(Number(line.quantity)) && Number(line.quantity) >= 0 ? Number(line.quantity) : 0;
    const effectiveQuantity = quantity > 0 ? quantity : 1;
    const unitMinor = line.unitMinor == null ? Math.round(Number(line.amountMinor || 0) / effectiveQuantity) : Number(line.unitMinor);
    const typeLabel = KIND_LABELS_ES[line.kind] || "Otro";
    const meta = [`Tipo: ${typeLabel}`, line.unit ? `Unidad: ${line.unit}` : ""].filter(Boolean).join(" · ");
    const dateLabel = lineDateLabel(line);
    return `
    <tr>
      <td class="qty">${quantity > 0 ? e(quantity) : "—"}</td>
      <td class="description-cell"><div class="line-description">${e(line.description)}</div><div class="line-meta">${e(meta)}</div>${line.reference ? `<div class="sub">${e(line.reference)}</div>` : ""}</td>
      <td class="num rate">${formatMoney(unitMinor, snapshot.currency, "es-CO")}</td>
      ${hasDates ? `<td class="date">${dateLabel ? e(dateLabel) : "—"}</td>` : ""}
      ${hasLinePos ? `<td class="mono po">${e(line.poNumber || "—")}</td>` : ""}
      <td class="num amount">${formatMoney(line.amountMinor, snapshot.currency, "es-CO")}</td>
    </tr>`;
  }).join("") : "";
  const retention = Boolean(snapshot.usesCostsDeductions);
  const bank = snapshot.showBankDetails ? bankRows(snapshot.bankDetails || {}) : "";
  const optionalMeta = [
    snapshot.projectLabel ? ["Proyecto / servicio", snapshot.projectLabel] : null,
    snapshot.purchaseOrder ? ["Orden de compra / referencia", snapshot.purchaseOrder] : null,
    snapshot.dueDate ? ["Fecha de vencimiento", formatDateLabel(snapshot.dueDate, "es-CO")] : null,
    snapshot.terms ? ["Condiciones", snapshot.terms] : null
  ].filter(Boolean);
  const tableColumns = simpleConceptsOnly ? 2 : 4 + (hasDates ? 1 : 0) + (hasLinePos ? 1 : 0);
  const tableHead = simpleConceptsOnly
    ? ""
    : `<thead><tr><th>Cant.</th><th>Descripción</th><th class="num">Valor unitario</th>${hasDates ? `<th>Fecha / período</th>` : ""}${hasLinePos ? `<th>Orden de compra</th>` : ""}<th class="num">Valor</th></tr></thead>`;
  const colgroup = simpleConceptsOnly
    ? `<colgroup><col style="width:76%"><col style="width:24%"></colgroup>`
    : conceptColgroup(hasDates, hasLinePos);
  const nonItemizedConcepts = lines
    .map((line) => String(line?.description || "").trim())
    .filter(Boolean)
    .map((description) => `<div class="nonitemized-concept">${e(description)}</div>`)
    .join("");
  const concepts = itemize
    ? `<div class="concept-title">Por concepto de</div><table class="concept-table${simpleConceptsOnly ? " simple" : ""}">${colgroup}${tableHead}<tbody>${rows}<tr class="total"><td class="total-label" colspan="${tableColumns - 1}">Total</td><td class="num">$ ${formatMoney(totalMinor, snapshot.currency, "es-CO")}</td></tr></tbody></table>`
    : `<div class="concept-title">Por concepto de</div><div class="nonitemized-concepts">${nonItemizedConcepts}</div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Borrador cuenta de cobro</title><style>${draftBaseCss()}
    .title{font-weight:780;font-size:19pt;letter-spacing:.035em;line-height:1.1}.docno{font-family:"SFMono-Regular",Consolas,monospace;font-weight:700;font-size:15pt;color:#472eb4;margin-top:4px}.dateline{font-size:8.2pt;font-weight:700;margin-bottom:8px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{border:1px solid #e3e4ea;border-radius:10px;padding:12px 14px}.card .name{font-weight:750;font-size:12pt;margin-top:5px;line-height:1.2}.sum{margin-top:14px;border-radius:10px;background:#f5f4fb;border:1px solid #e4e0f6;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;gap:20px}.sum .words{font-size:10.2pt;font-weight:720;line-height:1.35;max-width:4in}.sum .fig{font-family:"SFMono-Regular",Consolas,monospace;font-weight:700;font-size:17pt;white-space:nowrap}.docmeta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px;margin-top:14px;padding:10px 12px;border:1px solid #eceef2;border-radius:8px}.docmeta div{display:grid;grid-template-columns:auto 1fr;gap:8px}.docmeta strong{font-size:7pt;text-transform:uppercase;letter-spacing:.08em;color:#6b6e7a}.docmeta span{font-size:8.4pt}.concept-title{text-align:center;font-size:10.6pt;font-weight:800;color:#16171d;letter-spacing:.01em;margin:19px 0 9px}.nonitemized-concepts{text-align:center;margin:0 auto 8px;max-width:5.8in;font-size:10pt;line-height:1.55}.nonitemized-concept+.nonitemized-concept{margin-top:2px}.concept-table{table-layout:fixed;margin-top:0}.concept-table th,.concept-table td{padding:9px 10px;overflow-wrap:anywhere}.concept-table th{line-height:1.2;vertical-align:bottom}.concept-table th:first-child,.concept-table td:first-child{padding-left:0}.concept-table th:last-child,.concept-table td:last-child{padding-right:0}.concept-table th+th,.concept-table td+td{border-left:1px solid #eef0f4}.concept-table .qty{text-align:center;font-family:"SFMono-Regular",Consolas,monospace;font-weight:700}.concept-table .description-cell{padding-left:14px}.concept-table .line-description{font-size:9.8pt;font-weight:650;line-height:1.3}.concept-table .line-meta{font-size:7.6pt;line-height:1.35;color:#6b6e7a;margin-top:4px}.concept-table .rate,.concept-table .amount{font-weight:650}.concept-table .date{font-size:7.7pt;line-height:1.35;color:#5f626e}.concept-table .po{font-size:8pt;color:#5f626e}.concept-table.simple .description-cell{padding:12px 18px 12px 0}.concept-table.simple .amount{padding:12px 0 12px 18px;font-size:10pt}.concept-table.simple .simple-concept-row:first-child td{border-top:1px solid #d5d7df}.total td{border-bottom:none;border-left:none!important;padding-top:11px;font-weight:800}.total .total-label{text-align:right;padding-right:14px}.cert{margin-top:12px;border-left:2px solid #472eb4;padding:2px 0 2px 12px;font-size:7.7pt;line-height:1.5;color:#3b3e49}.cert h4{font-size:7.8pt;margin:0 0 3px}.notes{margin-top:10px;padding:9px 11px;border-radius:8px;background:#fafafa;border:1px solid #eceef2;font-size:8.2pt}.bank{margin-top:12px}.bank-kv{display:grid;grid-template-columns:1.35fr 2fr;gap:3px 14px;margin:6px 0 0;max-width:4.7in}.bank-kv dt{color:#6b6e7a}.bank-kv dd{margin:0;font-family:"SFMono-Regular",Consolas,monospace}.signrow{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px}.facts{font-size:7.8pt;color:#3b3e49;line-height:1.55}
  </style></head><body><div class="page">
    ${draft ? `<div class="watermark"><span>BORRADOR</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
      <div><div class="dateline">${e(snapshot.issueCity || "")}${snapshot.issueCity && snapshot.issueDate ? " · " : ""}${snapshot.issueDate ? e(formatDateLabel(snapshot.issueDate, "es-CO")) : ""}</div><div class="brand">${e(brand.primary)}</div>${brand.secondary ? `<div class="brand-sub">${e(brand.secondary)}</div>` : ""}${draft ? `<div style="margin-top:10px"><span class="chip">BORRADOR · SIN NÚMERO</span></div>` : ""}</div>
      <div style="text-align:right"><div class="title">CUENTA DE COBRO</div><div class="docno">${draft ? "No. —" : e(snapshot.number?.display || "")}</div></div>
    </div>
    <div class="rule"></div>
    <div class="parties">
      <div class="card"><div class="label">La empresa</div><div class="name">${e(client.legalName)}</div><div class="sub mono" style="margin-top:3px">${e(client.taxIdType || "NIT")} ${e(client.taxId || "")}</div></div>
      <div class="card"><div class="label">Debe a</div><div class="name">${e(issuer.legalName)}</div><div class="sub mono" style="margin-top:3px">${e(issuer.idType || "C.C.")} ${e(issuer.idNumber || "")}</div></div>
    </div>
    <div class="sum"><div><div class="label" style="margin-bottom:4px">La suma de</div><div class="words">${e(snapshot.amountInWords || "")}</div></div><div class="fig">$ ${formatMoney(totalMinor, snapshot.currency, "es-CO")} <span class="sub">${e(snapshot.currency)}</span></div></div>
    ${optionalMeta.length ? `<div class="docmeta">${optionalMeta.map(([label, value]) => `<div><strong>${e(label)}</strong><span>${e(value)}</span></div>`).join("")}</div>` : ""}
    ${concepts}
    ${snapshot.notes ? `<div class="notes"><span class="label">Notas</span><div style="margin-top:4px">${e(snapshot.notes)}</div></div>` : ""}
    <div class="cert"><h4>Certificación de retención — personas naturales prestadoras de servicios personales</h4>
      Bajo la gravedad de juramento certifico que sobre los ingresos recibidos <span class="mono">Sí [${retention ? "X" : " "}] · No [${retention ? " " : "X"}]</span> se tomarán costos o deducciones asociados a dichas rentas, conforme a los artículos 1.2.4.1.6 y 1.2.4.1.17 del Decreto Único Reglamentario 1625 de 2016.<br>
      Si <b>no</b> utilizo al final del año costos y gastos para enfrentarlos a mis ingresos, favor aplicar la tarifa de retención del artículo 383 del Estatuto Tributario. En caso afirmativo, favor aplicar las retenciones con las tarifas del artículo 392 del ET (4%, 6%, 10% u 11%).
      <div class="sub" style="margin-top:3px;font-size:6.6pt">Texto legal versión ${e(snapshot.legalBlockVersion || "co-ret@2026-1")}</div>
    </div>
    ${bank ? `<div class="bank"><span class="label">Información de pago</span><dl class="bank-kv">${bank}</dl></div>` : ""}
    <div class="signrow"><div>${draft ? `<div class="sig-pending">La firma se aplica al finalizar</div>` : `<img style="height:62px" src="${e(signatureDataUri || "")}" alt="Firma">`}<div class="sig-line"><strong>${e(issuer.legalName)}</strong><div class="facts">${e(issuer.idType)} ${e(issuer.idNumber)}${issuer.phone ? ` · Tel. ${e(issuer.phone)}` : ""}<br>${e(issuer.address || "")}<br>${issuer.ciiu ? `Actividad CIIU ${e(issuer.ciiu)} · ` : ""}${e(issuer.vatLabel || "")}</div></div></div><div class="facts" style="text-align:right">Atentamente,<br><span class="sub">${e(issuer.email || "")}</span></div></div>
    <div class="footer"><span>Emitido con SD.Live Documents · ${draft ? "borrador" : e(snapshot.number?.display || "")}</span><span>Página 1 de 1</span></div>
  </div></body></html>`;
}
