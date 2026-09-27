import { draftBaseCss, escapeHtml as e, formatDateLabel, formatMoney, safeBrand } from "./shared.js";

export const INVOICE_INTL_EN_TEMPLATE_VERSION = "invoice-intl-en@1";

const KIND_LABELS = Object.freeze({
  professional_service: "Service",
  equipment: "Equipment",
  per_diem: "Per diem",
  transport: "Transport",
  reimbursable: "Reimbursable",
  other: "Other"
});

export function renderInvoice(snapshot, { mode = "draft", signatureDataUri = null } = {}) {
  const draft = mode === "draft";
  const issuer = snapshot.issuer || {};
  const client = snapshot.client || {};
  const brand = safeBrand(issuer);
  const currency = snapshot.currency || "USD";
  const fmt = (minor) => formatMoney(minor, currency, "en-US");
  const groups = [
    { title: "Professional services", kinds: ["professional_service", "equipment", "other"] },
    { title: "Expenses & reimbursements", kinds: ["per_diem", "transport", "reimbursable"] }
  ];
  let body = "";
  for (const group of groups) {
    const lines = (snapshot.lines || []).filter((line) => group.kinds.includes(line.kind));
    if (!lines.length) continue;
    const subtotal = lines.reduce((sum, line) => sum + Number(line.amountMinor || 0), 0);
    body += `<tr class="group"><td colspan="5">${e(group.title)}</td></tr>`;
    body += lines.map((line) => {
      const original = line.originalCurrency && line.originalAmountMinor != null
        ? `Original expense ${e(line.originalCurrency)} ${formatMoney(line.originalAmountMinor, line.originalCurrency, line.originalCurrency === "COP" ? "es-CO" : "en-US")}`
        : "";
      return `<tr><td><span class="kind">${e(KIND_LABELS[line.kind] || "Other")}</span>${e(line.description)}${line.reference ? `<div class="sub">${e(line.reference)}</div>` : ""}${original ? `<div class="orig mono">${original}</div>` : ""}</td><td class="num">${e(line.quantity)}</td><td class="sub" style="padding-left:10px">${e(line.unit || "unit")}</td><td class="num">${line.unitMinor == null ? "—" : fmt(line.unitMinor)}</td><td class="num">${fmt(line.amountMinor)}</td></tr>`;
    }).join("");
    body += `<tr class="subtotal"><td colspan="4">Subtotal · ${e(group.title.toLowerCase())}</td><td class="num">${fmt(subtotal)}</td></tr>`;
  }
  const bank = snapshot.showBankDetails ? (snapshot.bankDetails || {}) : {};
  const bankRows = Object.entries(bank).filter(([, value]) => value != null && String(value).trim()).map(([key, value]) => `<dt>${e(key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))}</dt><dd>${e(value)}</dd>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Draft invoice</title><style>${draftBaseCss()}
    .title{font-weight:780;font-size:30pt;letter-spacing:-.01em;line-height:1}.meta{display:grid;grid-template-columns:auto auto;gap:3px 16px;font-size:8.4pt;margin-top:10px;justify-content:end;text-align:right}.meta dt{color:#6b6e7a}.meta dd{font-family:"SFMono-Regular",Consolas,monospace;font-weight:650}.cols{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;margin-top:4px}.name{font-weight:750;font-size:12pt;margin:4px 0 2px}.group td{border-bottom:none;padding:14px 0 2px;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#472eb4;font-weight:800}.subtotal td{font-size:8.2pt;color:#6b6e7a;border-bottom:1px solid #d5d7df}.kind{display:inline-block;font-size:6.6pt;letter-spacing:.08em;text-transform:uppercase;color:#472eb4;background:#f1effb;border-radius:4px;padding:1px 5px;margin-right:7px;font-weight:800;vertical-align:1px}.orig{font-size:7.6pt;color:#6b6e7a;margin-top:2px}.totalbox{margin-left:auto;margin-top:14px;width:3.1in;border-radius:10px;background:#15161c;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:baseline}.totalbox .v{font-family:"SFMono-Regular",Consolas,monospace;font-weight:700;font-size:16pt}.bottom{display:grid;grid-template-columns:1.2fr 1fr;gap:28px;margin-top:22px;font-size:8.2pt}.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 12px}.kv dt{color:#6b6e7a}.kv dd{font-family:"SFMono-Regular",Consolas,monospace;margin:0}
  </style></head><body><div class="page">
    ${draft ? `<div class="watermark"><span>DRAFT</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="brand">${e(brand.primary)}</div><div class="brand-sub">${e(brand.secondary)}</div><div style="margin-top:14px;font-weight:800">${e(issuer.legalName)}</div><div class="sub">${e(issuer.address || "")}<br>${e(issuer.email || "")}${issuer.phone ? ` · ${e(issuer.phone)}` : ""}</div>${draft ? `<div style="margin-top:10px"><span class="chip">DRAFT · NO NUMBER</span></div>` : ""}</div><div style="text-align:right"><div class="title">Invoice</div><dl class="meta"><dt>Invoice No.</dt><dd>${draft ? "—" : e(snapshot.number?.display || "")}</dd><dt>Issue date</dt><dd>${e(formatDateLabel(snapshot.issueDate, "en-US"))}</dd><dt>Due date</dt><dd>${e(formatDateLabel(snapshot.dueDate, "en-US"))}</dd><dt>Terms</dt><dd>${e(snapshot.terms || "—")}</dd></dl></div></div>
    <div class="rule"></div>
    <div class="cols"><div><div class="label">Bill to</div><div class="name">${e(client.legalName)}</div><div class="sub">${e(client.billingAddress || client.address || "")}${client.phone ? `<br>${e(client.phone)}` : ""}</div></div><div><div class="label">Engagement</div><div class="name" style="font-size:10.5pt">${e(snapshot.projectLabel || "")}</div><div class="sub">Service period: ${e(snapshot.servicePeriodLabel || "—")}<br>PO / reference: ${e(snapshot.purchaseOrder || "—")}</div></div></div>
    <table style="margin-top:18px"><thead><tr><th>Description</th><th class="num" style="width:44px">Qty</th><th style="width:60px;padding-left:10px">Unit</th><th class="num" style="width:84px">Rate</th><th class="num" style="width:94px">Amount</th></tr></thead><tbody>${body}</tbody></table>
    <div class="totalbox"><span class="label" style="color:#b9bccb">Total due</span><span class="v">${e(currency)} ${fmt(snapshot.totalMinor || 0)}</span></div>
    <div class="bottom"><div><div class="label" style="margin-bottom:6px">Payment information</div>${bankRows ? `<dl class="kv">${bankRows}</dl>` : `<div class="sub">Payment details hidden for this draft.</div>`}${snapshot.notes ? `<div class="sub" style="margin-top:10px">${e(snapshot.notes)}</div>` : ""}</div><div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end">${draft ? `<div class="sig-pending">Signature applied on finalize</div>` : `<img style="height:62px" src="${e(signatureDataUri || "")}" alt="Signature">`}<div class="sig-line" style="text-align:right"><strong>${e(issuer.legalName)}</strong><div class="sub">Issuer</div></div></div></div>
    <div class="footer"><span>Issued with SD.Live Documents · ${draft ? "draft" : e(snapshot.number?.display || "")}</span><span>Page 1 of 1</span></div>
  </div></body></html>`;
}
