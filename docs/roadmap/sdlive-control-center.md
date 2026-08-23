# 14.5 — SD.Live as Control Center

**Reprioritized:** 2026-08-22 — America/Bogota  
**Architecture checkpoint:** 2026-08-23 — America/Bogota

**Status:** Active sequenced initiative. Finance audit/rename/source mapping and Finance Phase 2 are closed. Dedicated Finance workspace is closed/PASS. AppSheet multi-day + Admin Calendar read-only are closed/PASS. Site Schedule + automatic Show Day + Location are closed/PASS. **Current gate: controlled Calendar create is implemented but blocked on Google OAuth Sheets write authorization.** Generic Finance Phase 3 remains blocked. After create PASS, a required stabilization milestone will filter Site Schedule Split Work to ongoing/future work and run a detailed desktop/mobile visual audit before broader UI expansion.

This document owns sequence. Detailed evidence lives in checkpoints/specs under `docs/` and historical/future detail remains in `ROADMAP_MASTER_CHECKLIST.md`.

## Why this initiative exists

SD.Live is becoming a single operational control center rather than only a marketing/CMS site. The goal is to unify useful operations while preserving the systems that already work:

- Google Sheets `REGISTRO` for operations/finance persistence and formulas;
- AppSheet **SD.Live Track** for reliable mobile/offline capture and workflow;
- D1/R2 for CMS/application state and managed media;
- Cloudflare Access for Admin security;
- backend-owned pricing/transactional logic.

Moving quickly means following dependency order without creating parallel sources of truth.

## Workspace architecture

The Admin scales by **workspace**, not by making `/admin/` execute every subsystem.

- `/admin/` — lightweight Control Center Dashboard.
- `/admin/finance/` — dedicated Finance analytics workspace.
- `/admin/calendar/` — Calendar / Operations.
- `/admin/calendar/site-schedule/` — website-only schedule presentation + Show Day controls.
- `/admin/editor/` — Site Editor / CMS.

All remain behind the same Cloudflare Access boundary.

## Required sequence

### 1. Public performance/media baseline — ✅ CLOSED

P3.4 responsive image/media delivery closed with production smoke.

### 2. Security baseline — ✅ CLOSED

Public Contact/Rental rate limiting + baseline CSP/browser headers are live without breaking Admin/public flows.

### 3. Full finance audit — ✅ CLOSED

Decision: **repair + integrate; do not rewrite**.

The audit verified the real Google Sheets + AppSheet implementation and found no P0 corruption/data-loss reason to replace it. AppSheet offline capture is explicitly preserved as an asset.

Evidence: `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md`.

### 4. Brand-coherent rename — ✅ CLOSED

Final name: **SD.Live Track**.

The AppSheet user-facing name and Google Sheets file title changed without altering schema/formulas/internal identifiers unnecessarily. Mobile/offline launch smoke passed.

### 5. Finance Phase 1 — source-of-truth mapping — ✅ CLOSED

Field ownership was mapped against the real workbook/AppSheet configuration.

Locked decisions:

- `REGISTRO` remains persistence/formula owner;
- AppSheet remains offline workflow client;
- `ID` is the durable key; `_RowNumber` is not;
- formula-owned physical columns remain non-writable;
- notification Bots do not become state owners;
- no D1 finance mirror.

Evidence: `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md`.

### 6. Finance Phase 2 — read-only Admin insights — ✅ CLOSED/PASS

The first Control Center integration is live, private and read-only over the underlying Sheet/API.

It preserves:

- COP/USD separation;
- receivables/aging/collection logic;
- LiventX blocking semantics;
- privacy boundaries;
- server-side OAuth;
- no generic write endpoint;
- no D1 finance copy.

Evidence: `docs/checkpoints/sdlive-track-admin-finance-readonly-2026-08-22.md`.

### 6.1. Dedicated Finance workspace — ✅ CLOSED/PASS

Finance was separated from Dashboard startup after production QA showed that colocating both runtimes created mobile/desktop contention.

Permanent architecture:

- Dashboard remains lightweight;
- Finance owns `/admin/finance/`;
- Site Editor remains a sibling workspace;
- no finance ownership/data behavior changed.

Evidence: `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`.

### 7. AppSheet multi-day + Admin Calendar read-only — ✅ CLOSED/PASS

Canonical dates:

- `Fecha trabajo` = start;
- `Fecha fin` = end.

AppSheet setup, historical backfill, validation, Calendar start/end mapping and sync all passed.

Admin Calendar now reads the same `REGISTRO`, supports real multi-day spans, has mobile Calendar/Agenda and uses shared Admin brand tokens.

Evidence: `docs/roadmap/calendar-operations-hub-2026-08-23.md`.

### 8. Controlled Calendar create — 🚧 IMPLEMENTED / ACTIVE OAUTH GATE

PR #89 implemented authenticated controlled create against the same `REGISTRO`.

The endpoint:

- writes only mapped safe source fields;
- validates server-side;
- persists an AppSheet-compatible durable ID;
- is idempotent for retry protection;
- never writes formula-owned columns;
- does not expose private data in Calendar read payloads;
- has no D1 fallback.

Production smoke reached the Google Sheets write boundary and correctly stopped because the existing OAuth refresh token lacks write permission.

**Current required action:** re-authorize the existing Google OAuth client with:

`https://www.googleapis.com/auth/spreadsheets`

Then run exactly one create → Google Sheet → AppSheet smoke.

Evidence: `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md`.

### 9. Site Schedule + automatic Show Day — ✅ CLOSED/PASS

This is now implemented and no longer a future concept.

#### Site Schedule

