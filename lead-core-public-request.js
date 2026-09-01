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

async function parsePublicLeadRequest(request) {
  if (request.method !== "POST") return null;

  const source = publicLeadSource(normalizedPath(request));
  if (!source) return null;

  const contentType = String(
    request.headers.get("content-type") || ""
  ).toLowerCase();

  if (!contentType.includes("application/json")) {
    return null;
  }

  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  try {
    return {
      body,
      lead: normalizeLeadCoreInput(
        buildLeadCoreInput(body, source)
      )
    };
  } catch {
    return null;
  }
}

/**
 * Prepare a valid public Contact/Rental request and retain its canonical Lead
 * Core object for post-write storage enrichment.
 *
 * Invalid payloads deliberately fall through unchanged so the established
 * public handlers remain authoritative for validation and error responses.
 */
export async function preparePublicLeadRequest(request) {
  const parsed = await parsePublicLeadRequest(request);
  if (!parsed) {
    return {
      request,
      lead: null
    };
  }

  const canonicalBody = applyCanonicalFields(
    parsed.body,
    parsed.lead
  );

  return {
    request: new Request(request, {
      body: JSON.stringify(canonicalBody)
    }),
    lead: parsed.lead
  };
}

/**
 * Backward-compatible request-only API used by the previous compatibility
 * slice and its tests.
 */
export async function canonicalizePublicLeadRequest(request) {
  const prepared = await preparePublicLeadRequest(request);
  return prepared.request;
}
