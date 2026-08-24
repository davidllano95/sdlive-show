# SD.Live Control Center — Calendar / Operations Hub handoff

**Updated:** 2026-08-23 — America/Bogota  
**Status:** AppSheet multi-day **PASS** · Admin Calendar read-only **CLOSED/PASS** · controlled Admin create **CLOSED/PASS** · Site Schedule + automatic Show Day + Location **CLOSED/PASS** · Site Schedule source filter **PASS** · public header parity **PASS**.  
**Continuation point:** the required post-integration desktop/mobile visual audit is **ACTIVE**. Continue it in sequence before controlled edit/workflow UI expansion.

## 1. Permanent architecture / source of truth

- Google Sheets `REGISTRO` remains operations/finance persistence + formula owner.
- AppSheet **SD.Live Track** remains the primary mobile/offline workflow client.
- Admin Calendar is an additional authenticated operations client, not a competing database.
- No D1 mirror for operational/finance rows.
- D1 Site Schedule is a **website-only presentation layer**, not a finance/operations source-of-truth replacement.
- COP and USD remain strictly separated in Finance.
- Cloudflare Access remains the Admin security boundary.
- Generic Finance Phase 3 write-back remains blocked.

## 2. Permanent visual / brand rule

Every new or modified SD.Live surface must preserve the established brand palette/tokens of the surface it belongs to.

For private Admin:

- `admin/dashboard.css` shared tokens are authoritative;
- primary accent = `--accent: #a089e5` / `--accent-rgb: 160,137,229` unless the global Admin design system is deliberately changed;
- new modules use `var(--accent)` / `rgba(var(--accent-rgb), …)`;
- `--green`, `--amber`, `--danger` are semantic status colors only;
- desktop + mobile visual smoke includes palette consistency before closure.

Public-site work reuses the existing public brand/Show Day tokens.

## 3. Verified REGISTRO schema / ownership

`REGISTRO` has A:AB, with:

- **A — `Fecha trabajo`** = canonical start date;
- **AB — `Fecha fin`** = canonical end date.

`Fecha trabajo` was intentionally not renamed/moved because existing formulas/workflows depend on it.

### Ownership map

| Fields | Owner / behavior | Admin write direction |
| --- | --- | --- |
| `Fecha trabajo`, `Cliente`, `Proyecto / Show`, `Rol`, `Moneda`, `Valor bruto`, `Método de pago`, `Notas`, `NUM CONTACTO`, `Fecha fin` | Human/source fields | Eligible for controlled create/edit where relevant |
| `Estado` | Human-selectable + workflow-managed | Controlled; preserve AppSheet semantics |
| `Valor Recibido` | Human input at payment stage | Controlled payment workflow, not generic create |
| `Fecha cuenta enviada`, `Fecha evaluación`, `Fecha firma`, `Fecha pago` | Workflow-managed dates | Explicit workflow actions only |
| `ID` | Persisted AppSheet key | System identity; Admin create persists an AppSheet-compatible unique ID idempotently |
| `Mes`, `Año`, `Impuestos / Fees`, `Valor Neto`, `Días sin pagar`, `Month Number`, `Año Pago`, `Month Number (pago)`, `Mes de pago`, `Rango Aging`, `MES PAGO KEY` | Google Sheets array-formula columns | **Never write from Admin/AppSheet forms** |

Finance intentionally keeps its established read boundary unless separately changed. Calendar reads A:AB.

## 4. AppSheet multi-day configuration — PASS

Production AppSheet was manually verified with:

- `Fecha fin` as Date;
- Initial value = `[Fecha trabajo]`;
- end-before-start validation;
- `Fecha fin` immediately after `Fecha trabajo` in Nuevo Trabajo;
- Calendar Start = `Fecha trabajo`;
- Calendar End = `Fecha fin`;
- historical blank ends backfilled from start;
- successful sync.

This establishes canonical single/multi-day source dates. Site Schedule does not alter them.

## 5. Read-only Admin Calendar — CLOSED/PASS

Authenticated `GET /api/admin/calendar/events`:

- reads the same `REGISTRO`;
- resolves Calendar fields by normalized header name;
- converts Sheet dates to ISO server-side;
- falls blank end back to start;
- prevents backwards spans;
- returns sanitized Calendar data only.

Browser payload does not expose Notes, `NUM CONTACTO`, persisted Sheet ID, spreadsheet row numbers, OAuth secrets or formula-only Finance data.

Desktop + iPhone Calendar/Agenda production QA passed with real multi-day work.

## 6. Controlled Admin create — CLOSED/PASS

PR #89 introduced authenticated `POST /api/admin/calendar/events` with:

- mapped create fields only;
- server-side validation;
- workflow-safe initial state;
- AppSheet-compatible durable ID;
- idempotent request ID;
- no formula-column writes;
- no generic workflow-date/Valor Recibido write surface;
- no D1 fallback.

### OAuth authorization — resolved

The existing OAuth client was re-authorized with:

`https://www.googleapis.com/auth/spreadsheets`

The Worker refresh token was replaced and the production write boundary became available.

### P0 row-safety incident and recovery

