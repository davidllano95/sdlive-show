# SD.Live Control Center — Calendar / Operations Hub handoff

**Updated:** 2026-08-23 — America/Bogota  
**Status:** AppSheet multi-day **PASS** · Admin Calendar read-only **CLOSED/PASS** · Site Schedule + automatic Show Day + Location **CLOSED/PASS** · public header parity **PASS**. Controlled Admin create is implemented but production write remains **BLOCKED on Google OAuth Sheets write scope**.  
**Continuation point:** re-authorize the existing Google OAuth connection, then run one controlled create → Google Sheet → AppSheet smoke.

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

Public-site work reuses the existing public brand/Show Day tokens. PR #87 closed Calendar palette parity on iPhone.

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

Production AppSheet was updated and manually verified:

- `Fecha fin` is Date;
- Initial value = `[Fecha trabajo]`;
- validation rejects end-before-start;
- `Fecha fin` follows `Fecha trabajo` in Nuevo Trabajo;
- Calendar Start = `Fecha trabajo`;
- Calendar End = `Fecha fin`;
- historical blank ends were backfilled from start without overwriting explicit ends;
- Sync completed successfully.

Manual QA passed for existing one-day jobs, real multi-day RENT, new one-day defaults and invalid end rejection.

## 5. Read-only Admin Calendar — CLOSED/PASS

Authenticated `GET /api/admin/calendar/events`:

- reads the same `REGISTRO`;
- resolves only required Calendar fields by normalized header name;
- converts Sheets dates to ISO server-side;
- defensively falls blank end back to start;
- prevents backwards spans;
- returns sanitized Calendar data only.

Browser payload does not expose Notes, `NUM CONTACTO`, persisted Sheet ID, spreadsheet row numbers, OAuth secrets or formula-only Finance data.

Production QA passed desktop + iPhone Calendar/Agenda, real multi-day RENT and N. Jade spans, one-day events and shared Admin palette.

## 6. Controlled Admin create — IMPLEMENTED, OAuth-gated

PR #89 implemented authenticated `POST /api/admin/calendar/events`.

Contract:

- accepts only mapped source/create fields;
- server validates required values, dates, enums/currency and numeric fields;
- one-day work defaults end = start;
- initial state remains workflow-safe;
- durable AppSheet-compatible ID is generated/persisted;
- request ID provides idempotent retry/duplicate protection;
- formula-owned columns are never written;
- workflow dates/Valor Recibido are not exposed as generic create fields;
- Notes/contact can be accepted on create without appearing in Calendar read payloads;
- there is no D1 fallback if Sheets write fails.

### Production write result

The first real create smoke reached the Google Sheets authorization boundary and returned:

> Google Sheets write permission is not authorized for this connection yet.

No row was written.

The existing refresh token is sufficient for read-only Finance/Calendar but lacks write-capable Sheets authorization.

### Active OAuth gate

Re-authorize the **existing** OAuth client with:

`https://www.googleapis.com/auth/spreadsheets`

Then:

1. replace only the Worker refresh token if the authorization produces a new one;
2. retry exactly one controlled `QA Admin / CREATE SMOKE` row;
3. verify it in Google Sheets;
4. sync AppSheet;
5. verify the same persisted record in AppSheet;
6. only after PASS, close create and proceed toward controlled edit/workflow actions.

Checkpoint: `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md`.

## 7. Site Schedule — CLOSED/PASS

### Decision

Canonical `REGISTRO` dates remain untouched. Site Schedule is exclusively for how work is represented on the website/Admin Calendar.

A broad source event can be split into several real presentation blocks, useful when the source row covers an overall engagement but the website should only show actual working days.

### Storage

After production persistence debugging, Site Schedule uses its own D1 application table:

- `site_schedule_state`.

It no longer depends on CMS content-entry/revision contracts. This keeps the operational presentation layer isolated from editorial CMS data.

### Block contract

Each block owns:

- Start date;
- End date;
- `Show Day` boolean;
- `Location`.

Rules:

- segments stay inside the original source range;
- segments cannot overlap;
- Location max length is validated;
- Location is required if `Show Day=true`;
- split dates, Show Day and Location never write to Sheets/AppSheet.

### Calendar behavior

- normal `GET /api/admin/calendar/events` applies Site Schedule overrides to display events;
- `?view=source` returns canonical source spans for the editor;
- if no override exists, source span is displayed;
- Calendar `Next` consumes effective displayed blocks;
- D1 read failure fails safe to source spans rather than breaking Calendar.

### Production RENT split — PASS

The real RENT source span Aug 4–28 was saved as:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

Production Calendar correctly shows four blocks with gaps. `Next` also follows the effective block dates.

## 8. Automatic Show Day + Location — CLOSED/PASS

Public endpoint:

- `GET /api/site/showday-status`.

Behavior:

- today evaluated in America/Bogota;
- active only inside a Site Schedule block with `showDay=true` and a Location;
- safe/minimal public payload;
- failure fails closed to normal mode;
- refreshes periodically;
- legacy visitor manual Show Day toggle is removed at the edge;
- Location is visible publicly only while Show Day is active.

Production QA passed:

- all block switches OFF → normal site, no manual button;
- active RENT block Show Day ON → public site changes automatically;
- configured Location appears correctly;
- state remains independent from AppSheet.

## 9. Public header parity — PASS

Initial landing-page smoke showed a different simplified SEO header even though Show Day was active. The desired contract was clarified: **all public pages should feel like one site and use the Home header behavior**.

PR #96 now normalizes `.seo-header` pages at the edge to the same Home header structure:

- canonical SD.Live logo treatment;
- ON AIR state;
- Location below the logo;
- Home navigation menu;
- EN/ES control;
- Start Project CTA;
- mobile navigation behavior.

Production theatre landing QA returned PASS and the original menus make the secondary route feel like the same site rather than a disconnected landing.

## 10. Known low-priority Show Day polish

Approved backlog, not part of the current gate:

### Dynamic favicon

Add a Show Day favicon variant and automatically switch the page favicon from the same authoritative Show Day state.

### Remove startup popping

Current active Show Day can first-paint normal violet and then switch to red after `/api/site/showday-status` resolves. Future hardening should resolve/inject Show Day state before visible paint, ideally at the edge, while failing closed to normal mode.

Dynamic favicon should be tied to the same prepaint state so favicon and page never disagree.

## 11. Billing/reminder end-date follow-up — Issue #83 OPEN

Finance/AppSheet billing readiness and invoice reminders must use the day after canonical **Sheets `Fecha fin`**, not the day after `Fecha trabajo`.

- single-day behavior remains equivalent because end=start;
- multi-day eligibility starts the day after end;
- Site Schedule split dates do **not** alter this finance rule;
- preserve LiventX workflow semantics;
- complete before the overall AppSheet/Finance integration is closed.

## 12. Current next action

**Do not open another feature milestone. Continue the OAuth gate.**

The first manual step is to use Google OAuth Playground to re-authorize the existing OAuth client for Sheets write scope. Proceed one manual action at a time.

After controlled create passes end-to-end, the next Calendar milestone may be controlled edit + explicit workflow actions. Generic Finance Phase 3 remains blocked.
