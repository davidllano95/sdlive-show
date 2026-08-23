# SD.Live Control Center — Calendar / Operations Hub handoff

**Updated:** 2026-08-23 — America/Bogota  
**Status:** Active gate after Finance Phase 2 production QA.  
**Supersedes as continuation point:** the older Finance Phase 2 handoff for deciding what to build next. Finance remains a valid historical/operational reference, but Calendar / Operations Hub is now the active development track.

## Finance Phase 2 closure checkpoint

Finance Phase 2 core real-use QA is complete in production.

Validated milestones include:

- dedicated `/admin/finance/` workspace on desktop and iPhone;
- year selector and ES/EN toggle;
- invoice eligibility by work date;
- actionable `Por facturar`, `Cobrable ahora` and `Flujo bloqueado` drilldowns;
- LiventX action wording aligned to the real workflow: **Enviar evaluación** and **Firmar factura**;
- SD.Live-branded worklist styling;
- pass-through / third-party retention calculator with a real-use reconciliation case;
- calculator **Limpiar / Clear** behavior;
- Aging `0–30 / 31–60 / 61+` drilldowns;
- Data quality drilldowns for all five existing warnings;
- final Data quality row visual cleanup: clean `label | count badge` layout, no standalone arrow, whole warning row remains clickable.

Production QA for Data quality confirmed that a non-zero warning opens the correct affected records and corrective action, and the final simplified warning-row layout was accepted by the user.

Finance-wide generic Phase 3 write-back remains blocked unless separately authorized. The Calendar / Operations Hub write-path below is a specifically authorized exception after its schema gate is completed.

## Active objective

Turn the SD.Live Admin into a practical operational command center that remains useful when AppSheet is unavailable or inconvenient, while preserving the existing Google Sheets + AppSheet workflow and source of truth.

The Calendar / Operations Hub must provide:

1. a Calendar view inside Admin using SD.Live Track jobs/events;
2. correct multi-day event rendering in Admin;
3. correct multi-day event rendering in AppSheet;
4. the ability to create jobs/events from Admin;
5. later, the ability to edit existing jobs/events from Admin;
6. an Admin form covering all genuine human-editable/source fields required by the workflow;
7. formula/derived fields continuing to be owned by Google Sheets/AppSheet logic rather than being manually overwritten;
8. compatibility with existing Finance calculations, COP/USD separation and LiventX workflow semantics;
9. a direct Dashboard → SD.Live Track/AppSheet mobile launcher.

## Source-of-truth rules

- Google Sheets `REGISTRO` remains the persistence/formula owner.
- AppSheet **SD.Live Track** remains the primary mobile/offline capture and workflow client.
- Admin becomes an additional authenticated operations client, not a competing database.
- Do not create a D1 mirror for operational/finance rows.
- Do not move formula ownership from Sheets into Admin merely to support Calendar.
- Do not create duplicate business rules in AppSheet and Admin when a shared source-of-truth rule can be used instead.

## Calendar schema gate — must complete before write implementation

The currently verified `REGISTRO` schema contains `Fecha trabajo` but no verified explicit event-end date field.

Before adding any Admin write endpoint:

1. Inspect the current Google Sheets workbook and AppSheet field mapping.
2. Classify every `REGISTRO` field as one of:
   - **User input** — entered by AppSheet/Admin;
   - **Formula/derived** — owned by Sheets;
   - **Workflow-managed** — set by AppSheet actions/bots or controlled workflow actions;
   - **Read-only/system** — key/helper/internal fields not typed by the user.
3. Define a shared start/end date model for single-day and multi-day events.
4. Do not overload an unrelated existing column as an end date.
5. If a new field is required, add it deliberately to Sheets and AppSheet, then regenerate/resync AppSheet columns before configuring Calendar.
6. Define the AppSheet Calendar Start/End mapping against that shared model.
7. Define Admin Calendar serialization against the same model.
8. Preserve existing invoice eligibility semantics that depend on `Fecha trabajo`; explicitly decide whether that field remains start date or whether finance logic should use another source field.
9. Define validation for `end >= start` and a deterministic single-day fallback.
10. Define idempotent create behavior around the persisted `ID` so retries cannot create duplicate events.

