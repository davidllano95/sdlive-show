# Availability-Aware Contact / AI

**Reconciled:** 2026-09-01 — America/Bogota  
**Status:** **ACTIVE GATE — AVAILABILITY CORE OPERATIONAL; CONTINUATION IN PROGRESS**

Availability is no longer only a roadmap candidate. The deterministic SD.Live-owned core is in production and has passed representative public/Admin smoke checks. AI/CRM are still future layers and are not architectural owners of availability truth.

## Problem

SD.Live should not present the same contact expectation regardless of whether the owner is realistically reachable. The goal is not to pretend the business is staffed 24/7; it is to give the visitor an accurate path at any time while preserving a strong human handoff.

## Current production contract

One SD.Live-owned resolver now drives the public Availability state.

Effective states:

- `available`
- `limited`
- `away`

Public API:

- `GET /api/availability`

Protected Admin API:

- `GET /api/admin/availability`
- `PUT /api/admin/availability`

Current Admin precedence, highest first:

1. **Backend Force Mode** — `Auto / Force On / Force Off`; top-priority QA/emergency layer; non-Auto mode expires automatically after the current base-timezone day.
2. **Temporary operational override** — `Auto / Available / Limited / Away`; all non-Auto writes require explicit bounded expiry.
3. **Weekly service schedule** — Monday–Sunday, multiple windows per day, evaluated in the active availability timezone.
4. **Compatibility default** — before a deliberate schedule save, Auto preserves the pre-Availability Available behavior.

Force Mode is separate D1 state and never rewrites temporary override or weekly schedule state.

## D1 source of truth

Availability remains SD.Live-owned and separate from Finance/REGISTRO/AppSheet.

Current D1 model includes:

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

Travel data exists in the resolver-compatible model, but Travel Mode Admin/API writes are not implemented yet.

## 3-layer owner availability model

### Layer 1 — expiring manual override

For a show, flight, meeting, sleep, focused work or any short period where the weekly schedule is wrong.

Current Admin implements explicit temporary states with bounded duration. Future verified-owner WhatsApp commands may provide another authenticated transport for the same underlying state:

- `away 2h`
- `away 4h`
- `away until 23:00`
- `away tomorrow`
- `back`
- `status`

Indefinite away state is not allowed.

Owner-command authorization must remain server-side and accept only an explicitly authenticated owner identity. Public browser code must never expose the owner phone number.

### Layer 2 — travel mode

Travel Mode is the next runtime slice.

Intended contract:

- temporary timezone;
- explicit start/end or end date;
- automatic fallback after expiry;
- travel itself does **not** mean Away;
- travel changes the clock used to evaluate weekly service windows.

Conceptual state:

`Travel · Europe/Madrid · through 2026-09-21`

No private itinerary or travel reason is exposed publicly.

### Layer 3 — default weekly service hours

This layer is now implemented in Admin.

- base timezone currently defaults to `America/Bogota`;
- Monday–Sunday schedule;
- up to multiple service windows per day;
- days without configured windows resolve Away once the schedule has been deliberately saved;
- exact hours remain business configuration, not an architectural constant.

## Public WhatsApp / Availability UI

The existing floating WhatsApp button remains the only persistent floating CTA.

Current public behavior:

- integrated status tab attached to the WhatsApp control;
- EN labels: `AVAILABLE / LIMITED / AWAY`;
- ES equivalents;
- explanatory bilingual popover;
- language follows the page EN/ES state;
- mobile tap still opens WhatsApp;
- status refreshes do not create a second CTA;
- public status does not expose private travel/event details.

Until AI exists, Away does **not** claim that an AI agent is available. WhatsApp remains a leave-message path and Contact/Rental remain deterministic fallbacks.

## Public WhatsApp identity / phone privacy

This is a hard invariant:

- Public pages use the WhatsApp username as the direct-link identity and must not embed the owner phone number in HTML, JavaScript, structured data or visible copy.
- Availability output must not expose the owner phone number either.
- If username linking is unavailable, fall back to Contact/Rental rather than exposing a phone number.
- Phone number may exist only server-side if later required for authenticated provider/webhook operations.

The earlier SEO-edge regression that could reintroduce a numeric `wa.me` link was fixed and regression-tested.

## Next service window

Not implemented yet.

The next deterministic enhancement should calculate a privacy-safe next human service window from:

- weekly schedule;
- active travel timezone;
- current temporary/force state and expiry.

Future public output may expose a coarse value such as `nextHumanWindow` or equivalent timing, but must never expose private calendar/event details.

## AI assistant contract — future layer

Once Availability and next-window behavior are deterministic, an optional `SD.Live Assistant` may be added.

