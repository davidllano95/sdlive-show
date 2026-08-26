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
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md` for historical/future backlog;
7. older prompts/ideas/references.

Do not replace a working source of truth because a future document imagines another architecture. **Stability > novelty.**

## Current state

As of **2026-08-25 America/Bogota**:

- Finance read-only integration and dedicated `/admin/finance/` workspace — **operational**, with latest connection hotfix PR #137 merged/CI green and production smoke pending.
- Admin Calendar read-only + multi-day model — **CLOSED/PASS**.
- Controlled Admin Calendar create — **CLOSED/PASS** after OAuth write authorization and row-safety hardening.
- Site Schedule + automatic Show Day + Location — **CLOSED/PASS**.
- Admin-only Show Day QA override `Auto / Force On / Force Off` — **CLOSED/PASS**.
- Shared Home-style header on current public route families — **PASS**.
- Public-site stabilization has merged the current Rental, Testimonials, Trusted/Supported Brands and accessibility fixes through PR #131; issue #124 retains the final representative public smoke ledger.
- **Active gate:** mandatory Admin desktop/mobile visual audit using record-first → batch-fix workflow.
- Known Admin/CMS requirements are tracked in issue #126: global logo/image scale to **250%** and persistent repeatable-card reordering.
- Generic Finance Phase 3 write-back — **BLOCKED**.

The exact current continuation point lives in `PROJECT_STATUS.md`.

## Change workflow

For material repository changes:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → one production smoke for runtime changes`.

During visual audit, record all findings in a coherent surface first and batch them later. P0/P1 blocking regressions are the normal exception.

## Current architecture

### Public site

- Frontend: vanilla HTML/CSS/JavaScript.
- Hosting/runtime: Cloudflare Workers + Static Assets.
- Analytics: GTM + GA4 with consent gating.
- Forms: Turnstile + D1 + Resend.
- Languages: EN / ES with persisted preference where supported.
- Markets: Colombia / International behavior.
- Public header contract: Home is canonical; current SEO/service landings are normalized at the edge to the same Home header structure, including navigation, CTA, EN/ES, Show Day and Location.

### CMS / media

- D1 binding `CMS_DB` → `sdlive-cms-production`.
- R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- Public media domain: `media.sdlive.show`.
- Hero, Trusted By / Supported Brands, Testimonials, Core Home, Rental/Contact presentation and reusable Media Library are established.
- Visual safeguards: `visual-safeguards.css` + `visual-safeguards.js`.
- Global Select routes selection to owning CMS sections/items.
- Managed logos/images remain R2-owned; presentation-only changes should not duplicate source assets unnecessarily.

### Private Admin / Control Center

All Admin workspaces remain behind Cloudflare Access.

- `/admin/` — lightweight Dashboard / system overview + Show Day Visual QA.
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
| Admin visual tokens | `admin/dashboard.css` |
| Operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflow | AppSheet SD.Live Track |
| Finance Admin analytics | read-only Worker view over Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Automatic public Show Day | Site Schedule + America/Bogota date |
| Show Day Location | Site Schedule block only |

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

Invoice eligibility now uses the canonical end date:

- end before today → **Por facturar** when otherwise eligible;
- end today/future/invalid → **Flujo bloqueado**;
- legacy rows without `Fecha fin` may fall back to `Fecha trabajo`.

Issue #83 now mainly remains for aligning AppSheet reminders/bots to that same day-after-`Fecha fin` rule.

## Finance current capabilities

The dedicated workspace includes:

- Por facturar / Cobrable ahora / Flujo bloqueado action queues;
- Aging drilldowns;
- Data quality worklists;
- monthly/all-time analytics and tax reserve;
- pass-through/third-party retention calculator;
- header-by-name schema normalization;
- deterministic date normalization so ambiguous Google-formatted dates do not generate false negative payment durations;
- LiventX ready-to-sign queue and monthly review starting on the 20th;
- direct LiventX supplier portal CTA to `https://proveedores.aoscentral.com`.

### Latest Finance reliability hotfix — PR #137

After a real production regression left Finance indefinitely at `Connecting to SD.Live Track…`, PR #137 added:

- bounded upstream Google OAuth/Sheets timeout;
- the previously proven formatted-date transport;
- immediate normalization of Finance date columns back to numeric Sheets serials before existing Finance parsers consume them;
- a UI guard that cannot remain indefinitely in `Connecting…` and keeps the outer workspace status consistent with the real Finance state;
- regression tests for ambiguous dates and rate-limit/worker-entry delegation.

