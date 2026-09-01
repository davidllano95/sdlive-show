# Availability-Aware Contact / AI

**Reconciled:** 2026-09-01 — America/Bogota  
**Availability status:** **CORE v1 CLOSED/PASS**  
**Current Active Gate:** **SD.Live Assistant + Lead Core**

Availability is now a deterministic SD.Live-owned production capability. AI/CRM/WhatsApp automation are consumers or future transports; they are not architectural owners of availability truth.

## Problem

SD.Live should not present the same contact expectation regardless of whether the owner is realistically reachable. The system must communicate a truthful reachability state while preserving a strong human handoff and deterministic fallback paths.

## Current production contract

One SD.Live-owned resolver drives public Availability.

Effective states:

- `available`
- `limited`
- `away`

Public API:

- `GET /api/availability`

Protected Admin API:

- `GET /api/admin/availability`
- `PUT /api/admin/availability`

Admin precedence, highest first:

1. **Backend Force Mode** — `Auto / Force On / Force Off`; top-priority QA/emergency layer; non-Auto expires automatically at the end of the current base-timezone day.
2. **Temporary operational override** — `Auto / Available / Limited / Away`; all non-Auto writes are bounded.
3. **Weekly service schedule** — Monday–Sunday, multiple windows per day, evaluated in the active Availability timezone.
4. **Compatibility default** — before a deliberate schedule save, Auto preserves the pre-Availability Available behavior.

Force Mode is separate D1 state and never rewrites temporary override or weekly schedule state.

## D1 source of truth

Availability remains SD.Live-owned and separate from Finance/REGISTRO/AppSheet.

Canonical state includes:

```text
availability_profile
- default_timezone
- weekly_schedule_json
- updated_at
- actor_email

availability_override_state
- mode
- starts_at
- expires_at
- updated_at
- actor_email

availability_travel_state
- timezone
- starts_at
- expires_at
- updated_at
- actor_email

availability_force_state
- mode
- expires_on
- updated_at
- actor_email

availability_history
- action
- payload_json
- actor_email
- created_at
```

## Owner availability model

### Layer 1 — Temporary operational override

Implemented and production-smoked.

Use for shows, flights, meetings, sleep, focused work or any short period where the weekly schedule is wrong.

Current Admin:

- `Auto / Available / Limited / Away` selection;
- explicit `Apply status` action;
- flexible hours + minutes timer;
- minimum 15 minutes;
- maximum 24 hours;
- all non-Auto states auto-expire;
- timer/status edits remain pending until Apply.

Production smoke verified `0 h / 15 min` for both Limited and Away, including correct expiry and Away `Next service window`. Production was returned to Auto after testing.

### Layer 2 — Travel Mode

Implemented and production-accepted.

- temporary IANA timezone;
- explicit end date;
- automatic fallback after expiry;
- travel itself does **not** mean Away;
- travel changes the clock used to evaluate weekly service windows;
- common timezone selector + `Use device timezone` + manual `Other IANA timezone…`;
- no private itinerary/travel reason is exposed publicly.

Manual entry uses canonical IANA values such as `America/Bogota`, `Europe/Madrid`, `America/New_York`, `Asia/Singapore`, `Australia/Sydney`.

Do not use raw offsets, abbreviations or city/country names alone.

### Layer 3 — Weekly service hours

Implemented.

- base timezone defaults to `America/Bogota` unless changed by canonical profile state;
- Monday–Sunday schedule;
- multiple windows per day;
- days without windows resolve Away once the schedule has been deliberately saved;
- exact business hours are configuration, not an architectural constant.

## Backend Force Mode

Implemented.

- `Auto / Force On / Force Off`;
- highest precedence;
- separate from normal operational override;
- non-Auto expires automatically at base-timezone day-end;
- underlying Temporary Status + Weekly Schedule remain intact.

## Next service window

Implemented and production-accepted.

The deterministic resolver calculates the next human service window from:

- weekly schedule;
- closed days;
- active Travel timezone and Travel expiry;
- current Temporary Status and expiry;
- Force Mode expiry;
- timezone transitions;
- DST behavior.

Public output is privacy-safe. It may expose timing labels but never private event/calendar/travel detail or owner phone information.

## Admin visual contract

The Dashboard Availability and Show Day controls share one compact control language.

Accepted behavior:

- bounded two-card cluster on desktop;
- stacked cards on mobile;
- compact collapsed summaries;
- `Manage availability` / `Manage Show Day` disclosures;
- normalized headings, status pills and chevrons;
- Travel `OFF` pill aligned with the same visual system;
- Weekly Schedule rendered as a compact list inside the narrower card;
- no large legacy `Save weekly schedule` CTA typography.

## Public WhatsApp / Availability UI

The existing floating WhatsApp button remains the only persistent floating CTA.

Current public behavior:

- integrated status tab attached to WhatsApp;
- EN labels `AVAILABLE / LIMITED / AWAY`;
- ES equivalents;
- explanatory bilingual popover;
- language follows page state;
- mobile tap still opens WhatsApp;
- Away may show deterministic next human service timing;
- public output does not expose Travel timezone/location/reason or private event data.

Until AI exists, Away does **not** claim an AI agent is available. WhatsApp remains a leave-message path and Contact/Rental remain deterministic fallbacks.

## Public WhatsApp identity / phone privacy

Hard invariant:

- public pages use WhatsApp username identity;
- owner phone number must not appear in HTML, JavaScript, structured data, visible copy or Availability output;
- if username linking is unavailable, fall back to Contact/Rental rather than exposing a phone number;
- phone details may exist only server-side if required later for authenticated provider/webhook operations.

## Owner WhatsApp commands — parser prepared, transport future

A transport-neutral parser is implemented for future verified-owner control.

Supported command shapes include:

- `away 4h`
- `limited 1h 30m`
- `away until 23:00`
- `disponible 45 min`
- `ausente hasta 23:00`
- `back` / `volver`
- `status` / `estado`

These map to the same canonical temporary override contract.

The real WhatsApp transport is **not live**.

Before enabling it:

- select provider deliberately;
- authenticate owner identity server-side;
- reject unauthenticated senders before parsing;
- keep provider secrets and owner phone data server-side;
- never expose a generic unauthenticated webhook that accepts Availability commands.

## Availability Core v1 acceptance criteria

- [x] D1 defines canonical SD.Live-owned availability state.
- [x] Weekly schedule resolves by timezone/day.
- [x] Weekly schedule supports multiple windows per day.
- [x] Manual overrides require explicit expiry and auto-expire.
- [x] Flexible 15-min–24-h Temporary Status timer exists.
- [x] Temporary mode + timer use explicit `Apply status` semantics.
- [x] `Auto / Force On / Force Off` exists as separate top-priority backend state.
- [x] Travel Mode changes evaluation timezone without forcing Away.
- [x] Travel Mode auto-expires.
- [x] Next human service window is deterministic and privacy-safe.
- [x] `GET /api/availability` is privacy-safe and reflects effective state.
- [x] Public UI consumes the shared Availability API and keeps one WhatsApp CTA.
- [x] EN/ES Availability UI follows page language.
- [x] Public phone privacy is regression-tested.
- [x] Admin Availability and Show Day controls share a compact coherent visual language.
- [x] Production smoke verified 15-minute Limited/Away behavior.

**Availability Core v1 is CLOSED/PASS.**

Do not reopen this gate unless a new production regression appears.

## Current Active Gate — SD.Live Assistant + Lead Core

### Architecture

Preferred first implementation:

`Public site / popup → SD.Live API → optional AI → safe tools → SD.Live-owned Lead Core in D1 → notification → human handoff → optional CRM later`

CRM is not a prerequisite.

### Assistant identity

