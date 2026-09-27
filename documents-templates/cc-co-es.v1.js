import { draftBaseCss, escapeHtml as e, formatDateLabel, formatMoney, safeBrand } from "./shared.js";

export const CC_CO_ES_TEMPLATE_VERSION = "cc-co-es@1";

export function renderCuentaDeCobro(snapshot, { mode = "draft", signatureDataUri = null } = {}) {
  const draft = mode === "draft";
  const issuer = snapshot.issuer || {};
  const client = snapshot.client || {};
  const brand = safeBrand(issuer);
  const totalMinor = Number(snapshot.totalMinor || 0);
  const rows = (snapshot.lines || []).map((line, index) => `
    <tr>
      <td class="mono sub" style="width:24px">${String(index + 1).padStart(2, "0")}</td>
      <td>${e(line.description)}${line.reference ? `<div class="sub">${e(line.reference)}</div>` : ""}</td>
      <td class="sub" style="width:94px">${e(formatDateLabel(line.serviceDate, "es-CO"))}</td>
      <td class="mono sub" style="width:105px">${e(line.poNumber || "—")}</td>
      <td class="num" style="width:105px">${formatMoney(line.amountMinor, snapshot.currency, "es-CO")}</td>
    </tr>`).join("");
  const retention = Boolean(snapshot.usesCostsDeductions);
  const bank = snapshot.showBankDetails && snapshot.bankDetails
    ? Object.values(snapshot.bankDetails).filter(Boolean).join(" · ")
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Borrador cuenta de cobro</title><style>${draftBaseCss()}
    .title{font-weight:780;font-size:19pt;letter-spacing:.035em;line-height:1.1}.docno{font-family:"SFMono-Regular",Consolas,monospace;font-weight:700;font-size:15pt;color:#472eb4;margin-top:4px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{border:1px solid #e3e4ea;border-radius:10px;padding:12px 14px}.card .name{font-weight:750;font-size:12pt;margin-top:5px;line-height:1.2}.sum{margin-top:14px;border-radius:10px;background:#f5f4fb;border:1px solid #e4e0f6;padding:13px 16px;display:flex;justify-content:space-between;align-items:center;gap:20px}.sum .words{font-size:10.2pt;font-weight:720;line-height:1.35;max-width:4in}.sum .fig{font-family:"SFMono-Regular",Consolas,monospace;font-weight:700;font-size:17pt;white-space:nowrap}.total td{border-bottom:none;padding-top:9px;font-weight:800}.cert{margin-top:12px;border-left:2px solid #472eb4;padding:2px 0 2px 12px;font-size:7.7pt;line-height:1.5;color:#3b3e49}.cert h4{font-size:7.8pt;margin:0 0 3px}.signrow{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px}.facts{font-size:7.8pt;color:#3b3e49;line-height:1.55}
  </style></head><body><div class="page">
    ${draft ? `<div class="watermark"><span>BORRADOR</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div class="brand">${e(brand.primary)}</div><div class="brand-sub">${e(brand.secondary)}</div>${draft ? `<div style="margin-top:10px"><span class="chip">BORRADOR · SIN NÚMERO</span></div>` : ""}</div>
      <div style="text-align:right"><div class="title">CUENTA DE COBRO</div><div class="docno">${draft ? "No. —" : e(snapshot.number?.display || "")}</div><div class="sub" style="margin-top:6px">${e(snapshot.issueCity)} · ${e(formatDateLabel(snapshot.issueDate, "es-CO"))}</div></div>
    </div>
    <div class="rule"></div>
    <div class="parties">
      <div class="card"><div class="label">La empresa</div><div class="name">${e(client.legalName)}</div><div class="sub mono" style="margin-top:3px">${e(client.taxIdType || "NIT")} ${e(client.taxId || "")}</div></div>
      <div class="card"><div class="label">Debe a</div><div class="name">${e(issuer.legalName)}</div><div class="sub mono" style="margin-top:3px">${e(issuer.idType || "C.C.")} ${e(issuer.idNumber || "")}</div></div>
    </div>
    <div class="sum"><div><div class="label" style="margin-bottom:4px">La suma de</div><div class="words">${e(snapshot.amountInWords || "")}</div></div><div class="fig">$ ${formatMoney(totalMinor, snapshot.currency, "es-CO")} <span class="sub">${e(snapshot.currency)}</span></div></div>
    <div style="margin-top:18px" class="label">Por concepto de${snapshot.projectLabel ? ` · <span style="color:#15161c;letter-spacing:.02em;text-transform:none">${e(snapshot.projectLabel)}</span>` : ""}</div>
    <table style="margin-top:8px"><thead><tr><th></th><th>Concepto</th><th>Fecha</th><th>Orden de compra</th><th class="num">Valor</th></tr></thead><tbody>${rows}<tr class="total"><td></td><td colspan="3">Total</td><td class="num">$ ${formatMoney(totalMinor, snapshot.currency, "es-CO")}</td></tr></tbody></table>
    <div class="cert"><h4>Certificación de retención — personas naturales prestadoras de servicios personales</h4>
      Bajo la gravedad de juramento certifico que sobre los ingresos recibidos <span class="mono">Sí [${retention ? "X" : " "}] · No [${retention ? " " : "X"}]</span> se tomarán costos o deducciones asociados a dichas rentas, conforme a los artículos 1.2.4.1.6 y 1.2.4.1.17 del Decreto Único Reglamentario 1625 de 2016.<br>
      Si <b>no</b> utilizo al final del año costos y gastos para enfrentarlos a mis ingresos, favor aplicar la tarifa de retención del artículo 383 del Estatuto Tributario. En caso afirmativo, favor aplicar las retenciones con las tarifas del artículo 392 del ET (4%, 6%, 10% u 11%).
      <div class="sub" style="margin-top:3px;font-size:6.6pt">Texto legal versión ${e(snapshot.legalBlockVersion || "co-ret@2026-1")}</div>
    </div>
    ${bank ? `<div style="margin-top:10px;font-size:8pt"><span class="label">Pago</span>&nbsp; ${e(bank)}</div>` : ""}
    <div class="signrow"><div>${draft ? `<div class="sig-pending">La firma se aplica al finalizar</div>` : `<img style="height:62px" src="${e(signatureDataUri || "")}" alt="Firma">`}<div class="sig-line"><strong>${e(issuer.legalName)}</strong><div class="facts">${e(issuer.idType)} ${e(issuer.idNumber)}${issuer.phone ? ` · Tel. ${e(issuer.phone)}` : ""}<br>${e(issuer.address || "")}<br>${issuer.ciiu ? `Actividad CIIU ${e(issuer.ciiu)} · ` : ""}${e(issuer.vatLabel || "")}</div></div></div><div class="facts" style="text-align:right">Atentamente,<br><span class="sub">${e(issuer.email || "")}</span></div></div>
    <div class="footer"><span>Emitido con SD.Live Documents · ${draft ? "borrador" : e(snapshot.number?.display || "")}</span><span>Página 1 de 1</span></div>
  </div></body></html>`;
}
