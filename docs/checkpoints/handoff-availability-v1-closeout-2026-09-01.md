# SD.Live — Availability Core v1 closeout checkpoint

**Date:** 2026-09-01 — America/Bogota  
**Status:** **AVAILABILITY CORE v1 CLOSED/PASS**  
**Verified runtime main before docs reconciliation:** `6844ca60537c88322abc853445ee09060f7b7318` (PR #181)

## Closeout summary

Availability Core v1 is now operational, production-smoked and visually accepted in the private Admin and public WhatsApp availability surfaces.

The deterministic SD.Live-owned Availability Core remains authoritative for reachability. AI, CRM, WhatsApp automation, Calendar and Show Day do not own availability truth.

## Production contract

Effective public states:

- `available`
- `limited`
- `away`

Admin precedence, highest first:

1. **Backend Force Mode** — `Auto / Force On / Force Off`; QA/emergency layer; non-Auto expires automatically at the end of the current base-timezone day.
2. **Temporary operational override** — `Auto / Available / Limited / Away`; non-Auto states are always explicitly bounded.
3. **Weekly service schedule** — Monday–Sunday, multiple windows per day, evaluated in the active Availability timezone.
4. **Compatibility default** — before the schedule is deliberately saved, Auto preserves the previous Available behavior.

Force Mode never rewrites the temporary override or weekly schedule underneath it.

## Travel Mode — completed

Travel Mode is implemented and production-accepted.

- temporary IANA timezone;
- explicit end date;
- automatic expiry;
- travel does **not** force Away;
- travel changes the timezone used to evaluate weekly service windows;
- Admin offers common zones, `Use device timezone` and manual `Other IANA timezone…`;
- public output never exposes travel timezone, itinerary or reason.

Relevant runtime sequence:

- **PR #169 — Add Availability Travel Mode controls**
- **PR #170 — Polish Travel Mode mobile timezone UX**
- **PR #171 — Document Travel Mode timezone entry** — docs-only

## Next service window — completed

The deterministic next human service window is implemented.

It considers:

- weekly windows;
- closed days;
- expiring temporary state;
- Force Mode day-end expiry;
- Travel Mode expiry;
- timezone changes;
- DST transitions.

Public output is privacy-safe and exposes only timing labels; Admin may retain timezone context for audit/display.

Relevant runtime:

- **PR #172 — Add Availability next service window**
- **PR #173 — Fix Availability Force Mode expiry date display**

## Admin visual closeout — completed

The Dashboard Availability and Show Day Visual QA controls were normalized into one compact visual system.

Accepted behavior:

- Availability + Show Day appear as compact bounded control cards on desktop;
- both use comparable hierarchy, typography, badges and disclosures;
- mobile stacks safely;
- Availability controls live under `Manage availability`;
- Show Day controls live under `Manage Show Day`;
- Weekly Schedule is compact and no longer overflows inside the narrower card;
- status pills and Travel `OFF` pill are optically centered;
- disclosure chevrons use deterministic CSS rendering;
- control copy avoids the previous inconsistent bold styling.

Relevant runtime:

- **PR #174 — Compact Availability Admin card**
- **PR #176 — Compact Availability and Show Day into control cards**
- **PR #177 — Admin control visual polish**
- **PR #178 — Finish Admin control card visual parity**

Production visual review: **PASS**.

## Flexible Temporary Status — completed

Temporary Status is no longer limited to fixed 1/2/4/8 hour choices.

Current Admin behavior:

- flexible hours + minutes timer;
- minimum 15 minutes;
- maximum 24 hours;
- `Auto / Available / Limited / Away` are selection controls;
- `Apply status` explicitly commits the selected state and current timer;
- timer/status edits expose a pending state rather than silently saving;
- applied state reports its expiry;
- `Auto → Apply status` returns ownership to the normal resolver layers.

Relevant runtime:

- **PR #179 — Add flexible Temporary Status timer on polished Admin**
- **PR #180 — Fix flexible Temporary Status duration sync**
- **PR #181 — Add explicit Apply status action for Temporary Availability**

Representative production smoke:

- `0 h / 15 min` + `Limited` + `Apply status` produced the correct 15-minute Limited override;
- `0 h / 15 min` + `Away` + `Apply status` produced the correct 15-minute Away override;
- Away surfaced the matching `Next service window`;
- final cleanup returned Temporary Status to `Auto`.

**PRODUCTION SMOKE PASS.**

## Owner WhatsApp command core — prepared, transport not connected

A transport-neutral owner-command parser is implemented for a future authenticated WhatsApp transport.

Supported command shapes include:

- `away 4h`
- `limited 1h 30m`
- `away until 23:00`
- Spanish equivalents such as `ausente hasta 23:00`
- `back` / `volver`
- `status` / `estado`

These map to the same canonical Availability override contract.

This does **not** mean WhatsApp control is live yet.

Before enabling a real WhatsApp transport:

- verify the provider;
- authenticate the owner server-side;
- reject unauthenticated senders before parsing commands;
- keep owner phone details server-side only;
- never expose owner phone numbers in public HTML/JS/structured data/API output.

## Public contact contract

The existing WhatsApp control remains the only persistent floating CTA.

- `AVAILABLE / LIMITED / AWAY` and ES equivalents follow the public Availability API;
- explanatory copy is bilingual;
- public output does not expose travel/event/private calendar detail;
- public WhatsApp identity remains username-only;
- Away may show a deterministic next human service window;
- no AI availability claim is shown before the AI assistant actually exists.

## Architectural invariants

- GitHub `main` + verified production behavior = code truth.
- D1 Availability state is separate from Finance/REGISTRO/AppSheet.
- Google Sheets `REGISTRO` remains operations/finance persistence + formula truth.
- AppSheet SD.Live Track remains mobile/offline operations client.
- Site Schedule D1 remains website-only Calendar/Show Day presentation state.
- Google Calendar remains secondary projection/read-only overlay; no Google → REGISTRO reverse-write.
- Rental pricing/quote logic remains backend-owned.
- Generic Finance Phase 3 write-back remains blocked.
- Show Day remains CLOSED/PASS and must not be reopened without a regression.
- Public owner phone privacy is a hard invariant.

## QA convention carried forward

For runtime changes:

`inspect main → short branch → implementation → tests/CI → PR → CI green → squash merge → one representative production smoke`.

Manual QA with the owner proceeds one action at a time.

Do **not** use the Cloudflare Deployments screen as a routine manual validation step. Check Cloudflare deployment state only when the owner asks for it or when there is concrete evidence of a deployment anomaly.

Docs-only closeout requires CI but no production smoke.

## Next Active Gate

**SD.Live Assistant + Lead Core**

Preferred architecture:

`Public site / popup → SD.Live API → optional AI → safe tools → SD.Live-owned Lead Core in D1 → notification → human handoff → optional CRM later`

The assistant must identify itself as **SD.Live Assistant** and never impersonate the human owner.

Initial required capabilities:

- bilingual EN/ES;
- classify `Live / Theatre / Sound Design / Systems / Rental / Other`;
- collect name, contact, date, city, venue, service, equipment, schedule and concise request summary;
- consult deterministic Availability Core;
- answer only from approved service/business information;
- create normalized Lead Core records in D1;
- generate a clear human handoff.

Hard prohibitions:

- no invented prices;
- no price negotiation;
- no promised availability without deterministic backend confirmation;
- no Rental catalog/quantity/availability ownership by AI;
- no Finance data/tool access;
- no invented credits, capabilities or policies;
- no requirement for an external CRM to own the only copy of lead/transcript data.

Preferred initial stack remains Cloudflare + D1 + Resend + OpenAI API. CRM/Attio and deeper WhatsApp provider automation remain optional later integrations.

## Backlog that must not displace the Active Gate

- Mobile Rental Cart total visibility / sticky request summary.
- SD.Live Patch.
- Finance Document Generator.
- Rental availability/double-booking.
- Calendar workflow additions.
- AppSheet reminder alignment.

## Exact continuation

1. Merge this docs-only reconciliation after CI green.
2. No production smoke is required for the docs-only merge.
3. Begin **SD.Live Assistant + Lead Core** by defining the D1 lead schema, safe tool contract and first public entry-point behavior.
4. Keep the prepared WhatsApp owner-command parser as a future authenticated transport; do not expose a webhook before owner verification is designed.
5. Do not reopen Availability Core v1 unless production reveals a regression.
