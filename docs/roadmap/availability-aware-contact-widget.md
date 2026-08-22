# Availability-Aware Contact Widget

**Priority:** Medium-High — sequence after the current active gate closes; above general backlog items such as CRM, calendar and quote automation.

**Status:** Backlog / Proposed — not yet scoped into a numbered phase and not authorized for implementation by this document alone.

## Problem

The site currently shows a single WhatsApp bubble regardless of whether Samuel is actually reachable. Visitors during off-hours, while he is traveling across time zones, or while he is on a flight/at a live event can get no response for hours, with no signal that a delay is expected. This can cost qualified leads, especially because WhatsApp is a dominant contact channel for the Colombian events market.

## Proposed solution — 3-layer availability model

Use one server-side source of truth for whether Samuel is reachable right now. Never infer owner availability from the visitor's browser timezone. The resolved availability decides whether the site shows the existing WhatsApp bubble or a future AI chat widget.

### Layer 1 — Manual override (highest priority)

Short-duration "do not disturb" state for flights, live events and similar periods. Activated through a WhatsApp command sent from Samuel's own verified number to the business WhatsApp number. This is intended to reuse the same webhook infrastructure as the future WhatsApp AI lead-qualification bot if/when that bot is implemented.

Commands:

- `away 2h`
- `away 4h`
- `away tomorrow`
- `back`
- `status`

Every activation must have an explicit `expires_at`; manual away state must never remain indefinite.

**Security requirement:** owner commands are honored only when the sender's WhatsApp number matches `env.OWNER_WHATSAPP_NUMBER` exactly. Every other sender goes through the normal customer-facing flow. This is a hard authorization gate, not a heuristic.

### Layer 2 — Travel mode

A multi-day override with a different timezone, for example while traveling internationally. Set manually with a timezone and end date; automatically falls back to Layer 3 when it expires.

### Layer 3 — Default weekly schedule

Baseline business hours in `America/Bogota` (example: 08:00–20:00) when neither Layer 1 nor Layer 2 is active.

## Data model — D1

Create an availability source of truth in D1, for example a single active row in `availability_state`:

```text
{
  mode: "manual_override" | "travel" | "default",
  timezone: string,
  window_start: string | null,
  window_end: string | null,
  expires_at: string | null,
  reason: string | null
}
```

D1 `availability_state` is the single source of truth for this feature. Do not introduce a second availability state inside a chatbot provider, browser storage or another database.

## API surface

- `GET /api/availability` — read-only response such as `{ available: boolean }`; use a short cache TTL so normal page loads do not require an unnecessary D1 read every time.
- The future WhatsApp webhook handler gets an owner-command branch that runs **before** customer messages are routed to AI qualification logic.

## Frontend

`script.js` reads `/api/availability` and renders either:

- existing WhatsApp bubble when `available: true`, or
- future AI chat widget when `available: false`.

No unrelated site behavior changes as part of this feature.

## Explicit guardrails

- The AI bot must not receive Rental pricing, presets or catalog authority. Its role when active is lead qualification only: event type, date, headcount/basic scope and contact information. Pricing remains backend/GitHub-owned under existing project invariants.
- AI-captured leads must be written into the existing `leads` table used by the web contact flow. Do not create parallel lead storage in a third-party chatbot platform.
- No new pricing/catalog source of truth is introduced.
- `availability_state` in D1 is the single source of truth for owner availability.
- Owner-command authentication must use exact match against `env.OWNER_WHATSAPP_NUMBER` before parsing/acting on `away`, `back` or `status`.
- Expiring states must fail safe: a stale manual/travel override must self-clear into the next lower layer rather than staying active indefinitely.

## Acceptance criteria

- [ ] `availability_state` table created through a migration.
- [ ] `GET /api/availability` resolves the correct value under all three layers.
- [ ] WhatsApp owner-command branch verifies exact `OWNER_WHATSAPP_NUMBER` and rejects owner commands from all other senders.
- [ ] `away`, `back` and `status` tested end-to-end through real WhatsApp before production closeout.
- [ ] Frontend correctly swaps the WhatsApp bubble / AI chat surface from the live availability API.
- [ ] Manual override auto-expires without manual intervention.
- [ ] Travel mode expires and falls back to the default weekly schedule.
- [ ] AI bot never references or invents pricing/catalog data.
- [ ] AI bot leads land in the same `leads` table as web-form leads.
- [ ] Short caching does not create a materially stale availability state after an owner command.

## Non-goals for this feature

- AI-generated quotes or pricing.
- Giving the bot Rental catalog/preset authority.
- A full CRM view of WhatsApp conversations; that remains a separate, lower-priority CRM backlog item.
- Replacing the existing Contact/Rental backend sources of truth.

## Dependencies / sequencing

- Must not interrupt the current active gate.
- Sequence Medium-High immediately after the active gate is closed and explicitly reprioritized, ahead of general CRM/calendar/quote-automation backlog work.
- WhatsApp command transport may reuse future AI-qualification webhook infrastructure, but this item must not assume that integration exists until verified.
- Before implementation, confirm the actual WhatsApp provider/webhook architecture, credential storage, webhook signature/auth model, D1 migration strategy, cache invalidation/TTL and AI-provider privacy/retention terms.
