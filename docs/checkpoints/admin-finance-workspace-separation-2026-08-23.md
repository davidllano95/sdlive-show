# Admin Finance workspace separation — 2026-08-23

## Decision

Finance becomes a first-class Admin workspace at **`/admin/finance/`**, alongside the lightweight **`/admin/` Dashboard** and **`/admin/editor/` Site Editor**.

This is the permanent direction for scalability. The Dashboard is an operational overview/navigation surface; it must not boot the full Finance analytics runtime merely because the owner opens `/admin/`.

## Evidence that led to this decision

During mobile QA, `/admin/` stalled on iPhone Safari and desktop Chrome became unresponsive while the public site and individual Admin APIs remained fast.

- PR #68 removed the Finance i18n whole-DOM `MutationObserver`; desktop Chrome then passed the responsiveness smoke.
- PR #69 deferred Finance on compact screens. The iPhone loaded the base Admin quickly **before** Finance.
- The same iPhone then loaded Finance successfully and stayed fluid after the explicit `Load Finance Dashboard` action.

That sequence showed that the remaining mobile problem was **startup contention**, not a broken Finance dataset/API and not Cloudflare Access.

## Architecture after this milestone

- `/admin/` — lightweight control-center Dashboard and CMS/system status.
- `/admin/finance/` — SD.Live Track Finance workspace; owns Finance analytics UI/runtime.
- `/admin/editor/` — Site Editor/CMS workspace.
- The three surfaces share the Admin navigation language and remain behind the existing Cloudflare Access boundary.
- Finance continues to read the underlying Google Sheet/API through the existing private Worker endpoints.
- Google Sheets `REGISTRO` remains finance persistence/formula source for this phase.
- AppSheet remains offline capture/workflow.
- No finance D1 mirror, write-back or second source of truth is introduced.

## Implementation scope

- Add dedicated Finance route/shell and Finance tab.
- Remove Finance boot/runtime from `admin/dashboard.js` entirely.
- Keep a Finance quick-access card on the Dashboard.
- Expose Finance from the Site Editor navigation shell.
- Preserve existing Finance analytics, EN/ES, COP/USD separation, Tax Reserve settings and read-only API contracts.
- Retire the temporary compact-screen `Load Finance Dashboard` launcher because Finance no longer belongs inside the Dashboard.
- Add regression coverage locking route separation and independent asset versioning.

## Phase status

Control Center Steps **1–6 remain CLOSED**. This workspace split is a presentation/runtime architecture hardening milestone inside the already-closed read-only Phase 2 surface; it does **not** authorize Finance Phase 3.

**Finance Phase 3 write-back remains BLOCKED** until the read-only Finance workspace earns real-use trust and the draft-first/idempotent write contract is explicitly approved.

Availability/WhatsApp remains an eligible separate track, not automatically active.

## Production smoke required after merge

1. Desktop: `/admin/` loads quickly and does not load Finance UI.
2. Desktop: Finance tab opens `/admin/finance/`, data renders, year switcher and EN/ES work.
3. iPhone: `/admin/` loads quickly without black/partial startup behavior.
4. iPhone: Finance tab opens the dedicated workspace and remains responsive after the analytics render.
5. Site Editor: navigation exposes Finance and the Editor itself remains unchanged.
6. Confirm Finance remains read-only and no source-of-truth/write behavior changed.
