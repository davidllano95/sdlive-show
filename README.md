# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets `REGISTRO` remains the operations/finance persistence source of truth, AppSheet **SD.Live Track** remains the mobile/offline workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md` for historical/future backlog;
7. older prompts/ideas/references.

**Stability > novelty.** Do not replace a working source of truth because an older/future document imagines another architecture.

## Current state

As of **2026-09-01 America/Bogota**:

- Finance read-only integration and `/admin/finance/` — **OPERATIONAL / production-smoked PASS**; PR #141 freeze regression remains closed.
- Admin Calendar + controlled create + multi-day operations — **CLOSED/PASS**.
- Site Schedule + automatic Show Day + Location — **CLOSED/PASS**.
- Admin-only Show Day QA override `Auto / Force On / Force Off` — **CLOSED/PASS**.
- Admin desktop/mobile stabilization — **CLOSED/PASS**; issue #126 completed.
- Public post-integration visual stabilization — **CLOSED/PASS**; issue #124 completed.
- Rental image-editor parity — **CLOSED/PASS through PR #157**; issue #156 completed.
- Google Calendar `sam@sdlive.show` secondary projection/read-only overlay — **OPERATIONAL / production-smoked PASS**.
- **Availability Core v1 — CLOSED/PASS through PR #181.**
- **Current Active Gate: SD.Live Assistant + Lead Core.**
- Generic Finance Phase 3 write-back — **BLOCKED**.

The exact current continuation point lives in `PROJECT_STATUS.md` and `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`.

## Change workflow

