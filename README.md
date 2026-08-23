# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in Workers. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets `REGISTRO` remains the operations/finance persistence source of truth, AppSheet **SD.Live Track** remains the mobile/offline workflow client, and Cloudflare Access protects the Admin.

For project state, use this precedence:

1. current code on GitHub `main` + verifiable production behavior;
2. current schema/configuration;
3. `PROJECT_STATUS.md` — operational current state and active gate;
4. this README;
5. `ROADMAP_MASTER_CHECKLIST.md` — preserved historical/future backlog detail;
6. prompts, ideas and external references.

The Control Center sequence is documented in `docs/roadmap/sdlive-control-center.md`. Calendar/Operations has its own handoff in `docs/roadmap/calendar-operations-hub-2026-08-23.md`.

## Permanent change-safety rule

Before modifying an existing system, establish where it lives, who consumes it, what persists, which APIs/public/SEO/visual behavior depends on it, which tests/fallbacks exist, and whether the change can be incremental and reversible. If an important answer is unknown, investigate first.

Do not replace a working source of truth merely because a future vision describes a different architecture. **Stability > novelty.**

## Current architecture

### Public site

- **Frontend:** vanilla HTML/CSS/JavaScript.
- **Hosting/runtime:** Cloudflare Workers + Static Assets.
- **Worker routing/composition:** `public-form-rate-limit.js`, `worker-router.js`, `worker-entry.js` and feature modules.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with persisted preference and edge-aware first paint where implemented.
- **Markets:** Colombia / International behavior.
- **Public headers:** Home is the canonical visual/navigation contract. Public SEO/service landings are normalized at the edge to the same Home header structure, including navigation, CTA, EN/ES, automatic Show Day and Location.

### CMS / media

- **Database:** D1 binding `CMS_DB` → `sdlive-cms-production`.
- **Media storage:** R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- **Public media domain:** `media.sdlive.show`.
- **Hero:** Draft/Published/revisions with edge first-paint rendering.
- **Trusted By / Supported Brands:** D1/R2 + edge rendering.
- **Testimonials:** D1/R2 + edge rendering.
- **Core Home CMS:** About, Services, International and Selected Work.
- **Presentation CMS:** Rental and Contact presentation only; transactional logic remains system-owned.
- **Reusable Media Library:** R2-backed Editor library.
- **Visual safeguards:** `visual-safeguards.css` + `visual-safeguards.js` with Editor diagnostics.
- **Global Select:** `admin/editor/editor-resilience.js` routes visual selection to the owning CMS section/item.

### Private Admin / Control Center

All Admin workspaces remain behind the same Cloudflare Access boundary.

- **`/admin/` — Dashboard.** Lightweight operational overview, CMS/system health and workspace navigation. It must not auto-boot heavy Finance analytics.
- **`/admin/finance/` — Finance.** Dedicated **SD.Live Track** analytics workspace. Read-only over the underlying Google Sheet/API; COP/USD remain separate.
- **`/admin/calendar/` — Calendar / Operations.** Authenticated month Calendar + mobile Calendar/Agenda over `REGISTRO`, with multi-day support and Site Schedule overlays.
- **`/admin/calendar/site-schedule/` — Site Schedule.** Website-only operational presentation layer for splitting broad source ranges into real public/Admin Calendar blocks and controlling per-block Show Day + Location.
- **`/admin/editor/` — Site Editor.** Visual CMS/editor workspace.
- **Inbox:** currently bridges to Google Workspace/Gmail.
- **Leads/CRM, Rental Admin, Projects, Analytics and SEO:** planned unless `PROJECT_STATUS.md` explicitly says otherwise.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code, CSS/JS, critical branding, fallbacks | GitHub `main` |
| Structured CMS Draft/Published content | D1 |
| Public CMS content | validated D1 `published_json` |
| Editor-managed media binary | R2 |
| Editor-managed media metadata/references | D1 |
| Rental pricing / quote calculation | backend pricing logic; never presentation CMS copy |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Admin visual palette/tokens | shared variables in `admin/dashboard.css` |
| Current operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflows | AppSheet **SD.Live Track** |
| Finance Admin analytics | read-only Worker view over Google Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Automatic public Show Day state | derived from D1 Site Schedule blocks for today in America/Bogota |
| Show Day Location | Site Schedule block only; never AppSheet/Sheets |
| Future CRM / Lead→Quote→Project→Invoice ownership | TBD before implementation |

