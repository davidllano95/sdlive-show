# 14.5 — SD.Live as Control Center

**Reconciled:** 2026-09-28 — America/Bogota  
**Status:** **SD.Live Patch ACTIVE DESIGN / DISCOVERY GATE**  
**Verified production checkpoint:** `623f4a2c7e1b01f3dc6867a5d90631aff0a13659` — PR #313, Documents v1 production-ready closeout.

This document owns the current Control Center workstream sequence. Current GitHub `main` + verified production behavior outrank this file when conflicts are found.

## Operating architecture

SD.Live is a Control Center made of focused workspaces:

- `/admin/` — Dashboard / system overview + Show Day Visual QA;
- `/admin/finance/` — Finance analytics/workflow over Google Sheets `REGISTRO`, with the already-approved narrow third-party payment fact write;
- `/admin/documents/` — production-ready Documents registry/editor/settings over dedicated private Documents storage;
- `/admin/calendar/` — Calendar / Operations;
- `/admin/calendar/site-schedule/` — website-only Site Schedule / Show Day / Location state;
- `/admin/editor/` — Site Editor / CMS;
- future Patch workspace — technical patch/signal-flow/show-documentation domain;
- Inbox/other workspaces remain separate modules.

All Admin surfaces remain behind Cloudflare Access.

Current primary navigation order remains:

`Dashboard → Finance → Documents → Calendar → Site Editor → Inbox`

Patch navigation placement is a future implementation decision and should not be added until the Patch MVP information architecture is approved.

## Source-of-truth guardrails

- Google Sheets `REGISTRO` remains operations/Finance persistence.
- AppSheet **SD.Live Track** remains the primary mobile/offline Finance workflow.
- D1 does not become a Finance mirror.
- Documents may read Finance for future prefill only; it does not write to Sheets/AppSheet.
- Documents uses dedicated `DOCS_DB` and private `DOCS_BUCKET`.
- Signature/final PDF artifacts never use public `MEDIA_BUCKET`.
- Issued Documents snapshots/numbers are immutable.
- Patch must not become a second owner of work dates, client workflow status, Finance facts or Inventory stock.
- Rental pricing/availability/quote math remain backend-owned.
- Google Calendar remains a secondary projection/read-only overlay where applicable, not operational truth.

## Closed sequence

1. Performance/media baseline — ✅ CLOSED.
2. Security baseline — ✅ CLOSED.
3. Finance audit / repair-vs-rewrite — ✅ CLOSED.
4. SD.Live Track rename — ✅ CLOSED.
5. Source-of-truth mapping — ✅ CLOSED.
6. Finance read-only Admin — ✅ CLOSED/PASS.
7. Multi-day operations + Admin Calendar — ✅ CLOSED/PASS.
8. Controlled Calendar create — ✅ CLOSED/PASS.
9. Site Schedule + automatic Show Day + Location — ✅ CLOSED/PASS.
10. Google Calendar integration — ✅ CLOSED/PASS.
11. Admin + public stabilization — ✅ CLOSED/PASS.
12. Rental image-editor parity — ✅ CLOSED/PASS.
13. Availability / Lead / Assistant foundations — ✅ CLOSED/PASS.
14. Finance third-party + owner-money reconciliation — ✅ CLOSED/PASS through PR #259.
15. **Documents v1 — ✅ CLOSED / PRODUCTION READY through PR #313.**

### Documents closeout state

- real `samuel:CC` active, current next `21`;
- real `samuel:INV` active, current next integer `19` / display `0019`;
- real corrections `-B / -C / ...` enabled;
- private signed PDF pipeline operational;
- TEST workspace clean;
- mobile Documents UX production-ready;
- `cc-co-es@1` + `invoice-intl-en@1` frozen as historical renderer contracts.

Do not reopen Documents without regression evidence or an explicit new Documents feature/version.

# Current Active Gate — SD.Live Patch

Canonical roadmap:

`docs/roadmap/future-sdlive-patch-2026-08-27.md`

Activation handoff:

`docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`

## Gate type

This is initially a **design/discovery gate**, not an implementation authorization.

Before any Patch schema migration or runtime UI:

1. review 3–5 real patch/rider examples;
2. identify the recurring technical facts actually used on show day;
3. define the minimum MVP data model;
4. decide master patch vs event snapshot/version semantics;
5. lock stable IDs and ordering behavior;
6. define Stage I/O device/port representation;
7. define output representation and signal-path boundaries;
8. define conflict/capacity validation;
9. define event-link boundaries without Finance/operations ownership drift;
10. approve the MVP information architecture for **Inputs + Stage I/O + Outputs**.

Only after that contract is approved should implementation begin.

## Intended Patch sequence

### A. MVP Patch Sheet

- input/channel list;
- stage I/O devices + ports;
- output list;
- ordering/reorder semantics;
- duplicate/conflict validation;
- versions/snapshots;
- autosave/saved/error state;
- bounded mobile/show-day behavior.

### B. Visual Patch

Structured signal-flow projection over persisted technical data.

The visual graph is not the source of truth; moving nodes visually must not silently change routing.

### C. Device profiles

Model real capabilities/port constraints for consoles/stageboxes actually needed by SD.Live workflows.

Do not fabricate unsupported console/show-file interoperability.

### D. Show Workspace / Compare Patch

- link Patch to a durable event identity;
- reuse/fork master patches;
- pin event snapshots;
- artist-vs-house comparison;
- deterministic repatch/cross-patch checklist.

## Relationship to other domains

### Finance

Patch does not own billing/payment state and does not write generic Finance fields.

### Documents

Patch may later reuse document/export infrastructure conceptually, but its PDFs are technical documentation, not legal/financial documents and not a source of truth.

### Inventory

Future integration may validate or reference availability/assignment, but Patch must not own stock counts or allocations.

### Rental

Patch does not own Rental pricing, quote math or booking availability.

## Backlog after Patch

1. Rental real-time availability / double-booking protection.
2. Quote/Cotización kinds on the Documents foundation.
3. Mobile Rental Cart total/sticky summary.
4. Controlled Calendar edit/workflow additions.
5. CRM / Admin Inbox / Workspace association.
6. Finance cleanup and analytics debt.
7. PILA estimator research/planning when deliberately selected.

## Availability-Aware Contact / AI relationship

Availability/AI remains a closed foundation and must not silently gain ownership over unrelated domains.

The AI layer must not own/invent Finance data, Rental pricing/catalog/availability, Patch technical state, project history or owner availability state.

## Next-action rule

For the Patch workstream:

1. inspect current `main` and canonical docs;
2. use the GitHub connector directly;
3. one coherent branch/PR at a time;
4. do not code before the initial data-model review is complete;
5. tests/CI green before merge;
6. current standing workflow allows automatic squash-merge when CI is green and there are no errors;
7. if CI or another error occurs, stop and request the failing log;
8. destructive/irreversible production actions remain explicit and separately authorized.

**Exact continuation:** start from real patch/rider examples and derive the MVP data contract for Inputs + Stage I/O + Outputs. Do not start Visual Patch or migrations first.

**Stability > novelty. Closed gates are not repeated without regression evidence.**