PR #137 is merged and CI green. A single production smoke is still required before marking the hotfix production PASS.

## LiventX workflow

`LiventX · Listo para firmar` contains records where:

- client is LiventX;
- evaluation date exists;
- signature date is missing;
- record is not paid and is beyond `Pendiente Envio`.

The queue is always visible and receives monthly emphasis from the **20th** through month end. The card/modal links directly to `https://proveedores.aoscentral.com`; Finance remains read-only and does not mark signatures itself.

## Calendar / Site Schedule / Show Day

Calendar reads the same `REGISTRO` and supports canonical multi-day spans. Controlled create writes only mapped human/source fields into a safe row and leaves formula/workflow ownership intact.

Site Schedule is separate website-only D1 presentation state:

- source events may be split into non-overlapping blocks;
- each block owns Start, End, Show Day boolean and Location;
- source selector uses ongoing + future work in America/Bogota;
- Site Schedule never writes split dates, Show Day or Location to Sheets/AppSheet.

Automatic Show Day comes from Site Schedule + America/Bogota. The public visitor toggle is gone. Admin has a temporary QA override `Auto / Force On / Force Off` that is separate from canonical data and expires at Bogotá day-end.

Future Show Day concurrency should use an explicit **Primary / Secondary** presentation priority rather than showing multiple cramped Locations; multiple active Primary blocks should surface an Admin conflict.

## Public visual stabilization

Current merged public corrections include:

- footer/legal/header consistency;
- Anima Producciones + Sonique contrast without modifying source R2 media;
- local contrast/semantics/accessibility fixes;
- WhatsApp CTA consistency on public service/SEO landings;
- Rental empty-request protection + browser/backend pricing parity test;
- BetaThree PA reduced to roughly one card in a three-card desktop PA grid;
- stable mobile Supported Brands layouts for Misi/Wonderlust;
- Testimonials progressive disclosure with synchronized reveal, natural short-card height, viewport-preserving collapse and EN/ES expansion preservation.

Issue #124 remains the final representative public smoke ledger. Do not declare the entire public audit formally closed without explicit smoke acceptance.

## Admin visual audit — active next block

Inspect, one manual action at a time, but **record findings without fixing each one immediately**:

1. `/admin/` desktop;
2. `/admin/` mobile;
3. `/admin/finance/` desktop;
4. `/admin/finance/` mobile;
5. `/admin/calendar/` desktop;
6. `/admin/calendar/` mobile;
7. `/admin/calendar/site-schedule/` desktop;
8. `/admin/calendar/site-schedule/` mobile;
9. `/admin/editor/` desktop;
10. `/admin/editor/` mobile.

Issue #126 is the live Admin finding ledger. Already-required items:

- all CMS-managed logos/images must support scale up to **250%**, including Testimonials and every other applicable editor;
- repeatable cards/collections must have persistent reordering with explicit drag handles plus accessible move up/down controls.

After all Admin surfaces are inspected, reconcile the issue against current `main` and implement one coherent stabilization batch.

## Future roadmap highlights

- `docs/roadmap/future-finance-document-generator-2026-08-25.md`: shared branded generator for **Cuenta de cobro / Cotización / Factura or invoice draft**, reusing existing Finance/Rental/client data and not creating a second finance source of truth. Real Colombian electronic invoicing requires explicit DIAN-compliant design/provider integration before it can be represented as legally valid.
- Calendar Agenda scope filter: `Full Month` vs `Current + Future`.
- Controlled Calendar edit/workflow actions after stabilization.
- Finance reminder delivery hardening.
- Attio CRM and Dapta.ai remain future candidates only.
- Show Day favicon/prepaint polish and Primary/Secondary concurrency model remain backlog.

## Relevant docs

- `PROJECT_STATUS.md` — exact current status and continuation point.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active visual audit contract.
- `docs/roadmap/finance-phase2-real-use-2026-08-23.md` — Finance real-use/current workflow details.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — future document generator.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule contract.
- `docs/roadmap/future-crm-ai-vendors-2026-08-23.md` — future vendor research.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog; lower precedence than current-state docs.

## Immediate continuation

1. Reload `/admin/finance/` and production-smoke PR #137. Finance must leave `Connecting to SD.Live Track…`; it should load normally, or fail visibly within the bounded timeout rather than hang.
2. If PASS, record the hotfix smoke as PASS.
3. Resume the Admin visual audit from `/admin/` desktop and continue one surface at a time, adding findings to #126 without piecemeal fixes.
