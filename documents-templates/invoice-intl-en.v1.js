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

function bankRows(details = {}) {
  const rows = [
    ["Bank Name", details.bankName],
    ["Routing Number", details.routingNumber],
    ["Account Type", details.accountType],
    ["Account Number", details.accountNumber],
    ["Bank Address", details.bankAddress],
    ["Beneficiary Address", details.beneficiaryAddress]
  ].filter(([, value]) => value != null && String(value).trim());
  return rows.map(([label, value]) => `<dt>${e(label)}</dt><dd>${e(value)}</dd>`).join("");
}

function lineDateLabel(line) {
  const start = String(line?.serviceDate || "").trim();
  const end = String(line?.serviceDateEnd || "").trim();
  if (start && end && start !== end) return `${formatDateLabel(start, "en-US")} – ${formatDateLabel(end, "en-US")}`;
  return start ? formatDateLabel(start, "en-US") : (end ? formatDateLabel(end, "en-US") : "");
}

function brandBlock(issuer) {
  const raw = String(issuer?.brandLabel || "").trim();
  if (!raw) return "";
  const brand = safeBrand(issuer);
  if (!brand.primary && !brand.secondary && !brand.showLogo) return "";
  return `<div class="brand-block">${brand.showLogo ? `<img class="brand-logo" src="/assets/logos/sd-live-header-normal-symbol.png" alt="">` : ""}${brand.primary ? `<div class="brand">${e(brand.primary)}</div>` : ""}${brand.secondary ? `<div class="brand-sub">${e(brand.secondary)}</div>` : ""}${brand.primary || brand.secondary ? `<div class="brand-rule"></div>` : ""}</div>`;
}

function originalExpenseMeta(line) {
  const currency = String(line?.originalCurrency || "").trim().toUpperCase();
  if (!currency || line?.originalAmountMinor == null) return "";
  const locale = currency === "COP" ? "es-CO" : "en-US";
  const original = `Original expense ${e(currency)} ${formatMoney(line.originalAmountMinor, currency, locale)}`;
  const rate = String(line?.exchangeRate || "").trim();
  const fx = rate ? `FX: 1 USD = ${e(rate)} ${e(currency)}` : "";
  return `<div class="orig mono">${original}${fx ? `<br>${fx}` : ""}</div>`;
}

