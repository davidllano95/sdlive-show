const LOGICAL_MEDIA_PREFIX = "assets/media/";
const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) throw new Error("Expected D1 BLOB byte array");
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function resolveSource(source) {
  const value = String(source || "");
  return value.startsWith(LOGICAL_MEDIA_PREFIX)
    ? `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}`
    : value;
}

function cssEscapeAttribute(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function presentationStyle(image, { allowPosition = false } = {}) {
  if (!image || typeof image !== "object") return "";
  const hasExtendedScale = Number.isFinite(Number(image.displayScale));
  const hasPosition = allowPosition && (Number.isFinite(Number(image.positionX)) || Number.isFinite(Number(image.positionY)));
  if (!hasExtendedScale && !hasPosition) return "";
  const scale = clamp(image.displayScale ?? image.scale, 0.5, 2.5, 1);
  const x = allowPosition ? clamp(image.positionX, -100, 100, 0) : 0;
  const y = allowPosition ? clamp(image.positionY, -100, 100, 0) : 0;
  return `scale:${scale};${allowPosition ? `translate:${x}% ${y}%;` : ""}`;
}

function appendStyle(element, style) {
  if (!style) return;
  const current = String(element.getAttribute("style") || "").trim();
  element.setAttribute("style", current ? `${current.replace(/;?$/, ";")}${style}` : style);
}

function addImageHandler(rewriter, selector, image, options = {}) {
  const style = presentationStyle(image, options);
  if (!style) return;
  rewriter.on(selector, { element(element) { appendStyle(element, style); } });
}

function addTrustedHandlers(rewriter, trusted) {
  for (const client of trusted?.clients || []) {
    addImageHandler(rewriter, `.trusted-wrap [data-client="${cssEscapeAttribute(client.id)}"] img.client-logo`, client.logo);
    const reveal = client.reveal;
    if (!reveal?.id) continue;
    for (const item of reveal.items || []) {
      const image = item.type === "collaboration" ? item.image : item;
      if (!image?.src) continue;
      const resolved = resolveSource(image.src);
      addImageHandler(rewriter, `#${reveal.id} img[src="${cssEscapeAttribute(resolved)}"]`, image);
    }
  }
}

export async function readPublishedMediaPresentation(env) {
  const result = await env.CMS_DB.prepare(`
    SELECT section, market, CAST(published_json AS BLOB) AS published_blob
    FROM cms_entries
    WHERE route = 'root'
      AND (
        (market = 'all' AND section IN ('about', 'work', 'trusted', 'testimonials'))
        OR (market = 'col' AND section = 'rental')
      )
  `).all();

  const state = {};
  for (const row of result.results || []) {
    try { state[row.section] = JSON.parse(decodeBlobText(row.published_blob)); }
    catch (error) { console.error(`[SD.Live] Extended media presentation read failed for ${row.section}`, error); }
  }
  return state;
}

export function applyMediaPresentation(response, state = {}) {
  const type = response.headers.get("Content-Type") || "";
  if (!response.ok || !type.includes("text/html")) return response;

  const rewriter = new HTMLRewriter();
  addImageHandler(rewriter, "#about .about-photo img", state.about?.image);

  for (const item of state.work?.items || []) {
    addImageHandler(rewriter, `#work [data-work-id="${cssEscapeAttribute(item.id)}"] img`, item.image);
  }

  for (const item of state.testimonials?.items || []) {
    addImageHandler(rewriter, `#testimonials [data-testimonial-id="${cssEscapeAttribute(item.id)}"] img.testimonial-company-logo`, item.logo);
  }

  addTrustedHandlers(rewriter, state.trusted);

  for (const [id, item] of Object.entries(state.rental?.items || {})) {
    addImageHandler(rewriter, `#rental [data-rental-item="${cssEscapeAttribute(id)}"] img`, item.image, { allowPosition: true });
  }

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set("X-SDLive-Media-Presentation", "v2");
  return new Response(transformed.body, { status: transformed.status, statusText: transformed.statusText, headers });
}