- website-only D1 layer;
- own `site_schedule_state` table;
- canonical `REGISTRO` dates remain untouched;
- source events can be split into non-overlapping effective website blocks;
- Calendar + `Next` use effective blocks;
- `?view=source` preserves canonical source ranges.

Each block owns:

- start/end;
- Show Day boolean;
- Location.

Location is required when Show Day is enabled and never writes to AppSheet/Sheets.

#### Automatic Show Day

- public status: `GET /api/site/showday-status`;
- evaluated in America/Bogota;
- active only inside opted-in Site Schedule blocks;
- failure fails closed to normal mode;
- legacy visitor manual toggle removed;
- public Location shown only while active.

#### Production evidence

Real RENT Aug 4–28 source span was split into four website blocks:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

D1 persistence, Calendar gaps, `Next`, normal-mode behavior, automatic Show Day and Location all passed production QA.

PR #96 then unified secondary/SEO page headers with Home so public pages use the same logo/navigation/EN-ES/CTA/ON AIR/Location system. Theatre landing QA passed.

Evidence: `docs/checkpoints/site-schedule-showday-2026-08-23.md`.

### 9.1. Post-create stabilization — ⏳ REQUIRED AFTER CREATE PASS

This milestone was explicitly added after recent cross-surface changes exposed visually strange states. It does **not** interrupt the current OAuth gate.

#### Site Schedule source-list cleanup

Split Work/source selection must only show **ongoing or future** source jobs in `America/Bogota`:

- ongoing: `sourceStartDate <= today <= sourceEndDate`;
- future: `sourceStartDate > today`;
- past: `sourceEndDate < today` → hidden from the editor list.

Historical overrides and historical Calendar data remain preserved; this is only an editor usability filter and must not mutate Sheets/AppSheet.

#### Detailed visual audit

Run a dedicated visual audit across **desktop and mobile as separate first-class layouts**:

- Home plus every current public landing route family;
- normal + automatic Show Day states;
- shared headers, logo, Location, ON AIR, nav, CTA, EN/ES and COL/INT branches;
- typography, spacing, overflow, anchors, Rental cart, WhatsApp, footer and transitions;
- `/admin/`, Finance, Calendar, Site Schedule and Editor;
- mobile safe areas, menus, modals, date inputs, touch targets and horizontal overflow;
- desktop hover/focus/keyboard states;
- current Show Day violet→red startup popping and dynamic favicon backlog severity.

Findings use P0–P3 severity. Close all P0/P1 regressions before this stabilization milestone passes; retain P2/P3 explicitly in backlog.

Full audit matrix and exit criteria: `docs/roadmap/post-integration-visual-audit-2026-08-23.md`.

### 10. Controlled Calendar edit + explicit workflow actions — ⏳ NEXT AFTER CREATE + STABILIZATION PASS

Do not begin this until the OAuth gate, one end-to-end create smoke and the required post-create stabilization pass.

Expected direction:

- controlled source-field edits only;
- explicit workflow actions for billing/evaluation/signature/payment state;
- idempotent server writes;
- formula ownership preserved;
- no generic Sheet editor;
- no generic Finance Phase 3 expansion.

### 11. Finance Phase 3 — ⛔ BLOCKED

Only after Finance Phase 2 earns real-use trust and a separate write contract is approved.

Potential future direction remains draft-first/write-once with explicit mapping, idempotency, duplicate protection and rollback.

Calendar/Operations controlled writes do **not** constitute approval for this phase.

### 12. Availability-aware Contact / WhatsApp AI — eligible parallel track, not active

Detailed spec: `docs/roadmap/availability-aware-contact-widget.md`.

If promoted later:

- D1 availability state is authoritative;
- owner commands require exact authorization;
- AI qualifies leads only;
- AI never owns/invents pricing, rental catalog, availability or finance data;
- existing lead ownership is preserved.

### 13. Later Control Center modules — backlog

CRM, Projects, Rental Admin, deeper automation and consolidated operational reporting remain future work until their source-of-truth contracts are explicit.

## Billing/reminder integration follow-up — Issue #83 OPEN

Billing eligibility, `Por facturar` / `Flujo bloqueado` and relevant AppSheet reminders must use the day after **canonical Sheets `Fecha fin`**.

Site Schedule split dates do not affect Finance timing.

This must close before the overall AppSheet/Finance integration is declared complete.

## Approved low-priority Show Day polish

Not blockers for the OAuth/create gate:

- automatic Show Day favicon variant;
- remove startup normal-violet → Show Day red popping by resolving authoritative Show Day state before visible first paint, ideally at the edge;
- favicon and page visual state should share the same prepaint decision.

## Non-negotiable guardrails

- No second source of truth for pricing, leads or financial data.
- Financial data remains behind Cloudflare Access.
- Root `/admin/` must not auto-boot full Finance analytics.
- Google Sheets formula-owned columns are not writable from generic forms.
- Site Schedule is website presentation state only.
- AI qualification has no pricing/catalog/finance authority.
- Read-only/write-once comes before bidirectional sync.
- **Stability > novelty.**
- Brand palette/tokens are reused on every new/modified surface.

## Current continuation

**Do not reorder:**

1. Finish Google OAuth Playground re-authorization for Sheets write scope.
2. Retry one controlled Admin create.
3. Verify Google Sheets.
4. Sync and verify AppSheet.
5. Close create PASS.
6. Implement Site Schedule ongoing/future-only Split Work source filtering.
7. Run the required detailed desktop/mobile visual audit; fix P0/P1 regressions.
8. Close stabilization PASS.
9. Then consider controlled edit/workflow actions.

Generic Finance Phase 3 stays blocked. Site Schedule/Show Day functional milestone is already closed and should not be reopened without a regression.