## Initial date-model hypothesis — not yet authorized as schema

Preferred direction to validate against the real workbook/AppSheet setup:

- `Fecha trabajo` remains the canonical **start date** for backward compatibility with existing finance formulas/rules.
- Add a dedicated **end date** field only if the current workbook truly lacks one.
- For single-day work, end date should resolve to the same calendar day as start date, either explicitly or via a safe AppSheet/Admin fallback.
- For multi-day work, end date must be later than or equal to start date.

This is a hypothesis only until the workbook and AppSheet configuration are inspected. Do not modify production schema based only on this paragraph.

## Admin write authorization boundary

The user explicitly authorized creating/editing Calendar/operations rows from Admin so the system can be used as a command center even without AppSheet.

That authorization covers:

- authenticated Admin create for operational/job records;
- authenticated Admin edit for those same records after create is proven safe;
- writing legitimate source/input fields into the same Google Sheets `REGISTRO` used by AppSheet;
- assigning/using a persisted unique ID in an idempotent way.

It does **not** automatically authorize:

- arbitrary spreadsheet cell editing;
- generic Finance Phase 3 write-back;
- moving persistence to D1;
- overwriting formula columns;
- exposing `Notas`, phone/contact data or internal IDs to unrelated browser surfaces;
- bypassing AppSheet/Sheets workflow semantics.

## AppSheet multi-day requirement

AppSheet must be corrected so multi-day jobs display as multi-day Calendar events rather than as a one-day item.

Implementation sequence after schema is decided:

1. add/regenerate the end-date column in AppSheet if required;
2. verify AppSheet types are Date (not accidental Text/DateTime unless intentionally needed);
3. configure the Calendar view Start date and End date fields;
4. confirm single-day rows still render once;
5. confirm a real multi-day test row spans all intended days;
6. confirm existing slices/actions/bots still work.

## Admin Calendar implementation sequence

After the schema gate is complete:

1. **Read-only Calendar first** — month/week/list as appropriate, using authenticated server-side read data.
2. Verify single-day and multi-day rendering against real records.
3. Add **Create event** form using only mapped user-input/source fields.
4. Create endpoint must validate schema, auth, dates, enums/currency and required fields server-side.
5. Create endpoint must use idempotent persisted ID handling.
6. Smoke new row in Google Sheets.
7. Sync AppSheet and verify the same newly created Admin row appears correctly there.
8. Only then add **Edit event**.
9. Verify edits made in Admin remain compatible with AppSheet and finance calculations.

## Dashboard → AppSheet launcher

Required: a clear mobile-friendly button/link from Admin Dashboard to SD.Live Track/AppSheet.

Dependency: the exact real **App Link / app URL / app ID** is not currently stored in the repository. Do not guess it. Recover it from AppSheet or user-provided configuration before wiring the launcher.

## Current next action

Complete the Calendar schema/source-of-truth mapping from the real workbook and current AppSheet setup before making any production data-model change.

Expected output of the schema gate:

| Field | Current owner | Admin create? | Admin edit? | AppSheet editable? | Formula/workflow rule | Calendar relevance |
| --- | --- | --- | --- | --- | --- | --- |
| `Fecha trabajo` | To verify | To verify | To verify | To verify | Existing finance eligibility dependency | Start-date candidate |
| Event end date | Missing/unverified | To design | To design | To design | Must not break formulas | Required for multi-day |
| Remaining `REGISTRO` fields | To map | To map | To map | To map | To document | As applicable |

Do not implement Calendar write-back until this table is based on the actual workbook/AppSheet configuration rather than assumptions.