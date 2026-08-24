# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers also own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets `REGISTRO` remains the operations/finance persistence source of truth, AppSheet **SD.Live Track** remains the mobile/offline workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. `PROJECT_STATUS.md`;
4. this README;
5. `ROADMAP_MASTER_CHECKLIST.md`;
6. older prompts/ideas/references.

Do not replace a working source of truth because a future document imagines another architecture. **Stability > novelty.**

## Current state

As of **2026-08-23 America/Bogota**:

- Finance Phase 2 read-only integration — **CLOSED/PASS**.
- Dedicated `/admin/finance/` workspace — **CLOSED/PASS**.
- AppSheet multi-day source model — **PASS**.
- Admin Calendar read-only — **CLOSED/PASS**.
- Controlled Admin Calendar create — **CLOSED/PASS** after OAuth write authorization, PR #99 row-safety hardening and E2E Sheet/AppSheet smoke.
- Site Schedule + automatic Show Day + Location — **CLOSED/PASS**.
- Site Schedule Split Work ongoing/future-only source filter — **PASS, PR #100**.
- Shared Home-style header on secondary public pages — **PASS**.
- Rental quote drawer Show Day matrix — **PASS mobile+desktop, EN+ES** after PRs #107–#108.
- Anima Producciones + Sonique contrast treatment — **PASS**; both render white in all modes via CSS inversion while original R2 media remains untouched, PR #116.
- **Active gate:** required post-integration detailed visual audit across remaining public + Admin surfaces, desktop + mobile, normal + Show Day.
- Generic Finance Phase 3 write-back — **BLOCKED**.

Current detailed checkpoint:

- `docs/checkpoints/visual-audit-progress-pr116-2026-08-23.md`

Full active audit contract:

- `docs/roadmap/post-integration-visual-audit-2026-08-23.md`

## Permanent change-safety rule

Before modifying an existing system, establish:

- where it lives;
- who consumes it;
- what persists and who owns it;
- which APIs/public/SEO/visual behavior depends on it;
- which tests/fallbacks exist;
- whether the change can be incremental/reversible;
- whether a source of truth would change.

If an important answer is unknown, investigate first.

## Current architecture

### Public site

- Frontend: vanilla HTML/CSS/JavaScript.
- Hosting/runtime: Cloudflare Workers + Static Assets.
- Analytics: GTM + GA4 with consent gating.
- Forms: Turnstile + D1 + Resend.
- Languages: EN / ES with persisted preference where supported.
- Markets: Colombia / International behavior.
- Public header contract: Home is canonical; public SEO/service landings are normalized at the edge to the same Home header structure, including navigation, CTA, EN/ES, Show Day and Location.

### CMS / media

- D1 binding `CMS_DB` → `sdlive-cms-production`.
- R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- Public media domain: `media.sdlive.show`.
- Hero, Trusted By / Supported Brands, Testimonials, Core Home, Rental/Contact presentation and reusable Media Library are established.
- Visual safeguards: `visual-safeguards.css` + `visual-safeguards.js`.
- Global Select routes selection to owning CMS sections/items.
- Managed logos/images should remain in R2; presentation-only contrast changes should not create duplicate media variants unless technically necessary.

### Private Admin / Control Center

All Admin workspaces remain behind Cloudflare Access.

- `/admin/` — lightweight Dashboard / system overview.
- `/admin/finance/` — read-only SD.Live Track analytics workspace; COP/USD separate.
- `/admin/calendar/` — Calendar / Operations over the same `REGISTRO`, including multi-day and controlled create.
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
| Admin visual tokens | `admin/dashboard.css` |
| Operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflow | AppSheet SD.Live Track |
| Finance Admin analytics | read-only Worker view over Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Automatic public Show Day | Site Schedule + America/Bogota date |
| Show Day Location | Site Schedule block only |

## Finance / AppSheet non-negotiables

The finance system decision remains **repair + integrate, not rewrite**.

- AppSheet remains mobile/offline workflow.
- `REGISTRO` remains persistence + formula owner.
- `ID` is durable identity; `_RowNumber` is not.
- Formula-owned columns remain read-only to Admin forms.
- COP/USD remain separate; no implicit FX conversion.
- No browser-facing Finance route exposes Notes, `NUM CONTACTO`, internal row IDs or OAuth tokens.
- No D1 Finance mirror.
- **Generic Finance Phase 3 write-back remains blocked.**
- Calendar controlled create is a separate narrow Operations write path, not a generic Finance editor.

