import test from "node:test";
import assert from "node:assert/strict";

import {
  handleLeadAdminApi,
  normalizeLeadAdminRow
} from "../lead-admin-api.js";

function request(path = "/api/admin/leads", method = "GET") {
  return new Request(`https://sdlive.show${path}`, { method });
}

test("normalizes Lead Core rows for the Admin workspace", () => {
  const lead = normalizeLeadAdminRow({
    id: 42,
    type: "rental",
    source: "rental",
    status: "new",
    service_category: "rental",
    name: "Client",
    email: "client@example.com",
    message: "Need a console",
    language: "es",
    market: "colombia",
    preferred_contact_channel: "email",
    project_date: "2026-10-10",
    project_city: "Bogotá",
    project_venue: "Venue",
    details_json: JSON.stringify({ items: { wing: 1 } }),
    source_url: "https://sdlive.show/es-co/",
    updated_at: "2026-09-01 17:00:00"
  });

  assert.equal(lead.id, 42);
  assert.equal(lead.source, "rental");
  assert.equal(lead.serviceCategory, "rental");
  assert.equal(lead.project.city, "Bogotá");
  assert.deepEqual(lead.details, { items: { wing: 1 } });
  assert.equal(lead.attribution.sourceUrl, "https://sdlive.show/es-co/");
});

test("malformed details JSON fails safely to an empty object", () => {
  const lead = normalizeLeadAdminRow({
    id: 1,
    type: "contact",
    details_json: "{broken"
  });

  assert.deepEqual(lead.details, {});
  assert.equal(lead.source, "contact");
  assert.equal(lead.status, "new");
});

test("Lead Admin API ignores unrelated routes", async () => {
  const response = await handleLeadAdminApi(
    request("/api/admin/other"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );

  assert.equal(response, null);
});

test("Lead Admin API is GET-only", async () => {
  const response = await handleLeadAdminApi(
    request("/api/admin/leads", "POST"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Method not allowed"
  });
});

test("Lead Admin API requires an authenticated Admin", async () => {
  const response = await handleLeadAdminApi(
    request(),
    {},
    { verifyAdmin: async () => null }
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).ok, false);
});

test("Lead Admin API returns a read-only payload and clamps the requested limit", async () => {
  let receivedLimit = null;
  const response = await handleLeadAdminApi(
    request("/api/admin/leads?limit=999"),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      listLeads: async (_env, options) => {
        receivedLimit = options.limit;
        return [{ id: 7, source: "contact", status: "new" }];
      }
    }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(receivedLimit, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.readOnly, true);
  assert.equal(payload.actor, "sam@sdlive.show");
  assert.equal(payload.count, 1);
  assert.equal(payload.leads[0].id, 7);
});
