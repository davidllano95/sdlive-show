# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** GitHub `main` + comportamiento verificado en producción prevalecen sobre cualquier documento.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-10-01 — America/Bogota** |
| Producción | `https://sdlive.show` |
| Documents | **v1 PRODUCTION READY / milestone closed** |
| Documents templates | **`cc-co-es@1` + `invoice-intl-en@1` frozen** |
| Real numbering at checkpoint | **`samuel:CC` next 21 · `samuel:INV` next 19/display 0019** |
| TEST workspace | **clean baseline · both TEST roots next 1** |
| Active Gate | **SD.Live Patch — build / smoke / expand** |
| Finance | **owner-money + third-party operations closed/pass; generic write-back remains blocked** |
| PILA | **backlog / research candidate** |
| WhatsApp owner control | **merged; rollout intentionally paused** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. checkpoint/handoff fechado más reciente;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. docs/prompts históricos.

Documents-specific references remain:

- `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`;
- `docs/operations/documents-v1-maintenance.md`;
- `docs/roadmap/sdlive-documents-v1.md`.

Current Patch references:

- `docs/roadmap/sdlive-patch.md` — canonical product/data contract;
- `docs/checkpoints/sdlive-patch-discovery-evaluation-2026-09-28.md` — consolidated discovery checkpoint;
- `docs/roadmap/future-sdlive-patch-2026-08-27.md` — historical precursor;
- `docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md` — activation handoff.

**Stability > novelty. `MERGED != PRODUCTION VERIFIED`. `CORE IMPLEMENTED != PRODUCTION ENABLED`.**

## Workflow obligatorio

Runtime:

`inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge under current standing workflow → representative production smoke when applicable`

Docs-only:

`inspect → branch → docs → CI → PR → CI green → squash merge under current standing workflow`

Current standing workflow:

- if CI is green and there are no errors, squash-merge automatically;
- if CI or another error occurs, stop and request the failing log instead of guessing.

Sensitive production actions remain separate and explicit:

- number-consuming real document Finalize when intentionally issuing a real document;
- destructive maintenance/purge actions;
- manual production SQL;
- private signature/publication changes;
- paid Cloudflare changes;
- irreversible production-resource changes.

# Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = Admin boundary.
- Google Sheets = Finance persistence.
- AppSheet SD.Live Track = primary mobile/offline Finance workflow.
- D1 is not a Finance mirror.
- General Finance Admin remains read-only except already-approved narrow third-party payment facts.
- Documents performs no Finance writes in v1.
- Documents uses dedicated `DOCS_DB` + private `DOCS_BUCKET`.
- Signature/final PDFs never use public `MEDIA_BUCKET`.
- Finalized Documents snapshots/numbers are immutable.
- Drafts/Preview never consume official numbers.
- Public traffic must never migrate Documents D1 schema.
- PDF failure never releases an issued number.
- Corrections create a new immutable document/snapshot; they never mutate the issued source.
- Output-affecting Documents renderer changes require a new template version (`@2`, etc.).
- Patch must not become a second source of truth for Finance, event workflow or Inventory stock.

# SD.Live Documents v1 — CLOSED / PRODUCTION READY

Canonical production-ready checkpoint:

`docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`

Canonical maintenance/versioning guide:

`docs/operations/documents-v1-maintenance.md`

Canonical implementation contract / historical roadmap:

`docs/roadmap/sdlive-documents-v1.md`

## Production state

Real series are bootstrapped and verified healthy:

- `samuel:CC` → issuer `samuel-cop` → pattern `{n}` → **current next 21** at checkpoint;
- `samuel:INV` → issuer `samuel-usd` → pattern `{n:04}` → **current next 19 / display 0019** at checkpoint.

Production health was verified READY for storage, schema, both private signatures, real series identity/patterns and number collision checks.

No real base number had been consumed at the production-ready checkpoint. The next real Finalize will consume whichever current next number applies at that moment.

## TEST state

TEST lifecycle was fully smoke-tested, including corrections/revisions and an interleaved CC revision case.

The TEST workspace was then cleaned and re-scanned:

- 0 TEST documents/drafts/finalized/void;
- 0 private TEST PDFs/artifacts;
- 0 revision counters;
- 0 TEST events;
- `test:CC` next 1;
- `test:INV` next 1.

TEST remains available only as a deliberate sandbox.

## Approved templates

Frozen artifact contracts:

- `cc-co-es@1` — Cuenta de Cobro · Colombia · Español;
- `invoice-intl-en@1` — International Invoice · English.

Future output-affecting visual/semantic changes require `@2` or later while preserving historical v1 rendering.

## Finalize/PDF/corrections

Production behavior includes:

- prospective number preview;
- exact `draftRev`;
- UUID `finalizeKey` idempotency;
- atomic number + immutable snapshot;
- private signature resolution/hash verification;
- Browser Rendering Letter PDF;
- private content-addressed R2 artifact;
- Retry PDF from frozen snapshot;
- authenticated inline viewer + explicit download;
- filename contract: document number + client name;
- real and TEST correction chains `-B`, `-C`, ...;
- revision counters independent from the base series;
- latest-unsuperseded-only correction rule;
- one open correction draft per source.

Verified stronger CC TEST smoke:

`CC n → CC n-B → independent CC n+1 → CC n-C`

## Mobile webapp

Documents has an iPhone/iPad operational layer with fixed Preview/Edit top rail, fixed Save/Finalize bottom dock, solid app shell, safe-area handling, iOS-safe inputs/date controls, collapsible identity sections, scaled Letter preview, reduced-scroll workflow and compact mobile Settings/health/cleanup cards.

## Remaining Documents backlog — not blockers

- Void reason/history polish;
- visible revision/supersedes history;
- events/history UI;
- client document history;
- Finance read-only prefill;
- Quote/Cotización kinds;
- future v2 templates when deliberately requested;
- legal/accounting review as needed.

Do not reopen Documents v1 as an active roadmap blocker without a regression or an explicit v2 requirement.

# SD.Live Patch — ACTIVE BUILD / SMOKE / EXPAND

Canonical roadmap:

`docs/roadmap/sdlive-patch.md`

Consolidated discovery checkpoint:

`docs/checkpoints/sdlive-patch-discovery-evaluation-2026-09-28.md`

## Current state

The conceptual contract is stable enough to begin iterative implementation without freezing the final storage schema.

**Smoke 0.1 merged through PR #315** with:

- local-first Admin workspace at `/admin/patch/`;
- pure domain core for Sources, implicit Feeds, Devices, Ports and Connections;
- fan-out OFF -> Repatch behavior;
- ordinary-input double-assignment protection;
- Validity vs Completeness separation;
- Damaged / Reserved / Unavailable warnings;
- IndexedDB local working copy;
- explicit Save + autosave states;
- Input List and System View derived from the same project state;
- focused domain/workspace tests.

## Current development strategy

Use an iterative vertical-slice loop:

`design invariant -> implement smallest real slice -> smoke with real workflow -> refine contract -> expand`

Real fixtures are now **tests during development**, not a gate that blocks all coding.

The first implementation is intentionally local-only. It does not authorize or require a final D1 schema.

## Still blocked until their own validated slice

Do not infer authorization for:

- final D1 Patch schema/migrations;
- cloud sync as an interactive dependency;
- console/hardware control from Routing Sets;
- automated console repatching;
- REGISTRO integration design;
- Finance or Inventory ownership changes.

Patch remains separate from Finance, event workflow ownership and Inventory stock.

## Immediate continuation

Smoke the local 0.1 workspace with real Sources/I/O, then expand in small slices. Near-term candidates:

1. richer Device/I/O editing and Console Channels;
2. Output Paths / Handoffs;
3. History / Undo / Redo foundation;
4. portable `.sdlive` project file;
5. Venue/System interaction growth;
6. Festival Mode after the core survives normal-show smoke.

Do not reopen the old blanket “no runtime implementation yet” gate unless a structural regression requires returning to discovery.

# Finance owner-money + third-party operations — CLOSED / PASS

- Sheets remains Finance source of truth;
- AppSheet remains primary mobile/offline workflow;
- owner-money management semantics separated from full transaction facts;
- third-party payment operations/history production-verified;
- general Finance Admin stays read-only except narrow approved payment fact write;
- generic Finance write-back / D1 mirror / bidirectional sync remain blocked.

Known Finance cleanup/debt remains backlog.

# PILA — backlog only

Not the selected gate. Re-research current Colombian rules if explicitly selected later.

# WhatsApp owner control — rollout paused

PR #246 merged, but live Meta/Cloudflare activation remains intentionally paused.

# Closed modules — do not reopen without regression evidence

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/widget/full E2E rollout.
- Forms Turnstile disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Finance dashboard/third-party/owner-money milestones through PR #259.
- **Documents v1 production-ready milestone through PR #313.**

# Backlog after Patch

- Rental real-time availability / double-booking protection.
- Mobile Rental Cart total/sticky summary.
- Calendar/Projects additions.
- CRM/Admin Inbox/workspace association.
- Finance cleanup/debt.
- PILA estimator research/planning when deliberately selected.
- Quote/Cotización as a future Documents extension.

# Exact continuation point

**Documents v1 is closed and production-ready. SD.Live Patch is now in active build / smoke / expand iteration. Start a new conversation, inspect current `main` plus the Patch roadmap and activation handoff, and begin by reviewing 3–5 real patch/rider examples. Derive the MVP data contract for Inputs + Stage I/O + Outputs, including stable IDs/order, versions/snapshots, port/capacity conflicts and event-link boundaries. Do not code or migrate D1 until that contract is approved.**
