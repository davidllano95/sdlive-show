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
- Controlled Admin Calendar create — **CLOSED/PASS** after OAuth write authorization, PR #99 row-safety hardening and end-to-end Google Sheet/AppSheet smoke.
- Site Schedule + automatic Show Day + Location — **CLOSED/PASS**.
- Site Schedule Split Work ongoing/future-only source filter — **PASS, PR #100**.
- Shared Home-style header on secondary public pages — **PASS**.
- **Active gate:** required post-integration detailed visual audit across public + Admin, desktop + mobile, normal + Show Day.
- Generic Finance Phase 3 write-back — **BLOCKED**.

Current continuation checkpoint:

- `docs/checkpoints/visual-audit-handoff-2026-08-23.md`

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

PR #89 introduced authenticated `POST /api/admin/calendar/events` with mapped source fields, server validation, durable AppSheet-compatible IDs, idempotent request IDs and formula/workflow protection.

Google OAuth was re-authorized with Sheets write scope. The first real write then exposed a P0 row-reservation bug caused by using `values.append` against an ID-only range. The affected historical row was manually recovered and PR #99 replaced that strategy with safe occupancy scanning/direct row targeting.

Final production create smoke:

- wrote to `REGISTRO` row 67;
- did not inherit workflow/payment data;
- synced cleanly to AppSheet;
- visible Admin confirmation shows `✓ Event created · REGISTRO row N`.

Controlled create is therefore **CLOSED/PASS**.

## Site Schedule + automatic Show Day — CLOSED/PASS

Architecture:

- canonical `REGISTRO`/AppSheet dates remain unchanged;
- D1 `site_schedule_state` stores website-only display overrides;
- source events may be split into non-overlapping website blocks;
- each block owns Start, End, Show Day boolean and Location;
- Location is required if Show Day is enabled;
- Admin Calendar + `Next` consume effective blocks;
- `?view=source` preserves canonical source spans;
- public Show Day comes from `GET /api/site/showday-status` in America/Bogota;
- failure fails closed to normal mode;
- Site Schedule never writes split dates, Show Day or Location to Sheets/AppSheet.

Real RENT source span was production-smoked as Aug 4–9, Aug 14–17, Aug 20–24 and Aug 27–28.

PR #100 now filters the Site Schedule source selector to ongoing/future work only while preserving historical overrides and Calendar history.

## Visual audit — ACTIVE

The required audit covers:

- Home + all current public route families;
- desktop + mobile separately;
- normal + Show Day;
- EN/ES + COL/INT branches where applicable;
- Admin Dashboard, Finance, Calendar, Site Schedule and Editor desktop/mobile.

Findings use P0–P3. P0/P1 must close before stabilization PASS; P2/P3 stay explicitly tracked.

Recent closed visual findings:

- PR #101: Privacy/Cookie preferences moved to bottom footer legal area.
- PR #102: footer logo follows Show Day; dot blinks.
- PR #103: desktop footer rebalanced.
- PR #104: branded copyright `SD.Live` dot restored without stray literal period.
- PR #105: mobile Show Day Location separated 2 px farther below logo — production user QA PASS.

Current open visual findings:

- Rental drawer/header is too tall on mobile and should clearly communicate **rental quote request / cotización**, not ecommerce checkout.
- Verify/fix low-contrast Trusted By/supported-brand marks across desktop/mobile and normal/Show Day.
- Complete the remaining public route matrix.
- Complete the Admin visual audit; it is mandatory and not optional.

**Priority discipline:** implement visual findings as the active audit reaches them; do not jump to unrelated milestones without reason.

## Show Day low-priority polish

Approved backlog, not current gate:

- dynamic Show Day favicon;
- remove normal-violet → Show Day-red startup popping using authoritative prepaint/edge state;
- favicon should use the same prepaint decision.

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

## Important files

### Public/runtime

- `index.html`
- `styles.css`
- `script.js`
- `showday-edge.js`
- `showday-runtime.js` / `showday-runtime.css`
- `worker-router.js` / `public-form-rate-limit.js`
- `site-schedule-api.js` / `site-schedule-store-v2.js`
- `security-headers.js` / `_headers`

### Admin

- `admin/index.html` / `admin/dashboard.js`
- `admin/dashboard.css`
- `admin/finance/`
- `admin/calendar/`
- `admin/calendar/site-schedule/`
- `admin/editor/`

### Documentation

- `PROJECT_STATUS.md` — current operational state.
- `ROADMAP_MASTER_CHECKLIST.md` — detailed historical/future backlog.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active audit contract.
- `docs/checkpoints/visual-audit-handoff-2026-08-23.md` — exact current continuation point.
- `docs/checkpoints/site-schedule-showday-2026-08-23.md` — closed Site Schedule/Show Day milestone.
- `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md` — historical OAuth gate evidence; not current gate.

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
production smoke where behavior changed
  ↓
close milestone / update evidence
```

Do not treat a feature-branch deployment as production.

## Current gate

**Continue the post-integration visual audit in sequence.** The next open public item is Rental quotation drawer/header clarity. After the public + Admin matrices are complete and all P0/P1 findings close, proceed to controlled Calendar edit/workflow actions.

Do not change spreadsheet source of truth, D1 Finance architecture, formula ownership or generic Finance permissions as part of visual stabilization.