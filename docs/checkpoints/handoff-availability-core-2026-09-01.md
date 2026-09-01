# SD.Live — Availability Core production checkpoint

**Date:** 2026-09-01 — America/Bogota  
**Status:** **ACTIVE GATE — CORE OPERATIONAL / CONTINUATION READY**  
**Verified main before docs reconciliation:** `74bc8ff0e801740c64fc6484058329ab099d80a3` (PR #167)

## What is now operational

Availability is no longer a roadmap-only candidate. The first deterministic SD.Live-owned Availability Core is running in production.

Runtime sequence completed:

- **PR #160 — Availability Core v1:** canonical D1-owned profile, expiring manual override, public `/api/availability`, protected Admin `/api/admin/availability`, public bilingual WhatsApp status/glow/popover and privacy-safe fail-open behavior.
- **PR #164 — integrated public status tab:** persistent bilingual Availability tab attached to the existing WhatsApp control; no second floating CTA.
- **PR #165 — weekly schedule + backend Force Mode:** configurable Monday–Sunday service windows, separate `Auto / Force On / Force Off` QA/emergency state, top-precedence force with automatic end-of-day expiry, and strict validation of schedule writes.
- **PR #166 — Admin dashboard routing fix:** `/admin` and `/admin/` are routed through the Availability HTML runtime without routing every Admin asset through the Worker.
- **PR #167 — Admin visual parity:** Availability adopts the established Live Mode panel language: gradient panel, compact status badge, violet segmented Force Mode control and mobile-safe layout.

The final visual production check for PR #167 passed on iPhone. Availability is visible and the revised card was accepted as visually coherent with Live Mode.

## Current state contract

Effective public states:

- `available`
- `limited`
- `away`

Admin control layers, highest precedence first:

1. **Backend Force Mode** — `Auto / Force On / Force Off`.
2. **Temporary operational override** — `Auto / Available / Limited / Away`, always bounded by explicit expiry.
3. **Weekly service schedule** — multiple service windows per day, evaluated in the active availability timezone.
4. **Compatibility default** — before a deliberate schedule is saved, Auto preserves the previous Available behavior.

Force On resolves public Availability to Available; Force Off resolves it to Away. Force Mode is separate D1 state and does not rewrite the temporary override or weekly schedule.

## Public contact contract

The existing floating WhatsApp control remains the only persistent CTA.

- the attached tab communicates `AVAILABLE / LIMITED / AWAY` (and ES equivalents);
- the explanatory popover is bilingual and follows the current page language;
- WhatsApp stays actionable on mobile;
- Availability never exposes private travel/event details;
- public WhatsApp identity remains username-only;
- owner phone numbers are not allowed in public HTML, JS, structured data or Availability output.

The earlier edge-template regression that could reintroduce a numeric `wa.me` link was fixed and regression-tested.

## What is deliberately not implemented yet

- Travel Mode Admin/API writes.
- Weekly next-service-window calculation and public `nextHumanWindow` copy.
- Owner WhatsApp command parsing (`away 2h`, `back`, etc.).
- AI assistant / Lead Core / CRM integration.
- Calendar or Show Day automatic ownership of Availability.

Travel data already has a resolver-compatible model, but no public/Admin mutation surface is active yet.

## Next continuation

Continue the same Active Gate in this order:

1. **Travel Mode Admin/API** — temporary timezone + explicit end date; travel changes the clock used by weekly schedule resolution and does not itself mean Away.
2. **Next service window calculation** — calculate the next deterministic human service window from schedule/travel/override state and expose only privacy-safe timing.
3. **Then design Lead Core + web AI assistant** — D1-owned normalized leads, AI on demand, provider-portable, with deterministic Availability as a tool rather than AI-owned truth.
4. **Resend notification/handoff** after Lead Core exists.
5. CRM/Attio and deeper WhatsApp automation remain optional later integrations.

Do not start CRM/vendor integration merely because Availability exists. Availability Core remains the source of truth for reachability.

## Invariants carried forward

- GitHub `main` + verified production behavior remain code truth.
- D1 Availability state is separate from Finance/REGISTRO/AppSheet truth.
- Google Calendar and Site Schedule remain secondary inputs unless explicitly promoted through a future bounded rule.
- No generic Finance write-back is unlocked.
- Rental pricing/inventory/quote ownership is unchanged.
- One representative production smoke per runtime batch; docs-only reconciliation needs no production smoke.
