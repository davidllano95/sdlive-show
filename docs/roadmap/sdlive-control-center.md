# 14.5 — SD.Live as Control Center

**Reconciled:** 2026-09-27 — America/Bogota  
**Status:** **SD.Live Documents v1 ACTIVE GATE — Finalize/PDF production work pending**  
**Verified GitHub base:** `561cfebbf059568fb028d2a76c28b275eebdbcad` — PR #275.

This document owns the current Control Center workstream sequence. Current GitHub `main` + verified production behavior outrank this file when conflicts are found.

## Operating architecture

SD.Live is a Control Center made of focused workspaces:

- `/admin/` — Dashboard / system overview + Show Day Visual QA;
- `/admin/finance/` — Finance analytics/workflow over Google Sheets `REGISTRO`, with the already-approved narrow third-party payment fact write;
- `/admin/documents/` — Documents registry/editor/settings over dedicated private Documents storage;
- `/admin/calendar/` — Calendar / Operations;
- `/admin/calendar/site-schedule/` — website-only Site Schedule / Show Day / Location state;
- `/admin/editor/` — Site Editor / CMS;
- Inbox/other workspaces remain separate modules.

All Admin surfaces remain behind Cloudflare Access.

Canonical primary navigation order:

`Dashboard → Finance → Documents → Calendar → Site Editor → Inbox`

## Source-of-truth guardrails

- Google Sheets `REGISTRO` remains operations/Finance persistence.
- AppSheet **SD.Live Track** remains the primary mobile/offline Finance workflow.
- D1 does not become a Finance mirror.
- Documents may read Finance for future prefill only; it does not write to Sheets/AppSheet.
- Documents uses dedicated `DOCS_DB` and private `DOCS_BUCKET`.
- Signature/final PDF artifacts never use public `MEDIA_BUCKET`.
- Draft edits do not mutate issuer/client profiles automatically.
- Issued document snapshots/numbers are immutable.
- Rental pricing/availability/quote math remain backend-owned.
- Google Calendar remains secondary projection/read-only overlay, not operational truth.

## Closed sequence

### 1. Performance/media baseline — ✅ CLOSED

### 2. Security baseline — ✅ CLOSED

### 3. Finance audit / repair-vs-rewrite — ✅ CLOSED
Decision remains repair/integrate rather than rewrite.

### 4. SD.Live Track rename — ✅ CLOSED

### 5. Source-of-truth mapping — ✅ CLOSED

### 6. Finance read-only Admin — ✅ CLOSED/PASS

### 7. Multi-day operations + Admin Calendar — ✅ CLOSED/PASS

### 8. Controlled Calendar create — ✅ CLOSED/PASS

### 9. Site Schedule + automatic Show Day + Location — ✅ CLOSED/PASS

### 10. Google Calendar integration — ✅ CLOSED/PASS

### 11. Admin + public stabilization — ✅ CLOSED/PASS

### 12. Rental image-editor parity — ✅ CLOSED/PASS

### 13. Availability / Lead / Assistant foundations — ✅ CLOSED/PASS

### 14. Finance third-party + owner-money reconciliation — ✅ CLOSED/PASS
Finance roadmap reconciliation is closed through PR #259.

# Current Active Gate — SD.Live Documents v1

Canonical contract:

`docs/roadmap/sdlive-documents-v1.md`

Initial kinds:

- Cuenta de cobro · Colombia · ES;
- Invoice · International · EN.

## Documents foundations already merged

Through PR #275, the Control Center now has:

- dedicated Documents D1/private R2 storage foundation;
- schema, immutability, preflight/preparation;
- document kind/domain/snapshot core;
- atomic/idempotent finalization **storage primitive**;
- issuer/client profiles;
- private signature infrastructure/settings;
- draft registry/editor/autosave;
- preview renderers for CC + Invoice;
- Settings hardening and protected cleanup UX;
- line-item editing, optional quantity/unit, date ranges;
- CC simple mode;
- Itemize/non-itemized General-rate mode;
- current document branding/header/footer/signature-block visual system;
- shared Admin navigation/visual integration.