For runtime changes:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → one representative production smoke`.

For manual QA with the owner: **one action at a time**.

Do not use Cloudflare → Deployments as a routine manual QA step. Check deployment state only if the owner asks or there is concrete evidence of a deployment anomaly.

For docs-only changes: branch → docs → tests/CI → PR → CI green → squash merge. No production smoke is required.

## Current architecture

### Public site

- Frontend: vanilla HTML/CSS/JavaScript.
- Hosting/runtime: Cloudflare Workers + Static Assets.
- Analytics: GTM + GA4 with consent gating.
- Forms: Turnstile + D1 + Resend.
- Languages: EN / ES with persisted preference where supported.
- Markets: Colombia / International behavior.
- Public header contract: Home is canonical; current SEO/service landings are normalized at the edge to the same Home header structure.

### CMS / media

- D1 binding `CMS_DB` → `sdlive-cms-production`.
- R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- Public media domain: `media.sdlive.show`.
- Hero, Trusted By / Supported Brands, Testimonials, Core Home, Rental/Contact presentation and reusable Media Library are established.
- Managed logos/images remain R2-owned.
- Visual safeguards and publish failsafe remain part of the Editor boundary.
- Rental image editing is parity-verified across standard cards, PA and Production Tools.

### Private Admin / Control Center

All Admin workspaces remain behind Cloudflare Access.

- `/admin/` — lightweight Dashboard / system overview + compact Availability + Show Day controls.
- `/admin/finance/` — read-only SD.Live Track analytics/workflow workspace; COP/USD separate.
- `/admin/calendar/` — Calendar / Operations over `REGISTRO`, including multi-day and controlled create.
- `/admin/calendar/site-schedule/` — website-only split-work / Show Day / Location editor.
- `/admin/editor/` — Site Editor / CMS workspace.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code/CSS/JS/critical branding/fallbacks | GitHub `main` |
| Structured CMS Draft/Published | D1 |
| Public CMS content | validated D1 Published |
| Editor-managed media binary | R2 |
| Rental pricing / quote calculation | backend pricing logic |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflow | AppSheet SD.Live Track |
| Finance Admin analytics | read-only Worker view over Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Google Calendar secondary projection / read-only overlay | `sam@sdlive.show` |
| Automatic public Show Day | Site Schedule + America/Bogota date |
| Show Day Location | Site Schedule block only |
| Availability / reachability | D1 Availability Core |
| Future leads | SD.Live-owned Lead Core in D1 |

## Finance / AppSheet non-negotiables

The finance-system decision remains **repair + integrate, not rewrite**.

- AppSheet remains mobile/offline workflow.
- `REGISTRO` remains persistence + formula owner.
- `ID` is durable identity; `_RowNumber` is not.
- Formula-owned columns remain read-only to Admin forms.
- COP/USD remain separate; no implicit FX conversion.
- Browser-facing Finance payloads do not expose Notes, `NUM CONTACTO`, internal row IDs or OAuth tokens.
- No D1 Finance mirror.
- **Generic Finance Phase 3 write-back remains blocked.**
- Calendar controlled create is a separate narrow Operations write path, not a generic Finance editor.

Canonical dates:

- `Fecha trabajo` = start;
- `Fecha fin` = end;
- one-day uses end=start;
- multi-day requires end>=start.

## Calendar / Site Schedule / Show Day

Calendar reads the same `REGISTRO` and supports canonical multi-day spans. Controlled create writes only mapped human/source fields into a safe row and leaves formula/workflow ownership intact.

Site Schedule is separate website-only D1 presentation state:

- source events may be split into non-overlapping blocks;
- each block owns Start, End, Show Day boolean and Location;
- source selector uses ongoing + future work in America/Bogota;
- Site Schedule never writes split dates, Show Day or Location to Sheets/AppSheet.

Automatic Show Day comes from Site Schedule + America/Bogota. The public visitor toggle is gone. Admin has a temporary QA override `Auto / Force On / Force Off` separate from canonical data and expiring at Bogotá day-end.

Google Calendar is a secondary integration surface, not a source of operational truth. No Google → REGISTRO/AppSheet reverse-write path exists.

Show Day is **CLOSED/PASS**. Do not reopen it unless a new regression appears.

## Availability Core v1

Availability is a deterministic SD.Live-owned D1 service.

Effective states:

- `available`
- `limited`
- `away`

### Precedence

1. Backend Force Mode — `Auto / Force On / Force Off`.
2. Temporary operational override — `Auto / Available / Limited / Away`.
3. Weekly service schedule.
4. Compatibility default before the first deliberate schedule save.

Force Mode is a separate top-priority layer and does not destroy temporary override or schedule state underneath it.

### Weekly Service Hours

- Monday–Sunday.
- Multiple windows per day.
- Days without windows resolve Away after schedule configuration.
- Evaluation happens in the active Availability timezone.

### Travel Mode

Travel Mode is implemented and bounded.

- temporary IANA timezone;
- explicit end date;
- automatic expiry;
- travel does not itself force Away;
- travel changes the clock used to evaluate weekly service windows;
- Admin supports common zones, `Use device timezone`, and `Other IANA timezone…`.

Manual timezone entry must use a canonical IANA identifier such as:

- `America/Bogota`
- `America/New_York`
- `Europe/Madrid`
- `Asia/Singapore`
- `Australia/Sydney`

Do not use raw offsets (`UTC-5`), abbreviations (`EST`) or city names alone.

### Next service window

The next human service window is calculated deterministically from schedule + current override/Force/Travel state.

The resolver accounts for closed days, expiries, timezone changes and DST.

Public output remains privacy-safe and does not expose Travel timezone, itinerary, private Calendar details or owner phone data.

### Flexible Temporary Status

Temporary Status uses a flexible timer instead of fixed 1/2/4/8 hour blocks.

- minimum 15 minutes;
- maximum 24 hours;
- hours + minutes controls;
- `Auto / Available / Limited / Away` are selection controls;
- `Apply status` explicitly commits the selection + current timer;
- pending edits are not silently applied.

Production smoke verified `0 h / 15 min` with both Limited and Away. Production was returned to Auto after testing.

### Dashboard visual contract

Availability and Show Day are presented as a compact control cluster.

- bounded two-card desktop layout;
- stacked mobile layout;
- coherent typography/status pills/disclosures;
- `Manage availability` and `Manage Show Day` disclosures;
- compact Weekly Schedule;
- stable CSS chevrons;
- Travel `OFF` and operational status pills share the same visual language.

### Public WhatsApp / Availability

The existing floating WhatsApp control remains the only persistent floating CTA.

- integrated Availability status tab;
- EN `AVAILABLE / LIMITED / AWAY` plus ES equivalents;
- bilingual explanatory popover;
- Away may expose privacy-safe next human service timing;
- public WhatsApp identity remains username-only;
- owner phone number is prohibited in public HTML/JS/schema/Availability output.

### Owner WhatsApp commands

A transport-neutral parser is prepared for future verified-owner control, including command shapes such as:

- `away 4h`
- `away until 23:00`
- `limited 1h 30m`
- `back` / `volver`
- `status` / `estado`

The real WhatsApp transport is **not live yet**. It must authenticate the owner server-side before parsing commands and must not expose owner phone information publicly.

Availability Core v1 is **CLOSED/PASS**. Do not reopen it unless a regression appears.

## Current Active Gate — SD.Live Assistant + Lead Core

Preferred architecture:

`Public site / popup → SD.Live API → optional AI → safe tools → SD.Live-owned Lead Core in D1 → notification → human handoff → optional CRM later`

Assistant name: **SD.Live Assistant**.

The assistant must:

- identify itself as the assistant, not as Samuel;
- work EN/ES;
- classify Live / Theatre / Sound Design / Systems / Rental / Other;
- collect name, contact, date, city, venue, service, equipment, schedule and concise summary;
- consult deterministic Availability Core;
- answer only from approved business/service information;
- create a normalized Lead Core record in D1;
- produce a useful human handoff.

The assistant must not:

- invent prices;
- negotiate prices;
- promise availability without deterministic backend confirmation;
- become Rental catalog/quantity/availability source of truth;
- access Finance/Admin data;
- invent credits, capabilities or policies;
- leave the only copy of lead/transcript data in an external vendor.

Preferred initial stack:

- Cloudflare
- D1
- Resend
- OpenAI API

CRM/Attio, Dapta and deeper WhatsApp provider automation remain optional later layers.

## Backlog that must not displace the Active Gate

- Mobile Rental Cart total visibility / sticky request summary.
- SD.Live Patch.
- Finance Document Generator.
- Rental availability/double-booking.
- Calendar workflow additions.
- AppSheet reminder alignment.
- Show Day simultaneous Primary/Secondary presentation priority.

## Relevant docs

- `PROJECT_STATUS.md` — master current state + exact continuation.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — latest Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability / Lead / Assistant contract.
- `docs/roadmap/mobile-rental-cart-total-visibility.md` — bounded Rental mobile backlog.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog; lower precedence than current-state docs.