export function renderInvoice(snapshot, { mode = "draft", signatureDataUri = null } = {}) {
  const draft = mode === "draft";
  const issuer = snapshot.issuer || {};
  const client = snapshot.client || {};
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
      const quantity = Number.isSafeInteger(Number(line.quantity)) && Number(line.quantity) >= 0 ? Number(line.quantity) : 0;
      const effectiveQuantity = quantity > 0 ? quantity : 1;
      const unitMinor = line.unitMinor == null ? Math.round(Number(line.amountMinor || 0) / effectiveQuantity) : Number(line.unitMinor);
      const original = originalExpenseMeta(line);
      const dateLabel = lineDateLabel(line);
      const details = [
        dateLabel ? `Date / period: ${dateLabel}` : "",
        line.poNumber ? `PO / ref: ${line.poNumber}` : "",
        line.reference ? line.reference : ""
      ].filter(Boolean).map((value) => `<div class="sub">${e(value)}</div>`).join("");
      return `<tr><td><span class="kind">${e(KIND_LABELS[line.kind] || "Other")}</span>${e(line.description)}${details}${original}</td><td class="num">${quantity > 0 ? e(quantity) : "—"}</td><td class="sub" style="padding-left:10px">${e(line.unit || "—")}</td><td class="num">${fmt(unitMinor)}</td><td class="num">${fmt(line.amountMinor)}</td></tr>`;
    }).join("");
    body += `<tr class="subtotal"><td colspan="4">Subtotal · ${e(group.title.toLowerCase())}</td><td class="num">${fmt(subtotal)}</td></tr>`;
  }
  const bankVisible = snapshot.showBankDetails !== false;
  const bank = bankVisible ? bankRows(snapshot.bankDetails || {}) : "";
  const paymentText = bankVisible ? "No payment details configured." : "Payment details censored for this document.";
  const invoiceMeta = [
    snapshot.dueDate ? ["Due date", formatDateLabel(snapshot.dueDate, "en-US")] : null,
    snapshot.terms ? ["Terms", snapshot.terms] : null
  ].filter(Boolean);
  const brand = brandBlock(issuer);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Draft invoice</title><style>${draftBaseCss()}
    .page{display:flex;flex-direction:column}.title{font-weight:780;font-size:30pt;letter-spacing:-.01em;line-height:1}.dateline{font-size:8.2pt;font-weight:700;line-height:1.45}.issue-date{margin-top:1px;color:#5f626e}.meta{display:grid;grid-template-columns:max-content max-content;gap:3px 10px;font-size:8.4pt;margin-top:10px;justify-content:end;align-items:baseline}.meta dt{color:#6b6e7a;text-align:right}.meta dd{font-family:var(--font-mono);font-weight:650;margin:0;min-width:108px;text-align:right}.cols{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;margin-top:4px}.name{font-weight:750;font-size:12pt;margin:4px 0 2px}.group td{border-bottom:none;padding:14px 0 2px;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#472eb4;font-weight:800}.subtotal td{font-size:8.2pt;color:#6b6e7a;border-bottom:1px solid #d5d7df}.kind{display:inline-block;font-size:6.6pt;letter-spacing:.08em;text-transform:uppercase;color:#472eb4;background:#f1effb;border-radius:4px;padding:1px 5px;margin-right:7px;font-weight:800;vertical-align:1px}.orig{font-size:7.6pt;color:#6b6e7a;margin-top:2px;line-height:1.45}thead th{line-height:1;vertical-align:bottom}thead th.num{font-family:var(--font-sans)}.totalbox{margin-left:auto;margin-top:18px;width:3.1in;padding:0;display:flex;justify-content:space-between;align-items:baseline;gap:18px}.totalbox .v{font-family:var(--font-mono);font-weight:700;font-size:16pt;color:#15161c}.bottom{display:grid;grid-template-columns:1.2fr 1fr;gap:28px;margin-top:auto;padding-top:30px;font-size:8.2pt}.kv{display:grid;grid-template-columns:1.2fr 1.8fr;gap:3px 12px}.kv dt{color:#6b6e7a}.kv dd{font-family:var(--font-mono);margin:0}.notes{margin-top:10px;padding:9px 11px;border-radius:8px;background:#fafafa;border:1px solid #eceef2}.signature-applied{display:block;height:108px;max-width:250px;object-fit:contain;object-position:right bottom;margin:0 4px -15px 0;position:relative;z-index:2}.footer{margin-top:14px}
    @media print{html,body{width:8.5in;height:11in;min-height:11in;background:#fff!important;padding:0!important}.page{width:8.5in!important;height:11in!important;min-height:11in!important;margin:0!important;box-shadow:none!important;padding:.62in .7in .55in!important}}
  </style></head><body><div class="page">
    ${draft ? `<div class="watermark"><span>DRAFT</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px"><div><div class="dateline">${snapshot.issueCity ? `<div class="issue-city">${e(snapshot.issueCity)}</div>` : ""}${snapshot.issueDate ? `<div class="issue-date">${e(formatDateLabel(snapshot.issueDate, "en-US"))}</div>` : ""}</div>${brand}<div style="margin-top:14px;font-weight:800">${e(issuer.legalName)}</div><div class="sub">${e(issuer.address || "")}<br>${e(issuer.email || "")}${issuer.phone ? ` · ${e(issuer.phone)}` : ""}</div>${draft ? `<div style="margin-top:10px"><span class="chip">DRAFT · NO NUMBER</span></div>` : ""}</div><div style="text-align:right"><div class="title">Invoice</div><dl class="meta"><dt>Invoice No.</dt><dd>${draft ? "—" : e(snapshot.number?.display || "")}</dd>${invoiceMeta.map(([label, value]) => `<dt>${e(label)}</dt><dd>${e(value)}</dd>`).join("")}</dl></div></div>
    <div class="rule"></div>
    <div class="cols"><div><div class="label">Bill to</div><div class="name">${e(client.legalName)}</div><div class="sub">${e(client.billingAddress || client.address || "")}${client.phone ? `<br>${e(client.phone)}` : ""}</div></div><div><div class="label">Engagement</div><div class="name" style="font-size:10.5pt">${e(snapshot.projectLabel || "")}</div><div class="sub">${snapshot.servicePeriodLabel ? `Service period: ${e(snapshot.servicePeriodLabel)}<br>` : ""}${snapshot.purchaseOrder ? `PO / reference: ${e(snapshot.purchaseOrder)}` : ""}</div></div></div>
    <table style="margin-top:18px"><thead><tr><th>Description</th><th class="num" style="width:44px">Qty</th><th style="width:60px;padding-left:10px">Unit</th><th class="num" style="width:84px">Rate</th><th class="num" style="width:94px">Amount</th></tr></thead><tbody>${body}</tbody></table>
    <div class="totalbox"><span class="label">Total due</span><span class="v">${e(currency)} ${fmt(snapshot.totalMinor || 0)}</span></div>
    ${snapshot.notes ? `<div class="notes"><span class="label">Notes</span><div style="margin-top:4px">${e(snapshot.notes)}</div></div>` : ""}
    <div class="bottom"><div><div class="label" style="margin-bottom:6px">Payment information</div>${bank ? `<dl class="kv">${bank}</dl>` : `<div class="sub">${paymentText}</div>`}</div><div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end">${draft ? `<div class="sig-pending">Signature applied on finalize</div>` : `<img class="signature-applied" src="${e(signatureDataUri || "")}" alt="Signature">`}<div class="sig-line" style="text-align:right"><strong>${e(issuer.legalName)}</strong>${issuer.email ? `<div class="sub">${e(issuer.email)}</div>` : ""}</div></div></div>
    <div class="footer"><span>SD•Live Documents${draft ? " · draft" : snapshot.number?.display ? ` · ${e(snapshot.number.display)}` : ""}</span><span>Page 1 of 1</span></div>
  </div></body></html>`;
}