## Core vs production-enabled Finalize

The internal domain/storage layer can atomically freeze a snapshot, reserve a sequence number via CAS and finalize idempotently with a `finalizeKey`.

That does **not** mean the real product workflow is enabled yet.

Still pending:

- authenticated Admin Finalize route;
- irreversible confirmation UX;
- test-series Finalize smoke through the Admin path;
- real `samuel:CC` / `samuel:INV` bootstrap;
- real document issuance;
- final signature/PDF artifact pipeline;
- Browser binding/PDF rendering;
- private PDF persistence/download;
- complete Void/Reissue/final-registry UX;
- Finance read-only prefill/linking.

## Numbering transition

Planned real values only, pending verification + explicit authorization:

- `samuel:CC` proposed next = `21`;
- `samuel:INV` proposed next integer = `19`, display `0019`.

Historical numbers remain unchanged and new issued numbers are never reused.

## Current Documents UX

### Cuenta de Cobro

Supports both simple/non-itemized concepts + one General total and a detailed itemized mode with optional quantity/unit/date-range/PO/type/rate information.

### Invoice

Remains itemized and supports services, expenses/reimbursements, mixed line kinds, quantity/unit/rate, date/range, PO/ref, original-currency metadata and optional bank details.

Draft preview remains numberless and does not expose the real signature asset.

## Immediate Control Center sequence

### A. Docs reconciliation — current branch

Reconcile `PROJECT_STATUS.md`, `README.md`, master roadmap, Documents contract and this Control Center roadmap through PR #275.

Docs-only PR:

- CI required;
- no production smoke required;
- no merge until explicit owner authorization.

### B. Production visual verification

Before irreversible Finalize, verify representative authenticated production drafts after #275.

### C. Finalize Admin gate

Next bounded runtime PR should:

- expose authenticated Finalize API/confirmation UX;
- display a prospective number without consuming it;
- enforce exact draft revision and server-side validation;
- create/use a per-confirmation `finalizeKey`;
- call the existing finalization core instead of rebuilding numbering;
- test duplicate/double-click/network retry paths;
- smoke with test series only.

Do not include real sequence bootstrap or PDF/BROWSER in the same PR unless the scope is explicitly expanded and reviewed.

### D. Real numbering gate

After test-series Finalize behavior is proven, separately verify/authorize real sequence bootstrap.

### E. Signed PDF gate

Then add Browser/PDF, private signature injection, private artifact persistence and authenticated download. PDF failure never releases an issued number.

### F. Registry lifecycle / integration

Then complete Finalized/Void/Reissue/history/download UX and later read-only Finance prefill/linking.

## Later eligible workstreams

Documents remains selected. Later candidates include:

1. Rental real-time availability / double-booking protection.
2. Quote/Cotización kinds on the Documents foundation.
3. Mobile Rental Cart total/sticky summary.
4. SD.Live Patch.
5. Controlled Calendar edit/workflow additions.
6. CRM / Admin Inbox / Workspace association.
7. Finance cleanup and analytics debt.
8. PILA estimator research/planning when deliberately selected.

## Availability-Aware Contact / AI relationship

Availability/AI remains a closed foundation and must not silently gain ownership over unrelated domains.

The AI layer must not own/invent Finance data, Rental pricing/catalog/availability, project history or owner availability state.

## Next-action rule

For the current Documents workstream:

1. inspect current `main` and current docs/code;
2. one coherent branch/PR at a time;
3. tests/CI green;
4. explain result;
5. obtain explicit owner authorization before merge;
6. squash merge;
7. run one representative production smoke for runtime changes when applicable;
8. keep real numbering/bootstrap/issuance and other irreversible production operations explicit and separate.

**Stability > novelty. Closed gates are not repeated without regression evidence.**