Canonical source dates:

- `Fecha trabajo` = start;
- `Fecha fin` = end (`REGISTRO` AB);
- one-day uses end=start;
- multi-day requires end>=start.

Issue #83 remains open: billing/reminder eligibility should use the day after canonical `Fecha fin`, not Site Schedule dates.

## Controlled Admin create — CLOSED/PASS

PR #89 introduced authenticated `POST /api/admin/calendar/events`. The first real write exposed an unsafe row-reservation behavior; the affected historical row was recovered and PR #99 replaced `values.append` with safe occupancy scanning/direct row targeting.

Final production create smoke:

- wrote to `REGISTRO` row 67;
- did not inherit workflow/payment data;
- synced cleanly to AppSheet;
- Admin confirmation shows `✓ Event created · REGISTRO row N`.

## Site Schedule + automatic Show Day — CLOSED/PASS

- canonical `REGISTRO`/AppSheet dates remain unchanged;
- D1 `site_schedule_state` stores website-only display overrides;
- source events may be split into non-overlapping website blocks;
- each block owns Start, End, Show Day boolean and Location;
- public Show Day comes from `GET /api/site/showday-status` in America/Bogota;
- failure fails closed to normal mode;
- legacy visitor manual Show Day toggle is removed;
- Site Schedule never writes split dates, Show Day or Location to Sheets/AppSheet.

PR #100 filters the Site Schedule source selector to ongoing/future work only while preserving historical overrides and Calendar history.

## Visual audit — ACTIVE

The required audit covers:

- Home + all current public route families;
- desktop + mobile separately;
- normal + Show Day;
- EN/ES + COL/INT branches where applicable;
- Admin Dashboard, Finance, Calendar, Site Schedule and Editor desktop/mobile.

Closed visual progress includes PRs #101–#116. Important recent closures:

- Rental drawer now clearly communicates **rental quote request / cotización**, with estimate-not-payment/reservation language; Show Day mobile+desktop EN+ES QA PASS.
- Original Rental shopping-cart icon restored.
- Anima Producciones + Sonique dark-logo contrast resolved by permanent `brightness(0) invert(1)` on only those two marks; no plate/glow remains and R2 originals stay untouched.
- Future Admin-only Show Day override, testimonial long-copy/card geometry and generic Editor reordering are documented backlog, not active work.
- Attio (CRM) and Dapta.ai (AI chatbot/agent) are future vendor candidates only; see `docs/roadmap/future-crm-ai-vendors-2026-08-23.md`.

Still open:

- normal-mode-specific production checks that cannot be observed while automatic Show Day is active;
- remaining public route-family matrix;
- mandatory Admin desktop/mobile visual audit.

**Priority discipline:** continue the active audit one manual QA action at a time; do not reopen closed findings without regression evidence.

## Future Calendar UX backlog

Admin Calendar **Agenda mode** should later expose a scope toggle:

- **Full Month** — every effective Agenda item in the selected month, including past items;
- **Current + Future** — ongoing + future only; hide items whose effective end is before today.

This must be presentation/filter only, use America/Bogota for “today”, preserve ongoing multi-day work and never mutate/delete `REGISTRO`, AppSheet or Site Schedule history. Default selection remains TBD until implementation.

## Show Day low-priority polish

Approved backlog, not current gate:

- authenticated Admin-only temporary override, recommended `Auto / Force On / Force Off`;
- dynamic Show Day favicon;
- remove normal-violet → Show Day-red startup popping using authoritative prepaint/edge state.

## Rental / Contact invariants

- Rental is Colombia-first and hidden by default for International visitors unless direct intent requires it.
- Rental notifications go only to `rental@sdlive.show`.
- General Contact notifications go to `hello@sdlive.show`.
- Rental pricing/quote math remains backend-owned.
- Presentation CMS does not own transaction IDs or quote math.

## Permanent palette rule

Every new or modified UI reuses established brand tokens/palette. Do not introduce one-off decorative color systems.

- Admin uses shared tokens from `admin/dashboard.css`.
- Public site reuses the established normal/Show Day brand system.
- Desktop + mobile visual smoke includes palette consistency.
