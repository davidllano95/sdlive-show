# Availability-Aware Contact / AI

**Reconciled:** 2026-08-31 — America/Bogota
**Status:** **ELIGIBLE ROADMAP CANDIDATE — NOT ACTIVE**

The stabilization prerequisites that previously blocked this feature are now closed. This module may be deliberately selected next, but documentation alone does not activate runtime work.

## Problem

SD.Live currently offers the same contact surface regardless of whether the owner is realistically reachable. A visitor may write during sleep hours, an event, a flight or international travel and receive no immediate context. The goal is not to pretend the business is staffed 24/7; it is to give the visitor an accurate path at any time while preserving a strong human handoff.

## Core idea

Use one SD.Live-owned availability decision to choose the contact experience:

- **human reachable:** prioritize the normal WhatsApp path;
- **human unavailable:** offer an AI assistant that can answer approved general questions, qualify the lead, capture contact/scope and set an expectation for human follow-up;
- **always:** preserve Contact/Rental forms as deterministic fallbacks.

The AI provider must never become the source of truth for owner availability.

## 3-layer availability model

### Layer 1 — expiring manual override (highest priority)

For a show, flight, meeting, sleep, focused work or any short period where a normal weekly schedule is wrong.

Desired owner commands through the verified business WhatsApp transport:

- `away 2h`
- `away 4h`
- `away until 23:00`
- `away tomorrow`
- `back`
- `status`

Every away command must resolve to an explicit `expires_at`. Indefinite away state is not allowed.

**Authorization:** commands are accepted only when the sender exactly matches `env.OWNER_WHATSAPP_NUMBER` (or a later equally explicit authenticated owner identity). Other senders always enter the customer flow.

### Layer 2 — travel mode

For multi-day travel with a temporary timezone and end date. Travel mode owns its timezone only for availability resolution and automatically falls back when it expires.

Example conceptual state:

`Travel · Europe/Madrid · through 2026-09-21`

This avoids treating Bogotá business hours as if the owner were physically in Bogotá while traveling.

### Layer 3 — default weekly service hours

Baseline weekly schedule, initially evaluated in `America/Bogota` unless travel mode is active.

The exact hours are **business configuration**, not a hard-coded architectural invariant. Example only: 08:00–20:00.

A later Admin UI should allow controlled editing of:

- days enabled;
- start/end per day;
- timezone for the default schedule;
- optional short labels such as `Available`, `Limited response`, `AI assistant only`.

## D1 source of truth

Availability should remain SD.Live-owned. A reasonable model is:

```text
availability_profile
- default_timezone
- weekly_schedule_json
- updated_at

availability_override
- mode: manual_override | travel
- timezone
- starts_at
- expires_at
- reason
- created_by
- created_at
```

The resolver computes the effective current state. An expired override is ignored automatically rather than requiring cleanup before the site becomes available again.

Do not duplicate this state in Dapta, Attio, browser storage or another chatbot vendor.

## API surface

Candidate owned endpoints:

- `GET /api/availability` — public minimal status; no private reason/details required;
- authenticated Admin endpoints for weekly schedule / travel mode if a UI is added;
- WhatsApp owner-command branch before customer AI routing.

A public response could evolve beyond a boolean while staying privacy-safe:

```json
{
  "available": false,
  "mode": "ai_assist",
  "message": "AI assistant available now. Human follow-up during the next service window."
}
```

Do not expose travel itinerary, event names or private reasons publicly.

### Public WhatsApp identity / phone privacy

- Public pages use the WhatsApp username as the contact identity and direct-link target; they must not embed the owner phone number in HTML, JavaScript, structured data or visible copy.
- If WhatsApp username linking is unavailable for a visitor, fall back to Contact/Rental rather than exposing the phone number.
- A phone number may exist only in server-side configuration when required for authenticated WhatsApp provider/webhook operations. It is not a public Availability field.
- Availability changes CTA priority/status; it never changes this privacy boundary.

## Frontend behavior

The site should use the same resolved state across all public contact surfaces rather than implementing separate clocks in each page.

### Reachable

- WhatsApp remains the primary quick-contact CTA;
- optional small status copy such as `Available now` only if it improves conversion without creating a support-SLA promise.

### Unavailable

- AI assistant becomes the prominent immediate-response option;
- WhatsApp may remain available as a secondary `Leave a message` path rather than disappearing completely;
- Contact/Rental forms remain available;
- the UI should communicate an expectation, not a fake live-agent state.

