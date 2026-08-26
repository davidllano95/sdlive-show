function safeInlineJson(value) {
  return JSON.stringify(value ?? {}).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

export function applyRentalPresentationRuntime(response, rental) {
  const type = response.headers.get("Content-Type") || "";
  if (!response.ok || !type.includes("text/html") || !rental) return response;

  const state = safeInlineJson(rental);
  const transformed = new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append('<link rel="stylesheet" href="/rental-presentation.css?v=20260825-1" data-sdlive-rental-presentation/>', { html: true });
      }
    })
    .on('script[src*="script.js"]', {
      element(element) {
        element.before(
          `<script>window.__SDLiveRentalPresentation=${state};</script><script src="/rental-presentation-runtime.js?v=20260825-1"></script>`,
          { html: true }
        );
      }
    })
    .transform(response);

  const headers = new Headers(transformed.headers);
  headers.set("X-SDLive-Rental-Presentation", "v2");
  return new Response(transformed.body, { status: transformed.status, statusText: transformed.statusText, headers });
}
