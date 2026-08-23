# SD.Live Control Center — Calendar / Operations Hub handoff

**Updated:** 2026-08-23 — America/Bogota  
**Status:** Calendar schema gate **PASS**. AppSheet multi-day setup **PASS**. Admin read-only Calendar is the active implementation milestone.  
**Continuation point:** this document supersedes older Finance Phase 2 handoffs for deciding what to build next.

## Finance Phase 2 closure checkpoint

Finance Phase 2 core real-use QA is complete in production, including the dedicated `/admin/finance/` workspace, year/language controls, invoice eligibility, actionable worklists, LiventX workflow wording, pass-through calculator, Aging drilldowns and all five Data Quality drilldowns. Final Data Quality visual QA also passed.

Finance-wide generic Phase 3 write-back remains blocked. Calendar / Operations has a separately authorized, tightly scoped future write path to the same `REGISTRO` table after read-only Calendar is proven in production.

## Operational source of truth

- Google Sheets `REGISTRO` remains persistence + formula owner.
- AppSheet **SD.Live Track** remains the primary mobile/offline workflow client.
- Admin is an additional authenticated operations client, not a competing database.
- No D1 mirror for operational/finance rows.
- COP and USD remain strictly separated in Finance.
- Cloudflare Access remains the Admin security boundary.

## Verified REGISTRO schema

The workbook was inspected from the real `SD.Live Track.xlsx` source. `REGISTRO` originally contained A:AA (27 physical columns) and had no end-date field.

A new physical source column has now been added:

- **AB — `Fecha fin`**

`Fecha trabajo` remains the canonical **start date**. It was deliberately not renamed or moved because existing finance formulas and invoice eligibility depend on it.

### Ownership map

| Fields | Owner / behavior | Admin write direction |
| --- | --- | --- |
| `Fecha trabajo`, `Cliente`, `Proyecto / Show`, `Rol`, `Moneda`, `Valor bruto`, `Método de pago`, `Notas`, `NUM CONTACTO`, `Fecha fin` | Human/source fields | Eligible for controlled create/edit where relevant |
| `Estado` | Human-selectable + workflow-managed | Controlled; preserve AppSheet semantics |
| `Valor Recibido` | Human input at payment stage | Controlled payment workflow, not generic create |
| `Fecha cuenta enviada`, `Fecha evaluación`, `Fecha firma`, `Fecha pago` | Workflow-managed dates | Set by explicit workflow actions, not generic raw editing by default |
| `ID` | Persisted AppSheet key (`UNIQUEID()`) | System identity; future Admin create must generate/persist a compatible unique value idempotently |
| `Mes`, `Año`, `Impuestos / Fees`, `Valor Neto`, `Días sin pagar`, `Month Number`, `Año Pago`, `Month Number (pago)`, `Mes de pago`, `Rango Aging`, `MES PAGO KEY` | Google Sheets array-formula columns | **Never write from Admin/AppSheet forms** |

The existing Finance API intentionally still reads `REGISTRO!A:AA`; therefore adding AB does not change the Finance browser payload or formula behavior. Calendar reads A:AB separately.

## AppSheet multi-day configuration — PASS

Production AppSheet was updated and manually verified:

- `Fecha fin` regenerated into AppSheet and typed as **Date**.
- `Fecha fin` Initial value: `[Fecha trabajo]`.
- `Fecha fin` validation prevents end-before-start.
- `Fecha fin` was added immediately after `Fecha trabajo` in **Nuevo Trabajo**.
- Calendar Start date = `Fecha trabajo`.
- Calendar End date = `Fecha fin`.
- Existing rows with blank `Fecha fin` were backfilled from `Fecha trabajo` using a one-time Apps Script that only filled blank end dates; existing explicit multi-day ends were preserved.
- AppSheet Sync completed successfully after backfill.

Manual production QA passed:

1. existing one-day jobs remained visible;
2. a real multi-day RENT record rendered as one continuous Calendar span;
3. new jobs automatically receive `Fecha fin = Fecha trabajo`;
4. setting `Fecha fin` earlier than `Fecha trabajo` is rejected.

## Read-only Admin Calendar contract

The first Admin Calendar milestone is deliberately read-only.

Server source:

- authenticated `GET /api/admin/calendar/events`;
- reads `REGISTRO!A1:AB3000` from the same Google Sheet;
- requires the verified A:AB header contract;
- converts Sheets dates to ISO dates server-side;
- falls back blank `Fecha fin` to `Fecha trabajo` defensively;
- prevents malformed/backwards date data from generating backwards spans;
- returns date-quality counts for diagnostics.

Browser payload is sanitized to Calendar-relevant fields only:

- `startDate`
- `endDate`
- `client`
- `project`
- `role`
- `currency`
- `state`
- `multiDay`
- date-issue marker when applicable

It does **not** expose `Notas`, `NUM CONTACTO`, persisted `ID`, spreadsheet row numbers, OAuth secrets or formula-only Finance fields.

Admin workspace target:

- `/admin/calendar/`
- desktop month grid with continuous multi-day spans split correctly across week boundaries;
- mobile agenda fallback;
- previous / today / next navigation;
- current-month and multi-day counts plus next-event summary;
- links from Dashboard, Finance and Site Editor sidebars.

## Authorized future write boundary

The user explicitly authorized creating/editing Calendar/operations records from Admin so the Control Center can function without AppSheet when needed.

That future authorization covers authenticated operations rows in the same `REGISTRO`, using mapped source fields and persisted unique identity. It does **not** authorize arbitrary cells, formula overwrites, a D1 finance mirror, generic Finance Phase 3 writes or broad exposure of private Notes/contact fields.

### Planned create sequence after read-only production PASS

1. Define exact create form fields from the verified ownership map.
2. Validate auth, dates (`end >= start`), currencies/enums and required values server-side.
3. Generate/persist an AppSheet-compatible unique `ID` with idempotent retry behavior.
4. Append only source/workflow-safe columns; never formula columns.
5. Smoke the created row in Google Sheets.
6. Sync AppSheet and verify the same row appears correctly there.
7. Only then add edit + explicit workflow actions.

## Dashboard → AppSheet launcher

Still required. The exact real AppSheet **App Link / app URL / app ID** is not stored in the repository and must not be guessed. Obtain the actual link from AppSheet before wiring the launcher.

## Current next action

Ship the **read-only Admin Calendar** through CI, merge it, then perform production smoke one manual check at a time:

1. Calendar route opens under Cloudflare Access and reports online/read-only.
2. Existing single-day records appear.
3. The verified multi-day RENT record renders continuously across its date range.
4. Desktop month navigation works.
5. Mobile agenda remains usable.

Only after those checks pass should Admin create/write implementation begin.