## Finance / AppSheet non-negotiables

The finance system was audited and the decision remains **repair + integrate, not rewrite**.

- AppSheet remains the offline field-capture/workflow surface.
- Google Sheets `REGISTRO` remains operations/finance persistence and formula owner.
- `ID` is the durable AppSheet-compatible record key; `_RowNumber` is not an integration identity.
- Formula-owned columns remain read-only to Admin/AppSheet forms.
- COP and USD remain separate; no implicit FX conversion.
- LiventX workflow blocking remains part of collection logic.
- No browser-facing Finance route exposes Notes, `NUM CONTACTO`, internal row IDs or OAuth credentials/tokens.
- No D1 finance mirror or second finance source of truth.
- **Generic Finance Phase 3 write-back remains blocked.** The controlled Calendar create path is a separate, narrowly scoped Operations write path to the same `REGISTRO`.

Evidence:

- `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md`
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md`
- `docs/checkpoints/sdlive-track-admin-finance-readonly-2026-08-22.md`
- `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`

## Calendar / Operations — current verified contract

### AppSheet multi-day model — PASS

Canonical source dates:

- `Fecha trabajo` = start;
- `Fecha fin` = end (`REGISTRO` column AB);
- one-day work uses end = start;
- multi-day work requires end >= start.

Google Sheets continues to own array-formula/helper columns. Calendar reads A:AB; Finance intentionally keeps its established read boundary unless separately changed.

### Admin Calendar read-only — CLOSED/PASS

`GET /api/admin/calendar/events` reads the same `REGISTRO` source, normalizes Calendar-required headers, returns sanitized browser-safe fields and supports real multi-day spans. Desktop, iPhone Calendar/Agenda and SD.Live Admin palette smoke all passed.

### Controlled Admin create — implemented, OAuth-gated

PR #89 implemented authenticated `POST /api/admin/calendar/events` with mapped source fields, AppSheet-compatible durable IDs, idempotent request IDs, server-side validation and protection for formula-owned/workflow-managed columns.

Production reached the real Sheets write boundary but the current Google OAuth refresh token is read-only. The active gate is to re-authorize the existing OAuth client with:

`https://www.googleapis.com/auth/spreadsheets`

Then run exactly one controlled create smoke, verify the row in Google Sheets, sync AppSheet and confirm the same record there. See `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md`.

## Site Schedule + automatic Show Day — CLOSED/PASS

This milestone is production-smoked and closed.

### Architecture

- `REGISTRO` / AppSheet canonical dates remain untouched.
- D1 Site Schedule stores **website-only presentation overrides** in its own `site_schedule_state` table.
- A source event may be split into multiple non-overlapping website blocks inside the original source range.
- Admin Calendar uses effective Site Schedule blocks when an override exists.
- `GET /api/admin/calendar/events?view=source` preserves canonical source ranges for the Site Schedule editor.
- Site Schedule does not create a finance mirror and does not write split dates, Show Day or Location to Sheets/AppSheet.

### Per-block controls

Each block owns:

- Start date;
- End date;
- explicit `Show Day` boolean;
- website-only `Location`.

Location is required when Show Day is enabled.

### Public behavior

- Public endpoint: `GET /api/site/showday-status`.
- Today is evaluated in **America/Bogota**.
- Show Day activates only when today lies inside a block with `showDay=true` and a nonblank Location.
- D1/status failure fails closed to normal mode.
- The legacy visitor-operated Show Day toggle is removed at the edge.
- Home displays the canonical Show Day logo, ON AIR state and configured Location.
- Public secondary/SEO landings now receive the **same Home header structure at the edge**, so Show Day looks like one coherent site rather than separate page systems.

