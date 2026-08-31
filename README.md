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

As of **2026-08-31 America/Bogota**:

- Finance read-only integration and `/admin/finance/` — **OPERATIONAL / production-smoked PASS**; PR #141 freeze regression remains closed.
- Admin Calendar + controlled create + multi-day operations — **CLOSED/PASS**.
- Site Schedule + automatic Show Day + Location — **CLOSED/PASS**.
- Admin-only Show Day QA override `Auto / Force On / Force Off` — **CLOSED/PASS**.
- Admin desktop/mobile stabilization — **CLOSED/PASS**; issue #126 completed.
- Google Calendar integration to `sam@sdlive.show` — **OPERATIONAL / production-smoked PASS through PR #150**: REGISTRO work projection, Site Schedule V2 block projection, read-only manual/recurring overlay and monthly collection reminders.
- Shared Home-style header on current public route families — **PASS**.
- Public-site stabilization fixes through PR #131 remain merged; issue #124 still owns the final representative public-smoke ledger.
- **Current gate:** resolve or explicitly defer public smoke #124, then select the next roadmap module.
- Generic Finance Phase 3 write-back — **BLOCKED**.

The exact current continuation point lives in `PROJECT_STATUS.md` and `docs/checkpoints/handoff-admin-stabilization-2026-08-31.md`.

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
- Managed logos/images remain R2-owned; presentation-only changes should not duplicate source assets unnecessarily.
- Visual safeguards and publish failsafe remain part of the Editor boundary.

### Private Admin / Control Center

All Admin workspaces remain behind Cloudflare Access.

- `/admin/` — lightweight Dashboard / system overview + Show Day Visual QA.
- `/admin/finance/` — read-only SD.Live Track analytics/workflow workspace; COP/USD separate.
- `/admin/calendar/` — Calendar / Operations over `REGISTRO`, including multi-day, controlled create, authenticated Google sync and read-only Google overlay.
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

Invoice eligibility:

- canonical end before today → **Por facturar** when otherwise eligible;
- end today/future/invalid → **Flujo bloqueado**;
- legacy rows without `Fecha fin` may fall back to `Fecha trabajo`;
- today is America/Bogota.

Issue #83 mainly remains for aligning AppSheet reminders/bots to the same day-after-`Fecha fin` rule.

## Finance current capabilities

The dedicated workspace includes:

- Por facturar / Cobrable ahora / Flujo bloqueado action queues;
- Aging drilldowns;
- Data quality worklists;
- monthly/all-time analytics and tax reserve;
- pass-through/third-party retention calculator;
- header-by-name schema normalization;
- deterministic date normalization so ambiguous Google-formatted dates do not generate false negative payment durations;
- `LiventX · Listo para firmar` queue with monthly emphasis from the 20th;
- direct supplier portal CTA to `https://proveedores.aoscentral.com`.

### Finance reliability closeout — PR #141

A production regression caused `/admin/finance/` to remain on `Connecting to SD.Live Track…` and eventually make Safari unresponsive.

The root cause was a DOM-wide `MutationObserver` in the LiventX portal-link runtime. Its callback changed text/attributes inside the same observed subtree, creating a mutation → callback → mutation loop capable of saturating the main thread. Once saturated, browser timeouts could not execute, which made the issue look like a Google/Sheets connection hang.

PR #141:

- removed the DOM-wide LiventX observer;
- moved portal-link updates to explicit click/keyboard/language events;
- made link updates idempotent;
- cache-busted the affected runtime;
- expanded Finance freeze regression coverage so Finance runtimes cannot reintroduce this DOM-wide observer pattern.

**Production smoke: PASS. Finance loads again and the page remains responsive.**

Earlier #137/#139/#140 connection guards remain historical context; the current checkpoint is `docs/checkpoints/handoff-pr141-2026-08-25.md`.

## LiventX workflow

`LiventX · Listo para firmar` contains records where:

- client is LiventX;
- evaluation date exists;
- signature date is missing;
- record is not paid and is beyond `Pendiente Envio`.

The queue is always visible and receives monthly emphasis from the **20th** through month end. Finance remains read-only and signing occurs externally at `https://proveedores.aoscentral.com`.

## Calendar / Site Schedule / Show Day

Calendar reads the same `REGISTRO` and supports canonical multi-day spans. Controlled create writes only mapped human/source fields into a safe row and leaves formula/workflow ownership intact.

Site Schedule is separate website-only D1 presentation state:

- source events may be split into non-overlapping blocks;
- each block owns Start, End, Show Day boolean and Location;
- source selector uses ongoing + future work in America/Bogota;
- Site Schedule never writes split dates, Show Day or Location to Sheets/AppSheet.

Automatic Show Day comes from Site Schedule + America/Bogota. The public visitor toggle is gone. Admin has a temporary QA override `Auto / Force On / Force Off` separate from canonical data and expiring at Bogotá day-end.

Google Calendar is a secondary integration surface, not a source of operational truth. Explicit `Sync Google Calendar` reconciles REGISTRO/AppSheet work into `sam@sdlive.show`; Site Schedule V2 blocks replace only their own SD.Live broad parent projections; manual/recurring Google events are read-only overlay data. PR #150 aligned Google reconciliation with the same `site_schedule_state` store used by Admin and Show Day.

Future simultaneous Show Day behavior should use explicit **Primary / Secondary** presentation priority instead of cramming multiple Locations into the header.

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

## Admin stabilization — closed

The full Admin desktop/mobile audit and coherent stabilization batch are complete. Issue #126 is closed.

Accepted scope includes shared shell/readability/navigation, mobile drawer behavior, Editor CMS scale/order/header contracts, Rental presentation stabilization, Finance LiventX visual cycle, Calendar mobile hierarchy, Site Schedule desktop/mobile workflow and Google Calendar integration.

Final production verification after PR #150 confirmed:

- `RENT` projects as four Site Schedule blocks instead of one broad date range;
- `JPN - Cubo Colsubsidio` and `N. Jade` Site Schedule projections exist;
- day-5/day-19 09:00 Bogotá collection reminders exist and are transparent;
- manual/recurring Google items remain untouched by reconciliation;
- REGISTRO/AppSheet and Site Schedule V2 retain their existing ownership boundaries.

Do not restart the Admin audit unless a new regression appears.

## Future roadmap highlights

- `docs/roadmap/future-finance-document-generator-2026-08-25.md`: shared branded generator for **Cuenta de cobro / Cotización / Factura or invoice draft**, reusing existing Finance/Rental/client data and not creating a second finance source of truth. Real Colombian electronic invoicing requires explicit DIAN-compliant design/provider integration before it can be represented as legally valid.
- Calendar Agenda scope filter: `Full Month` vs `Current + Future`.
- Controlled Calendar edit/workflow actions after stabilization.
- Finance reminder delivery hardening.
- Attio CRM and Dapta.ai remain future candidates only.
- Show Day favicon/prepaint polish and Primary/Secondary concurrency model remain backlog.

## Relevant docs

- `PROJECT_STATUS.md` — exact current status and continuation point.
- `docs/checkpoints/handoff-admin-stabilization-2026-08-31.md` — latest handoff after Admin stabilization + Google Calendar production acceptance.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active visual audit contract.
- `docs/roadmap/finance-phase2-real-use-2026-08-23.md` — Finance real-use/current workflow details.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — future document generator.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule contract.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog; lower precedence than current-state docs.

## Immediate continuation

Admin stabilization is **closed/PASS through PR #150** and issue #126 is completed. Do not spend another smoke on it unless a new regression appears.

The remaining post-integration visual debt is the separate public representative-smoke ledger in issue #124. Finish that smoke, or explicitly defer it with evidence. After that, select the next roadmap module deliberately; `SD.Live Patch` is eligible for prioritization but is not automatically active.
