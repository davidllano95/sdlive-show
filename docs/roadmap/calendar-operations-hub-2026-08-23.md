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

`Fecha trabajo` remains intentionally unmoved because existing formulas/workflows depend on it.

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

Google OAuth was re-authorized with Sheets write scope. The first real write exposed unsafe row reservation from `values.append`; the affected historical row was restored and PR #99 replaced that approach with safe occupancy scanning/direct row targeting.

Final production smoke:

- controlled create wrote to `REGISTRO` row 67;
- no inherited workflow/payment/Valor Recibido values;
- AppSheet sync clean;
- Admin confirmation shows `✓ Event created · REGISTRO row N`.

Generic Finance Phase 3 remains blocked.

## 7. Site Schedule — CLOSED/PASS

Canonical `REGISTRO` dates remain untouched. Site Schedule exists exclusively for website/Admin Calendar presentation.

Storage:

- D1 `site_schedule_state`.

Each block owns:

- Start date;
- End date;
- `Show Day` boolean;
- `Location`.

Rules:

- segments remain inside original source range;
- segments cannot overlap;
- Location max length is validated;
- Location required if `Show Day=true`;
- split dates, Show Day and Location never write to Sheets/AppSheet.

Calendar behavior:

- normal `GET /api/admin/calendar/events` applies Site Schedule overrides;
- `?view=source` returns canonical source spans;
- without override, source span is displayed;
- Calendar `Next` consumes effective displayed blocks;
- D1 read failure falls back safely to source spans.

Real RENT source span Aug 4–28 was saved as Aug 4–9, Aug 14–17, Aug 20–24 and Aug 27–28. Calendar correctly shows gaps and `Next` follows effective block dates.

### Split Work source filter — PASS

PR #100 shows only ongoing/future source work in **America/Bogota**:

- ongoing: `sourceStartDate <= today <= sourceEndDate`;
- future: `sourceStartDate > today`;
- past: `sourceEndDate < today` hidden from selector.

This is editor usability only; historical overrides/history remain preserved and `REGISTRO`/AppSheet are unchanged.

## 8. Automatic Show Day + Location — CLOSED/PASS

Public endpoint:

- `GET /api/site/showday-status`.

Behavior:

- today evaluated in America/Bogota;
- active only inside a block with `showDay=true` and Location;
- safe/minimal public payload;
- failure fails closed to normal mode;
- legacy visitor manual Show Day toggle removed;
- Location visible only while Show Day active;
- secondary pages use the same Home-style header contract.

PR #105 added 2 px extra mobile-only separation between Show Day logo and Location; production user QA PASS.

Future Admin-only QA/control override remains backlog only, recommended `Auto / Force On / Force Off`, explicit/reversible and preferably TTL-based. It must never mutate canonical `REGISTRO` dates or persisted Site Schedule blocks.

## 9. Public header parity — PASS

PR #96 normalizes `.seo-header` secondary pages at the edge to the Home header contract:

- canonical SD.Live logo;
- ON AIR;
- Location;
- Home navigation;
- EN/ES;
- Start Project CTA;
- mobile navigation.

Production theatre landing QA passed.

## 10. Billing/reminder end-date follow-up — Issue #83 OPEN

Finance/AppSheet billing readiness and reminders must use the day after canonical **Sheets `Fecha fin`**, not the day after `Fecha trabajo`.

- single-day unchanged because end=start;
- multi-day eligibility starts after end;
- Site Schedule split dates do not alter Finance timing;
- preserve LiventX semantics.

## 11. Required post-integration visual audit — ACTIVE

Full contract:

- `docs/roadmap/post-integration-visual-audit-2026-08-23.md`.

Current public progress through PR #116:

- Rental quote drawer is now explicitly a quotation/request flow; Show Day mobile+desktop EN+ES QA PASS;
- original Rental cart icon restored;
- Anima Producciones + Sonique now render white in all modes via `brightness(0) invert(1)` on only those two logo elements; original R2 media untouched; Show Day mobile QA PASS;
- normal-mode-specific QA remains pending while automatic Show Day is active;
- remaining public route matrix and mandatory Admin desktop/mobile audit remain open.

Do not use visual work to broaden into generic Finance writes or unrelated architecture changes.

## 12. Future Admin Calendar Agenda scope toggle — RECORDED, NOT ACTIVE

When promoted later, **Agenda mode** should expose a simple toggle between:

### Full Month

Show every effective Agenda item in the selected month, including entries already in the past.

### Current + Future

Show ongoing + future effective items and hide entries whose **effective end** is before today.

Implementation guardrails:

- evaluate today in **America/Bogota**;
- ongoing multi-day work remains visible while it is still active;
- this is a presentation/filter control only;
- do not delete, rewrite or hide data at the API/source level merely to support the toggle;
- historical `REGISTRO`, AppSheet and Site Schedule records remain intact;
- the chosen default (`Full Month` vs `Current + Future`) is deliberately **TBD** until implementation/UX review;
- desktop and mobile should use the same semantic model, with accessible toggle labels/state.

This future control is separate from the existing Site Schedule **Split Work source filter**, which already hides completed source work from the editor selector. Do not conflate the two behaviors.

## 13. Other future vendor/system considerations

- Attio is recorded as a future CRM candidate.
- Dapta.ai is recorded as a future AI chatbot/agent candidate.
- See `docs/roadmap/future-crm-ai-vendors-2026-08-23.md`.
- Neither candidate may silently become Finance/`REGISTRO` source of truth or write formula-owned columns.

## 14. Current next action

**Continue the active visual audit in sequence.** Rental Show Day and the accepted Anima/Sonique contrast treatment are closed. Continue the remaining public matrix and then the mandatory Admin desktop/mobile review, one manual QA action at a time. Controlled Calendar edit/workflow expansion comes only after stabilization PASS.