## AI assistant contract

The assistant may:

- answer approved FAQ/service questions;
- work bilingually EN/ES;
- identify whether the request is Live / Theatre / Sound Design / Post / Systems / Rental / other;
- collect event/project date, city/location, approximate scope, audience/headcount when relevant, contact details and preferred follow-up;
- route to Contact vs Rental;
- create/update a lead through an SD.Live-owned validation endpoint;
- summarize the conversation for human follow-up.

The assistant must not:

- invent or negotiate prices;
- become authoritative for Rental catalog, quantities or availability;
- expose Finance/Admin data;
- promise a booking or availability unless a deterministic backend source explicitly confirms it;
- invent portfolio credits, capabilities or policies;
- retain the only copy of lead/transcript data inside a vendor.

## Lead ownership

AI-captured leads should enter the same SD.Live lead lifecycle as web-form leads. The provider may transport conversation data, but final normalized lead data should pass through an SD.Live-owned endpoint.

A later CRM may own relationship/pipeline state only after that contract is deliberately approved.

## Human handoff

A useful handoff should include:

- visitor name/contact;
- language;
- source page/market;
- service/request type;
- date/location;
- concise AI-generated summary grounded in the actual conversation;
- urgency signal only when derived from explicit visitor information;
- direct link/context to continue the conversation.

The assistant should say when it is handing off rather than pretending the AI and human are the same agent.

## Optional phase-2 ideas — not required for MVP

These are compatible extensions, not current commitments:

- **Next service window:** `Human follow-up from 08:00 America/Bogota` without revealing personal calendar detail.
- **Show Day awareness:** Site Schedule may inform a generic `limited response while on show` state, but should not automatically expose event/client details and should not override a manual owner decision without an explicit precedence rule.
- **Calendar busy assist:** Google Calendar could later contribute a coarse `busy` hint, but only after deciding which calendars/events are safe to consider; it must never publish private meeting content.
- **Lead follow-up timer:** if an AI-qualified lead has not received human follow-up by a defined threshold, surface it in Admin/CRM or send an internal reminder.
- **Client availability link:** a controlled public link could show selectable callback/meeting windows without exposing the private operational calendar.
- **Channel routing:** Colombia may prefer WhatsApp; international visitors may prefer email/web chat. Market can influence CTA ordering without changing availability truth.
- **Status history/analytics:** measure qualified leads, handoff rate, response delay and conversion by available/unavailable state without turning availability into employee surveillance.

## Acceptance criteria for an MVP

- [ ] D1 migration defines one canonical availability model.
- [ ] Weekly schedule resolves correctly by timezone/day.
- [ ] Manual overrides require explicit expiry and auto-expire.
- [ ] Travel mode expires and falls back correctly.
- [ ] `GET /api/availability` is privacy-safe and reflects effective state.
- [ ] Owner WhatsApp commands are authenticated by exact owner identity before parsing.
- [ ] Public UI follows the same availability API on all relevant route families.
- [ ] Human-reachable and unavailable/AI states have clear Contact/Rental fallbacks.
- [ ] AI cannot invent price/catalog/availability/portfolio facts.
- [ ] AI receives no Finance/Control Center data.
- [ ] AI-qualified leads pass through an SD.Live-owned validation/storage boundary.
- [ ] Human handoff is tested end-to-end in EN and ES.
- [ ] Consent/privacy/script-loading behavior is reviewed before a third-party chat embed loads.
- [ ] Provider outage fails to Contact/Rental/WhatsApp rather than blocking lead capture.

## Provider dependency

Dapta.ai is a documented candidate, not an architectural requirement. Before selecting a provider, re-check current pricing, API/webhook behavior, WhatsApp transport, privacy/retention, transcript export/deletion, mobile performance, accessibility and human handoff quality.

The preferred architecture remains provider-portable:

`Public site / WhatsApp → SD.Live Worker/API boundary → optional AI provider → SD.Live lead/handoff boundary`

## Sequencing

All previous stabilization prerequisites are satisfied. To promote this module:

1. choose it explicitly as the next Active Gate;
2. verify actual WhatsApp provider/webhook architecture;
3. decide MVP weekly schedule + override data model;
4. decide whether AI is web-only first or web + WhatsApp in the same phase;
5. re-evaluate provider cost/privacy/quality;
6. implement availability truth before allowing AI to depend on it;
7. production-smoke owner override, reachable/unavailable UI and one real lead handoff.