Name: **SD.Live Assistant**.

The assistant must identify itself as an assistant and must not impersonate Samuel.

### Required v1 behavior

The assistant should:

- work bilingually EN/ES;
- identify `Live / Theatre / Sound Design / Systems / Rental / Other`;
- collect visitor name/contact;
- collect date;
- collect city/location;
- collect venue when relevant;
- collect service/request type;
- collect equipment/schedule details when relevant;
- build a concise grounded summary;
- consult deterministic Availability Core;
- answer from approved service/business information;
- route Contact vs Rental appropriately;
- create a normalized Lead Core record in D1;
- generate a useful human handoff.

### AI hard guardrails

The assistant must not:

- invent or negotiate prices;
- promise availability unless a deterministic backend source confirms it;
- become authoritative for Rental catalog, quantities or availability;
- expose Finance/Admin data;
- invent credits, capabilities or policies;
- retain the only copy of lead/transcript data inside a vendor;
- block Contact/Rental/WhatsApp when an AI/provider fails.

**AI on demand, not AI by default.** Availability itself consumes no AI tokens.

## Lead ownership

Preferred source of truth:

`SD.Live Lead API → D1 lead store`

Lead Core should own normalized lead state before any optional CRM integration.

A later CRM such as Attio may receive normalized leads, but must not become the only copy of lead/transcript truth.

## Human handoff

A useful handoff should include:

- visitor name/contact;
- language;
- source page/market;
- service/request type;
- date/location;
- venue/equipment/schedule where relevant;
- concise grounded summary;
- urgency only when derived from explicit visitor information;
- direct context to continue the conversation.

## Preferred initial stack

- Cloudflare
- D1
- Resend
- OpenAI API

Dapta, Attio/CRM and deeper WhatsApp provider automation remain optional/later.

## Optional later inputs

Compatible extensions, not current ownership changes:

- Show Day awareness as a coarse limited-response hint;
- privacy-safe Calendar busy assist;
- lead follow-up timer;
- client availability link;
- market/channel routing;
- status history/analytics;
- verified-owner WhatsApp command transport.

## Runtime history

Availability foundation and public behavior:

- **PR #159:** public WhatsApp username identity.
- **PR #160:** Availability Core v1 + bilingual public status.
- **PR #161/#162:** mobile glow + cache-bust polish.
- **PR #163:** semantic Availability colors.
- **PR #164:** persistent integrated status tab attached to WhatsApp.
- **PR #165:** weekly service hours + Backend Force Mode.
- **PR #166:** Admin dashboard routing fix.
- **PR #167:** Availability Admin visual parity.
- **PR #168:** early Availability docs reconciliation.

Travel + next-window:

- **PR #169:** Travel Mode controls.
- **PR #170:** mobile timezone UX.
- **PR #171:** Travel Mode timezone docs — docs-only.
- **PR #172:** deterministic next service window.
- **PR #173:** Force Mode expiry date display fix.

Admin compact/polish:

- **PR #174:** compact Availability Admin card.
- **PR #176:** compact Availability + Show Day control cluster.
- **PR #177:** visual polish including Weekly Schedule.
- **PR #178:** final status/chevron/typography parity.

Flexible Temporary Status:

- **PR #179:** flexible timer + owner command parser core.
- **PR #180:** timer canonical-duration sync fix.
- **PR #181:** explicit `Apply status` semantics.

Latest closeout checkpoint:

`docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`

## Exact continuation

1. Availability Core v1 remains CLOSED/PASS.
2. Begin **SD.Live Assistant + Lead Core** with D1 Lead schema + safe tool contract.
3. Define the first public Assistant entry point without displacing Contact/Rental/WhatsApp fallbacks.
4. Connect Availability as a deterministic tool, not AI-owned truth.
5. Add Resend notification/handoff after Lead Core exists.
6. Keep CRM/Attio, Dapta and verified-owner WhatsApp transport optional/later.
