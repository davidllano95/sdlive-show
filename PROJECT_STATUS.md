# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** GitHub `main` + comportamiento verificado en producción prevalecen sobre cualquier documento.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-28 — America/Bogota** |
| Producción | `https://sdlive.show` |
| Documents | **v1 PRODUCTION READY / milestone closed** |
| Documents templates | **`cc-co-es@1` + `invoice-intl-en@1` frozen** |
| Real numbering at checkpoint | **`samuel:CC` next 21 · `samuel:INV` next 19/display 0019** |
| TEST workspace | **clean baseline · both TEST roots next 1** |
| Active next major workstream | **SD.Live Patch / next deliberately selected roadmap gate** |
| Finance | **owner-money + third-party operations closed/pass; generic write-back remains blocked** |
| PILA | **backlog / research candidate** |
| WhatsApp owner control | **merged; rollout intentionally paused** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md` for the closed Documents v1 production state;
4. `docs/operations/documents-v1-maintenance.md` for Documents architecture/versioning rules;
5. checkpoint/handoff fechado más reciente de otros módulos;
6. este archivo;
7. `README.md`;
8. `ROADMAP_MASTER_CHECKLIST.md`;
9. docs/prompts históricos.

**Stability > novelty. `MERGED != PRODUCTION VERIFIED`. `CORE IMPLEMENTED != PRODUCTION ENABLED`.**

## Workflow obligatorio

Runtime:

`inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge when authorized → representative production smoke when applicable`

Docs-only:

`inspect → branch → docs → CI → PR → CI green → squash merge when authorized`

Sensitive production actions remain separate and explicit:

- number-consuming real document Finalize;
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
- Finalized snapshots/numbers are immutable.
- Drafts/Preview never consume official numbers.
- Public traffic must never migrate Documents D1 schema.
- PDF failure never releases an issued number.
- Corrections create a new immutable document/snapshot; they never mutate the issued source.
- Output-affecting renderer changes require a new template version (`@2`, etc.).

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

Production health was verified READY for:

- `DOCS_DB`;
- `DOCS_BUCKET`;
- exact schema;
- active private `samuel-cop` signature + SHA-256 match;
- active private `samuel-usd` signature + SHA-256 match;
- real sequence state/patterns;
- no number collisions.

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

Do not silently alter v1 output. Future output-affecting visual/semantic changes require `@2` or later while preserving historical v1 rendering.

## Finalize/PDF

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
- filename contract: document number + client name.

## Corrections/revisions

Real and TEST correction paths preserve issued-document immutability.

- original = implicit A/no suffix;
- revisions = `-B`, `-C`, ...;
- independent revision counters;
- revision Finalize never advances the normal base sequence;
- latest-unsuperseded-only correction rule;
- one open correction draft per source;
- supersedes chain preserved.

Verified stronger CC TEST smoke:

`CC n → CC n-B → independent CC n+1 → CC n-C`

## Mobile webapp

Documents has an iPhone/iPad operational layer:

- fixed Preview/Edit top rail while a draft is open;
- fixed Save/Finalize bottom dock;
- solid app shell/no translucent content bleed;
- safe-area handling;
- iOS-safe input sizing/date controls;
- collapsible identity sections;
- reduced-scroll draft workflow;
- Letter-geometry scaled preview;
- tablet dual editor/preview when width permits;
- compact mobile Settings/health/cleanup cards.

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

# Finance owner-money + third-party operations — CLOSED / PASS

Durable status:

- Sheets remains Finance source of truth;
- AppSheet remains primary mobile/offline workflow;
- owner-money management semantics separated from full transaction facts;
- third-party payment operations/history production-verified;
- general Finance Admin stays read-only except narrow approved payment fact write;
- generic Finance write-back / D1 mirror / bidirectional sync remain blocked.

Known Finance cleanup/debt remains backlog.

# PILA — backlog only

Not the selected next gate. Re-research current Colombian rules if explicitly selected later.

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
- **Documents v1 production-ready milestone.**

# Next roadmap candidates after Documents

- **SD.Live Patch** — previously selected major workstream after Documents closure.
- Rental real-time availability / double-booking protection.
- Mobile Rental Cart total/sticky summary.
- Calendar/Projects additions.
- CRM/Admin Inbox/workspace association.
- Finance cleanup/debt.
- PILA estimator research/planning when deliberately selected.
- Quote/Cotización as a future Documents extension.

# Exact continuation point

**Documents v1 is production-ready and closed. Do not create more TEST smokes by default. For normal work, the next document Finalize may be a real document. For future Documents changes, read the production-ready checkpoint and maintenance guide first. The next major project gate should be selected from the post-Documents roadmap, with SD.Live Patch already identified as the intended major workstream.**
