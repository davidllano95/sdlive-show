import { normalizeLeadCoreInput } from "./lead-core.js";

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;
}

function publicLeadSource(path) {
  if (path === "/api/contact") return "contact";
  if (path === "/api/rental") return "rental";
  return null;
}

function buildLeadCoreInput(body, source) {
  const rental = source === "rental";

  return {
    source,
    status: "new",
    serviceCategory: rental ? "rental" : "other",
    language: body?.language,
    market: body?.market,
    name: body?.name,
    contact: {
      email: body?.email,
      preferredChannel: "email"
    },
    project: rental
      ? {
          date: body?.eventDate,
          venue: body?.venue
        }
      : {},
    summary: rental ? body?.notes : body?.message,
    details: rental
      ? {
          eventType: body?.eventType ?? null,
          rentalDays: body?.rentalDays ?? null,
          attendees: body?.attendees ?? null,
          items: body?.items ?? {},
          services: body?.services ?? {}
        }
      : {},
    attribution: {
      sourceUrl: body?.sourceUrl,
      referrer: body?.referrer,
      utmSource: body?.utmSource,
      utmMedium: body?.utmMedium,
      utmCampaign: body?.utmCampaign
    }
  };
}

function applyCanonicalFields(body, lead) {
  const nextBody = {
    ...body,
    name: lead.name,
    email: lead.contact.email || "",
    language: lead.language,
    market: lead.market,
    sourceUrl: lead.attribution.sourceUrl || "",
    referrer: lead.attribution.referrer || "",
    utmSource: lead.attribution.utmSource || "",
    utmMedium: lead.attribution.utmMedium || "",
    utmCampaign: lead.attribution.utmCampaign || ""
  };

  if (lead.source === "rental") {
    nextBody.notes = lead.summary || "";
    nextBody.eventDate = lead.project.date || "";
    nextBody.venue = lead.project.venue || "";
  } else {
    nextBody.message = lead.summary || "";
  }

  return nextBody;
}

/**
 * Normalize valid Contact/Rental public payloads through the canonical Lead
 * Core contract before the existing form handlers run.
 *
 * This layer intentionally fails open to the existing handlers for malformed
 * payloads so their established validation/status/error contract remains the
 * public source of truth during the compatibility migration.
 */
export async function canonicalizePublicLeadRequest(request) {
  if (request.method !== "POST") return request;

  const source = publicLeadSource(normalizedPath(request));
  if (!source) return request;

  const contentType = String(
    request.headers.get("content-type") || ""
  ).toLowerCase();

  if (!contentType.includes("application/json")) {
    return request;
  }

  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return request;
  }

  let lead;

  try {
    lead = normalizeLeadCoreInput(
      buildLeadCoreInput(body, source)
    );
  } catch {
    return request;
  }

  const canonicalBody = applyCanonicalFields(body, lead);

  return new Request(request, {
    body: JSON.stringify(canonicalBody)
  });
}