### Production QA evidence — 2026-08-23

The real RENT source range was split into four website blocks:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

Production checks passed for D1 persistence, Calendar gaps, `Next` using effective blocks, normal mode with all switches off, automatic Show Day activation, Location display, and shared Home-header parity on the theatre landing.

Relevant implementation/fix PRs: #93, #95 and #96. Checkpoint: `docs/checkpoints/site-schedule-showday-2026-08-23.md`.

## CMS and public-site invariants

### Draft / Published

- `Save Draft` never changes production.
- Public CMS content uses Published, never Draft.
- `Publish` is the deliberate promotion action.
- Static content remains a fallback where the architecture requires it.

### First-paint / anti-popping

Published Home CMS copy should be resolved at the edge before visible first paint. Do not blank the document or reintroduce static→CMS flash.

**Known low-priority Show Day polish:** automatic Show Day currently becomes authoritative after the public status runtime resolves, so an active page can briefly first-paint in normal violet before changing to Show Day red. Future hardening should resolve/inject active Show Day state before visible paint, preferably at the edge, while failing closed to normal mode.

### Favicon

The normal favicon remains static today. **Approved low-priority improvement:** add a Show Day favicon variant and switch it automatically with the same authoritative Show Day state. This should be implemented together with or after the anti-popping prepaint work so favicon and page state do not disagree during startup.

### Global Select / Visual Safeguards

Established production aesthetics are contracts. New CMS/editor reconstruction must preserve Global Select ownership and extend Safeguards/tests where appropriate.

### Permanent palette rule

Every new or modified UI must reuse the established brand tokens / approved palette of the surface it belongs to. Do not introduce one-off decorative color systems. Admin modules use shared Admin tokens from `admin/dashboard.css`; public-site work reuses the existing public brand system. Desktop + mobile visual smoke includes palette consistency before closing a visual milestone.

### Rental / Contact

- Rental is Colombia-first and hidden by default for International visitors unless direct intent requires it.
- Rental notifications go **only to `rental@sdlive.show`**.
- General Contact notifications go to `hello@sdlive.show`.
- Rental pricing/quote math remains backend-owned.
- Rental presentation CMS may edit presentation, not transactional IDs, pricing or quote math.

## Current production milestones

- P0 baseline: closed.
- Hero CMS + first paint: closed.
- Trusted / Testimonials / Core Home / Rental & Contact CMS: closed.
- Reusable Media Library + Home R2 closeout: closed.
- Global Select + Visual Safeguards + automatic publish failsafe: closed.
- P3.0–P3.4 public/SEO/performance: closed.
- Security baseline: closed.
- Finance audit / SD.Live Track rename / source mapping: closed.
- Finance Phase 2 read-only integration: CLOSED/PASS.
- Dedicated Admin Finance workspace: CLOSED/PASS.
- AppSheet multi-day model: PASS.
- Admin Calendar read-only desktop/mobile/palette: CLOSED/PASS.
- Site Schedule + automatic Show Day + Location: **CLOSED/PASS**.
- Shared Home header on public secondary/SEO pages: **PASS**.
- **Active implementation gate:** Calendar controlled create production write authorization via Google OAuth Sheets write scope.

## Priority backlog preserved

- Re-authorize Google OAuth for controlled Calendar writes; run one create → Sheet → AppSheet smoke.
- Issue #83: billing eligibility/reminders use the day after canonical `Fecha fin`, not Site Schedule dates.
- After create PASS: controlled edit + explicit workflow actions; do not broaden into generic Finance writes.
- Show Day dynamic favicon.
- Show Day prepaint/edge state to eliminate normal-violet → red startup popping.
- Phase 2 Finance real-use observation before any generic Finance Phase 3 proposal.
- CRM/Projects/Rental Admin only after source-of-truth contracts are explicit.
- R2 reference-safe delete/orphan cleanup and richer media metadata.
- Rental availability/double-booking/PDF quote only when ownership/contracts are defined.
- Continue GSC/Bing/GA4 integrity and search-indexation follow-up.

