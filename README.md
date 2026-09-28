# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured application state, R2 stores managed artifacts/media, Google Sheets remains Finance persistence, AppSheet **SD.Live Track** remains the primary mobile/offline Finance workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older prompts/ideas/references.

**Stability > novelty. `UNMERGED != PRODUCTION`. `CI PASS != PRODUCTION SMOKE PASS`. `CORE IMPLEMENTED != PRODUCTION ENABLED`.**

## Current state — 2026-09-28

Verified production-ready Documents checkpoint:

`623f4a2c7e1b01f3dc6867a5d90631aff0a13659` — PR #313, `Documents: close v1 as production ready`.

### Finance

Finance owner-money semantics and third-party operations remain **CLOSED / PASS**.

- Google Sheets remains the Finance source of truth.
- `REGISTRO` stores parent work/payment facts.
- `PAGO_TERCEROS` stores physical third-party obligation/payment facts.
- AppSheet remains the primary mobile/offline Finance workflow.
- General Finance Admin remains read-only except the already-approved narrow third-party payment fact write.
- No generic Finance write-back, no D1 Finance mirror and no bidirectional Finance sync.

### Documents v1

**CLOSED / PRODUCTION READY.**

Canonical references:

- `docs/roadmap/sdlive-documents-v1.md`
- `docs/operations/documents-v1-maintenance.md`
- `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md`

Production state at closeout:

- Cuenta de Cobro and international Invoice are real-production capable;
- real sequences are active;
- `samuel:CC` current next = `21`;
- `samuel:INV` current next integer = `19`, display `0019`;
- `cc-co-es@1` and `invoice-intl-en@1` are frozen historical renderer contracts;
- real `-B / -C / ...` corrections are enabled and do not consume the next base number;
- final PDFs and signatures remain private;
- mobile Documents UX is optimized for iPhone/iPad operation;
- TEST workspace is clean, with both TEST root counters reset to next `1`;
- production health/preflight is READY.

Do not reopen Documents implementation without regression evidence or a deliberate new Documents feature/version. Output-affecting template changes require a new template version (`@2`, etc.).

## Current Active Gate — SD.Live Patch

**ACTIVE DESIGN / DISCOVERY GATE. No schema migration or runtime implementation is authorized merely by this status.**

Canonical product/design roadmap:

`docs/roadmap/future-sdlive-patch-2026-08-27.md`

Activation handoff:

`docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`

Product intent:

Build a native SD.Live Admin workspace for patch sheets, stage I/O, signal-flow documentation, versions/snapshots and show-day technical handoff, while keeping REGISTRO/AppSheet as the event/operations source of truth.

### First bounded milestone

Before coding:

1. inspect current `main` and the Patch roadmap;
2. review **3–5 real patch/rider examples** from actual SD.Live workflows;
3. extract the minimum shared data model;
4. decide master patch vs event snapshot semantics;
5. lock stable IDs, ordering and source-of-truth boundaries;
6. design only the MVP surfaces: **Inputs + Stage I/O + Outputs**;
7. only after the data contract is approved should schema/runtime implementation begin.

Do not jump directly to Visual Patch, console show-file interoperability, Inventory ownership or Finance integration.

## Other closed/PASS foundations

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/public widget/full production E2E.
- Forms Turnstile Siteverify disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Finance dashboard/third-party/owner-money milestones through PR #259.
- Documents v1 through PR #313.

## Backlog after the active Patch gate

- Rental real-time availability + double-booking protection;
- Quote/Cotización kinds on the Documents foundation;
- Mobile Rental Cart total/sticky summary;
- Calendar/Projects workflow additions;
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS backlog;
- Finance cleanup/debt;
- PILA estimator research/planning when deliberately selected.

## PILA

PILA remains a backlog/research candidate only. Re-research current Colombian legal/operational rules if/when deliberately selected.

## WhatsApp owner control

PR #246 is merged, but Meta/Cloudflare onboarding and live owner-number activation remain intentionally paused unless explicitly reopened.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge when authorized by standing workflow → representative production smoke when applicable`

Docs-only:

`inspect → branch → docs → CI → PR → CI green → squash merge when authorized by standing workflow`

Current standing workflow: if CI is green and there are no errors, squash-merge automatically. If CI or another error occurs, stop and request the failing log rather than guessing.

Production-sensitive or irreversible actions still require explicit authorization, including manual production SQL, destructive production-resource changes, public/private-signature exposure, paid Cloudflare changes and other actions specifically called out by the active module.

## Exact continuation

**Start a new conversation for SD.Live Patch. Use the GitHub connector directly. Inspect current `main`, `PROJECT_STATUS.md`, `README.md`, `ROADMAP_MASTER_CHECKLIST.md`, `docs/roadmap/sdlive-control-center.md`, `docs/roadmap/future-sdlive-patch-2026-08-27.md`, and `docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md`. Do not code first. Begin by auditing 3–5 real patch/rider examples and defining the MVP data contract for Inputs + Stage I/O + Outputs, including stable IDs, ordering, versions/snapshots and event linkage boundaries.**

## Relevant docs

- `PROJECT_STATUS.md` — current state and exact continuation.
- `ROADMAP_MASTER_CHECKLIST.md` — current work order/backlog.
- `docs/roadmap/sdlive-control-center.md` — Control Center workstream sequence.
- `docs/roadmap/future-sdlive-patch-2026-08-27.md` — active Patch design contract.
- `docs/checkpoints/handoff-sdlive-patch-activation-2026-09-28.md` — exact new-conversation handoff.
- `docs/checkpoints/handoff-documents-v1-production-ready-2026-09-28.md` — Documents closeout.
