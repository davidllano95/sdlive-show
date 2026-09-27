# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured application state, R2 stores managed artifacts/media, Google Sheets remains Finance persistence, AppSheet **SD.Live Track** remains the mobile/offline Finance workflow client, and Cloudflare Access protects Admin.

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

## Current state — 2026-09-27

Verified GitHub base:

`561cfebbf059568fb028d2a76c28b275eebdbcad` — PR #275.

### Finance

Finance owner-money semantics and third-party operations remain CLOSED/PASS.

- Google Sheets remains the Finance source of truth.
- `REGISTRO` stores parent work/payment facts.
- `PAGO_TERCEROS` stores physical third-party obligation/payment facts.
- AppSheet remains the primary mobile/offline Finance workflow.
- owner-facing management analytics use owner-attributable economics.
- full billed and bank-received facts remain separately available for reconciliation/accounting/tax review.
- general Finance Admin remains read-only except the already-approved narrow third-party payment fact write.
- no generic Finance write-back, no D1 Finance mirror and no bidirectional Finance sync.

## Current Active Gate — SD.Live Documents v1

Canonical contract:

`docs/roadmap/sdlive-documents-v1.md`

Documents is a reusable private Admin document registry/generator with two initial kinds:

- **Cuenta de cobro · Colombia · ES**
- **Invoice · International · EN**

### What is already merged

Through PR #275, `main` includes:

- dedicated `DOCS_DB` + private `DOCS_BUCKET` foundation;
- Documents schema/immutability/preflight/preparation;
- kind registry and money/snapshot domain core;
- atomic/idempotent finalization storage primitive with sequence CAS, draft revision guard, `finalizeKey`, immutable snapshot/hash and supersedes support;
- issuer/client profiles;
- private signature infrastructure/settings;
- draft CRUD/registry/editor/autosave;
- sandboxed draft preview for CC + Invoice;
- settings hardening and protected cleanup/deletion UX;
- line-item editing, optional quantity/unit and date ranges;
- CC simple concept mode;
- CC Itemize / non-itemized General rate mode;
- current document branding/header/signature/footer visual system;
- shared Admin navigation/branding integration.

### What is not production-enabled yet

The internal finalization core is **not** an exposed real-document workflow yet.

Pending:

- authenticated Admin Finalize endpoint;
- irreversible confirmation UX;
- test-series finalize smoke through the Admin path;
- real `samuel:CC` / `samuel:INV` bootstrap;
- real document issuance;
- final signature injection/artifact pipeline;
- `BROWSER` binding + PDF rendering;
- private final PDF storage/download;
- complete finalized/Void/Reissue lifecycle UI;
- read-only Finance prefill/linking;
- accountant/legal review of Colombian wording;
- optional historical import;
- future Quote/Cotización kinds.

### Numbering safety

Planned values only, pending explicit verification/authorization:

- `samuel:CC` proposed next = `21`;
- `samuel:INV` proposed next integer = `19`, display `0019`.

Drafts never consume numbers. Finalized/void numbers are never reused. Real sequence bootstrap must be explicit and audited and must never be a deploy side effect.

### Signature/privacy

Signature assets are private Documents artifacts. Draft preview does not receive real signature bytes. No public signature URL or private R2 key should be exposed to normal UI/settings responses.

### Next bounded runtime milestone

After this docs reconciliation is reviewed/merged and authenticated production visuals after #275 are verified, the next runtime PR should expose the **existing finalization core** through a bounded Admin Finalize endpoint + confirmation UX using **test series only**.

Do not combine that first gate with real sequence bootstrap or PDF/BROWSER unless the scope is explicitly expanded and reviewed.

## Documents current visual/UX behavior

### Cuenta de Cobro

Supports simple and detailed cases.

Non-itemized mode can show one or many concepts plus one `General rate / total`, without forcing quantity, unit, dates, line PO, line rates or per-line totals.

Itemized mode may use quantity, unit, type, date/range, line PO/reference, rate and totals.

### Invoice

Remains itemized and supports professional services, expenses/reimbursements, mixed line kinds, quantity/unit/rate, date/range, PO/reference, original-currency metadata and optional bank details.

## Known non-blocking Finance debt

- Some Google Sheets dashboard helper areas use fixed client filters and can omit newly added clients.
- Sheet monthly graph ranges are fixed to January–March.
- `PENDIENTES` is narrower than total owner receivable and must remain labelled as collection-workflow scope.
- Event-level partial third-party payment history would require an intentional ledger redesign.

## PILA

PILA is a backlog/research candidate only. It is not the automatic next milestone while Documents v1 is active.

## WhatsApp owner control

PR #246 is merged, but Meta/Cloudflare onboarding and live owner-number activation remain intentionally paused unless explicitly reopened.

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

## Later candidate workstreams

Documents v1 is selected now. Later candidates include:

- Rental real-time availability + double-booking protection;
- Quote/Cotización kinds on the Documents foundation;
- Mobile Rental Cart total/sticky summary;
- Calendar/Projects workflow additions;
- SD.Live Patch;
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS backlog;
- Finance cleanup/debt;
- PILA estimator research/planning when deliberately selected.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → explain result → explicit owner authorization → squash merge → exactly one representative production smoke when applicable`.

Docs-only:

`inspect → branch → docs → CI → PR → CI green → explain result → explicit owner authorization → squash merge`.

No new PR in this continuation is merged without explicit owner authorization.

No production-sensitive action is implied by merge: real sequence bootstrap, real document issuance, manual production SQL, signature exposure/publication and paid/irreversible Cloudflare changes require explicit authorization.

## Exact continuation

**Reconcile Documents docs/status through PR #275 in a docs-only PR, wait for green CI, explain the result and obtain explicit owner merge authorization. After merge and reinspection of `main`, verify authenticated production visuals and then implement one bounded Finalize Admin API + confirmation UX PR using test series only and reusing the existing finalization core.**

## Relevant docs

- `PROJECT_STATUS.md` — current state and exact continuation.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order/backlog.
- `docs/roadmap/sdlive-documents-v1.md` — canonical Documents implementation contract.
- `docs/roadmap/sdlive-control-center.md` — Control Center workstream sequence.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — historical precursor, superseded by Documents v1.
- `docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md` — Finance closeout.