`ROADMAP_MASTER_CHECKLIST.md` remains the detailed historical/future backlog register.

## Important files

### Public/runtime

- `index.html` — public Home shell + static fallbacks.
- `styles.css` — primary public styles/tokens.
- `script.js` — main public UI/runtime and Rental client behavior.
- `showday-edge.js` — automatic Show Day runtime injection, legacy-toggle removal and secondary-header normalization.
- `showday-runtime.js` / `showday-runtime.css` — public automatic Show Day state/runtime.
- `worker-router.js` / `public-form-rate-limit.js` — routing/edge composition.
- `site-schedule-api.js` / `site-schedule-store-v2.js` — Site Schedule and Show Day data contract/storage.
- `security-headers.js` / `_headers` — CSP/browser security contract.

### Admin

- `admin/index.html` / `admin/dashboard.js` — lightweight Dashboard.
- `admin/dashboard.css` — shared Admin visual tokens/palette; primary accent currently `#a089e5` (`--accent-rgb: 160,137,229`).
- `admin/finance/` — dedicated Finance workspace.
- `admin/calendar/` — Calendar/Operations workspace.
- `admin/calendar/site-schedule/` — website-only Site Schedule editor.
- `admin/editor/` — Site Editor workspace.

### Documentation

- `PROJECT_STATUS.md` — current operational state and active gate.
- `ROADMAP_MASTER_CHECKLIST.md` — preserved detailed backlog/history.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `docs/checkpoints/site-schedule-showday-2026-08-23.md` — closed Site Schedule/Show Day milestone.
- `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md` — current OAuth gate.

## Critical endpoints

### Public

- `/`
- `/en/`
- `/es-co/`
- `/theatre-sound-design-audio-post`
- current service/Rental landings in the repository
- `GET /api/site/showday-status`

### Private Admin

- `/admin/`
- `/admin/finance/`
- `/admin/calendar/`
- `/admin/calendar/site-schedule/`
- `/admin/editor/`

### Operations APIs

- `GET /api/admin/calendar/events`
- `GET /api/admin/calendar/events?view=source`
- `POST /api/admin/calendar/events`
- Site Schedule Admin endpoints under `/api/admin/site-schedule...`

## Brand / operational invariants

- Brand spelling is exactly **SD.Live**.
- Descriptor: **Creative Audio**.
- Canonical tagline: **Creative Audio. Technical systems. Built for the show.**
- **Brand-palette reuse is mandatory for all new implementation work.**
- Cloudflare Access is the real Admin barrier.
- GTM is analytics/consent/events only, never navigation/branding/layout.
- Do not restore Netlify, the old Owner Access mockup, `site-runtime`, or GTM-driven navigation.
- GitHub = code; D1 = structured CMS/application state; R2 = editor-managed media; Sheets/AppSheet retain the explicit operations/finance ownership described above.

## Development workflow

```text
main
  ↓
short-lived feature/fix/docs branch
  ↓
Pull Request
  ↓
CI
  ↓
squash merge
  ↓
production smoke
  ↓
close milestone / update evidence
```

Do not treat a feature-branch deployment as production.

## Current gate

**Calendar read-only and Site Schedule / automatic Show Day are CLOSED/PASS. Generic Finance Phase 3 remains BLOCKED.**

The next gate is deliberately narrow:

1. re-authorize the existing Google OAuth connection with Sheets write scope;
2. replace only the refresh token used by the Worker if required;
3. run exactly one controlled Admin Calendar create smoke;
4. verify the row in Google Sheets;
5. sync AppSheet and verify the same record;
6. only then close controlled-create PASS and consider edit/workflow actions.

Do not change the spreadsheet source of truth, D1 finance architecture, formula ownership or generic Finance permissions as part of this OAuth step.
