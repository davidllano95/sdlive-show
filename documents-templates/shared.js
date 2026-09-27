export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function formatMoney(minor, currency, locale = "en-US") {
  const value = Number(minor) / 100;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDateLabel(value, locale = "en-US") {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
  const [year, month, day] = raw.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function draftBaseCss() {
  return `
    @page{size:Letter;margin:0}
    :root{--font-sans:Arial,sans-serif;--font-mono:Consolas,monospace}
    *{box-sizing:border-box}
    html,body{margin:0;background:#eef0f5;color:#16171d;font-family:var(--font-sans)}
    body{padding:18px}
    .page{width:8.5in;min-height:11in;margin:0 auto;background:#fff;padding:.62in .7in .55in;position:relative;overflow:hidden;box-shadow:0 12px 42px rgba(20,20,30,.12);font-size:9.6pt;line-height:1.45}
    .mono{font-family:var(--font-mono)}
    .label{font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#6b6e7a;font-weight:700}
    .brand{font-weight:760;font-size:11pt;letter-spacing:.02em}.brand-dot{color:#472eb4}
    .brand-sub{font-size:7.2pt;color:#6b6e7a;letter-spacing:.05em;margin-top:2px}
    .brand-block{margin-top:10px;width:max-content;max-width:220px}.brand-logo{display:block;max-width:42px;max-height:28px;object-fit:contain;margin-bottom:6px}.brand-rule{height:1px;background:#16171d;margin-top:6px;width:100%;min-width:92px}
    .rule{height:1px;background:#e3e4ea;margin:14px 0}
    .chip{display:inline-block;font-size:7pt;font-weight:800;letter-spacing:.11em;padding:3px 8px;border-radius:999px;background:#fff1ec;color:#c2410c;border:1px solid #fed7c7}
    .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
    .watermark span{font-size:100pt;font-weight:800;color:rgba(194,65,12,.065);transform:rotate(-28deg);letter-spacing:.06em}
    .page>*:not(.watermark){position:relative;z-index:1}
    table{width:100%;border-collapse:collapse}th{font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:#6b6e7a;font-weight:700;text-align:left;padding:0 0 7px;border-bottom:1px solid #15161c}td{padding:8px 0;border-bottom:1px solid #eceef2;vertical-align:top}.num{text-align:right;white-space:nowrap;font-family:var(--font-mono)}.sub{font-size:8pt;color:#6b6e7a}.footer{margin-top:auto;padding-top:10px;border-top:1px solid #eceef2;display:flex;justify-content:space-between;font-size:7pt;color:#8a8d98}.sig-pending{height:62px;width:190px;border:1px dashed #c9cbd4;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:7.4pt;color:#8a8d98;margin-bottom:4px}.sig-line{width:260px;border-top:1px solid #15161c;padding-top:6px}
    @media(max-width:900px){body{padding:0;background:#fff}.page{width:100%;min-height:0;box-shadow:none;padding:28px 24px}}
  `;
}

function withLogoFlag(brand, showLogo) {
  Object.defineProperty(brand, "showLogo", { value: showLogo, enumerable: false });
  return brand;
}

export function safeBrand(issuer) {
  const original = String(issuer?.brandLabel || "").trim();
  const showLogo = original.includes("[[logo]]");
  const raw = original.replaceAll("[[logo]]", "").trim();
  if (raw === "[[none]]") return withLogoFlag({ primary: "", secondary: "" }, showLogo);
  if (!raw) return withLogoFlag({ primary: "SD.Live", secondary: "Creative Audio" }, showLogo);

  const [first, ...rest] = raw.split("·").map((part) => part.trim()).filter(Boolean);
  const standardBrand = first === "SD.Live" || first === "SD•Live";
  return withLogoFlag({
    primary: standardBrand ? "SD•Live" : (first || ""),
    secondary: standardBrand && !rest.length ? "Creative Audio" : rest.join(" · ")
  }, showLogo);
}
