import test from "node:test";
import assert from "node:assert/strict";

import {
  handleLeadAdminApi,
  normalizeLeadAdminRow,
  normalizeLeadStatus,
  normalizeLeadStatusEvent
} from "../lead-admin-api.js";

function request(path = "/api/admin/leads", method = "GET", body = null) {
  return new Request(`https://sdlive.show${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
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
  assert.deepEqual(lead.statusHistory, []);
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

test("lead status normalizer only accepts the pipeline status set", () => {
  assert.equal(normalizeLeadStatus(" Contacted "), "contacted");
  assert.equal(normalizeLeadStatus("quoted"), "quoted");
  assert.equal(normalizeLeadStatus("archived"), null);
  assert.equal(normalizeLeadStatus(""), null);
});

test("normalizes auditable lead status events", () => {
  const event = normalizeLeadStatusEvent({
    id: 9,
    lead_id: 25,
    from_status: "new",
    to_status: "contacted",
    actor_email: "sam@sdlive.show",
    created_at: "2026-09-01 21:00:00"
  });

  assert.deepEqual(event, {
    id: 9,
    leadId: 25,
    fromStatus: "new",
    toStatus: "contacted",
    actorEmail: "sam@sdlive.show",
    createdAt: "2026-09-01 21:00:00"
  });
});

test("Lead Admin API ignores unrelated routes", async () => {
  const response = await handleLeadAdminApi(
    request("/api/admin/other"),
    {},
    { verifyAdmin: async () => ({ email: "sam@sdlive.show" }) }
  );

  assert.equal(response, null);
});

test("Lead Admin API rejects unsupported methods", async () => {
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

test("Lead Admin API returns operational capabilities and clamps the requested limit", async () => {
  let receivedLimit = null;
  const response = await handleLeadAdminApi(
    request("/api/admin/leads?limit=999"),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      listLeads: async (_env, options) => {
        receivedLimit = options.limit;
        return [{
          id: 7,
          source: "contact",
          status: "new",
          statusHistory: [{
            id: 1,
            leadId: 7,
            fromStatus: "contacted",
            toStatus: "new"
          }]
        }];
      }
    }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(receivedLimit, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.readOnly, false);
  assert.equal(payload.capabilities.updateStatus, true);
  assert.equal(payload.capabilities.statusHistory, true);
  assert.equal(payload.actor, "sam@sdlive.show");
  assert.equal(payload.count, 1);
  assert.equal(payload.leads[0].id, 7);
  assert.equal(payload.leads[0].statusHistory.length, 1);
});

test("Lead Admin API applies authenticated status updates", async () => {
  let received = null;
  const response = await handleLeadAdminApi(
    request("/api/admin/leads", "PATCH", {
      leadId: 25,
      status: "contacted"
    }),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      updateStatus: async (_env, input) => {
        received = input;
        return {
          found: true,
          changed: true,
          leadId: 25,
          previousStatus: "new",
          status: "contacted"
        };
      }
    }
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(received, {
    leadId: 25,
    status: "contacted",
    actorEmail: "sam@sdlive.show"
  });
  assert.equal(payload.ok, true);
  assert.equal(payload.changed, true);
  assert.equal(payload.previousStatus, "new");
  assert.equal(payload.status, "contacted");
});

test("Lead Admin API rejects invalid status writes before storage", async () => {
  let called = false;
  const response = await handleLeadAdminApi(
    request("/api/admin/leads", "PATCH", {
      leadId: 25,
      status: "deleted"
    }),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      updateStatus: async () => {
        called = true;
      }
    }
  );

  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.equal((await response.json()).ok, false);
});

test("Lead Admin API returns 404 for a missing lead status target", async () => {
  const response = await handleLeadAdminApi(
    request("/api/admin/leads", "PATCH", {
      leadId: 999,
      status: "lost"
    }),
    {},
    {
      verifyAdmin: async () => ({ email: "sam@sdlive.show" }),
      updateStatus: async () => ({ found: false, changed: false, leadId: 999 })
    }
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "Lead not found");
});