The assistant may:

- answer approved FAQ/service questions;
- work bilingually EN/ES;
- identify Live / Theatre / Sound Design / Post / Systems / Rental / other;
- collect event/project date, city/location, approximate scope, audience/headcount when relevant, contact details and preferred follow-up;
- route Contact vs Rental;
- create/update a lead through an SD.Live-owned validation endpoint;
- summarize the conversation for human follow-up.

The assistant must not:

- invent or negotiate prices;
- become authoritative for Rental catalog, quantities or availability;
- expose Finance/Admin data;
- promise a booking or availability unless a deterministic backend source explicitly confirms it;
- invent portfolio credits, capabilities or policies;
- retain the only copy of lead/transcript data inside a vendor.

**AI on demand, not AI by default.** Availability state itself consumes no AI tokens.

## Lead ownership — future layer

CRM is not a prerequisite.

Preferred first implementation:

`Contact / Rental / AI → SD.Live Lead API → D1 lead store → notification/handoff`

A later CRM such as Attio may receive normalized leads after that boundary is stable, but must not become the only source of lead/transcript truth.

## Human handoff

A useful handoff should include:

- visitor name/contact;
- language;
- source page/market;
- service/request type;
- date/location;
- concise AI-generated summary grounded in the actual conversation;
- urgency only when derived from explicit visitor information;
- direct context to continue the conversation.

The assistant must identify itself as `SD.Live Assistant` and must not impersonate the human owner.

## Optional later inputs

Compatible extensions, not current ownership changes:

- **Show Day awareness:** may later contribute a generic limited-response hint, but must not expose event/client detail and must respect explicit Availability precedence.
- **Calendar busy assist:** may later provide only a coarse busy hint after deciding which calendars/events are safe; private meeting content must never be published.
- **Lead follow-up timer.**
- **Client availability link.**
- **Market/channel routing.**
- **Status history/analytics.**

## Acceptance criteria

### Availability Core — completed/current

- [x] D1 defines canonical SD.Live-owned availability state.
- [x] Weekly schedule resolves by timezone/day.
- [x] Weekly schedule supports multiple windows per day.
- [x] Manual overrides require explicit expiry and auto-expire.
- [x] `Auto / Force On / Force Off` exists as separate top-priority backend state.
- [x] `GET /api/availability` is privacy-safe and reflects effective state.
- [x] Public UI consumes the shared Availability API and keeps one WhatsApp CTA.
- [x] EN/ES Availability UI follows page language.
- [x] Public phone privacy is regression-tested across HTML/JS/edge templates.
- [x] Admin Availability visual language matches the established Live Mode control family.

### Active continuation

- [ ] Travel Mode Admin/API writes are implemented and auto-expire.
- [ ] Travel changes schedule-evaluation timezone without forcing Away.
- [ ] Next human service window is calculated deterministically and privacy-safely.

### AI / Lead layer — later

- [ ] Owner WhatsApp commands are authenticated before parsing, if that transport is implemented.
- [ ] AI cannot invent price/catalog/availability/portfolio facts.
- [ ] AI receives no Finance/Control Center data.
- [ ] AI-qualified leads pass through an SD.Live-owned validation/storage boundary.
- [ ] Human handoff is tested end-to-end in EN and ES.
- [ ] Consent/privacy/script-loading behavior is reviewed before any third-party embed loads.
- [ ] Provider outage fails to Contact/Rental/WhatsApp rather than blocking lead capture.

## Provider dependency

Dapta.ai remains only a candidate. CRM/AI vendors are not prerequisites for the current gate.

Preferred portable architecture:

`Public site / WhatsApp → SD.Live Worker/API boundary → optional AI provider → SD.Live lead/handoff boundary → optional CRM`

## Runtime history for this gate

- **PR #160:** Availability Core v1 + public bilingual status behavior + username privacy regression fix.
- **PR #164:** integrated persistent Availability tab attached to WhatsApp.
- **PR #165:** weekly service-hours Admin + backend Force Mode.
- **PR #166:** Admin dashboard routing fix so the Availability runtime is injected on `/admin/`.
- **PR #167:** Availability Admin visual parity with Live Mode; production visual review accepted.

Latest production checkpoint: `docs/checkpoints/handoff-availability-core-2026-09-01.md`.

## Exact continuation

1. Implement **Travel Mode Admin/API** as a bounded separate slice.
2. Production-smoke that runtime batch once.
3. Implement deterministic **next service window** calculation/display.
4. Only then begin **Lead Core + web AI assistant** design/implementation.
5. Resend notification/handoff follows Lead Core; Attio/Dapta remain optional later integrations.