The first write exposed a flaw in the original row reservation approach: `values.append` against the ID-only range selected an occupied early `REGISTRO` row and inherited stale workflow/payment cells.

Recovery was completed before continuing:

- the overwritten historical row was manually restored from the pre-smoke copy;
- AppSheet sync confirmed the restored record;
- no whole-row paste was used over formula-owned columns.

PR #99 then hardened create:

- removed `values.append` row reservation;
- scans relevant source/workflow-owned fields for occupancy;
- formula-only array columns do not mark rows occupied;
- workflow-only residue does mark rows occupied;
- writes directly to the first safe row after the last occupied source/workflow row;
- idempotent replay remains supported;
- response includes `rowNumber`;
- Admin shows `✓ Event created · REGISTRO row N`.

### Final production smoke — PASS

A controlled create wrote to `REGISTRO` row 67, contained no inherited evaluation/signature/payment/Valor Recibido values, synced to AppSheet cleanly and therefore closed controlled create as **PASS**.

Generic Finance Phase 3 remains blocked.

## 7. Site Schedule — CLOSED/PASS

### Decision

Canonical `REGISTRO` dates remain untouched. Site Schedule is exclusively for how work is represented on the website/Admin Calendar.

### Storage

Site Schedule uses dedicated D1 application table:

- `site_schedule_state`.

It does not depend on CMS content-entry/revision contracts.

### Block contract

Each block owns:

- Start date;
- End date;
- `Show Day` boolean;
- `Location`.

Rules:

- segments stay inside original source range;
- segments cannot overlap;
- Location max length is validated;
- Location required if `Show Day=true`;
- split dates, Show Day and Location never write to Sheets/AppSheet.

### Calendar behavior

- normal `GET /api/admin/calendar/events` applies Site Schedule overrides;
- `?view=source` returns canonical source spans;
- if no override exists, source span is displayed;
- Calendar `Next` consumes effective displayed blocks;
- D1 read failure falls back safely to source spans.

### Production RENT split — PASS

Real RENT source span Aug 4–28 was saved as:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

Calendar correctly shows gaps and `Next` follows effective block dates.

### Split Work source filter — PASS

PR #100 now shows only ongoing/future source work in **America/Bogota**:

- ongoing: `sourceStartDate <= today <= sourceEndDate`;
- future: `sourceStartDate > today`;
- past: `sourceEndDate < today` hidden from the selector.

This is an editor usability filter only:

- historical overrides remain persisted;
- past Calendar data remains available;
- `REGISTRO`/AppSheet unchanged;
- search runs only against eligible source work;
- Issue #83 Finance timing unchanged.

Production user check: **A / PASS**.

## 8. Automatic Show Day + Location — CLOSED/PASS

Public endpoint:

- `GET /api/site/showday-status`.

Behavior:

- today evaluated in America/Bogota;
- active only inside a block with `showDay=true` and Location;
- safe/minimal public payload;
- failure fails closed to normal mode;
- legacy visitor manual Show Day toggle removed at edge;
- Location visible only while Show Day active;
- secondary pages use the same Home-style header contract.

Recent visual audit refinement:

- PR #105 adds 2 px extra mobile-only separation between Show Day logo and Location; production user check **PASS**.

## 9. Public header parity — PASS

PR #96 normalizes `.seo-header` secondary pages at the edge to the Home header contract:

- canonical SD.Live logo;
- ON AIR;
- Location;
- Home navigation;
- EN/ES;
- Start Project CTA;
- mobile navigation.

Production theatre landing QA passed and secondary pages now feel like the same site.

## 10. Billing/reminder end-date follow-up — Issue #83 OPEN

Finance/AppSheet billing readiness and reminders must use the day after canonical **Sheets `Fecha fin`**, not the day after `Fecha trabajo`.

- single-day unchanged because end=start;
- multi-day eligibility starts after end;
- Site Schedule split dates do not alter Finance timing;
- preserve LiventX semantics.

## 11. Required post-integration visual audit — ACTIVE

Full contract:

- `docs/roadmap/post-integration-visual-audit-2026-08-23.md`.

Required scope remains:

- Home + every public route family;
- normal + automatic Show Day;
- desktop + mobile separately;
- EN/ES and COL/INT branches where applicable;
- Footer, Rental quote/cart, WhatsApp, headers, anchors, overflow, typography and brand contrast;
- `/admin/`, Finance, Calendar, Site Schedule and Editor desktop/mobile;
- P0/P1 fixed before audit close; P2/P3 explicitly preserved.

Current open public findings include Rental quote drawer/header clarity and verification of low-contrast Trusted By/supported-brand marks across both modes/device classes. Admin audit remains required and not yet closed.

## 12. Known low-priority Show Day polish

Approved backlog, not the current gate:

- dynamic favicon tied to authoritative Show Day state;
- eliminate normal-violet → Show Day-red startup popping with prepaint/edge state.

## 13. Current next action

**Continue the active visual audit in sequence.** The next open public item is Rental quotation drawer/header clarity. Compact it and make the quote-request nature explicit without changing backend pricing ownership or notification routing. Continue one manual production smoke at a time after each material visual fix.

Do not use this as permission to broaden into generic Finance writes or unrelated architecture changes.