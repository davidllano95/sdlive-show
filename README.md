# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets remains Finance persistence, AppSheet **SD.Live Track** remains the mobile/offline Finance workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older prompts/ideas/references.

**Stability > novelty.** `UNMERGED != PRODUCTION`, and `CI PASS != PRODUCTION SMOKE PASS`.

## Current state — 2026-09-07

GitHub `main` at this handoff:

`d4d036bed5203d655dff8ff875f7188868845176` — PR #253.

### Finance third-party module

Current third-party Finance sequence is merged through PR #253:

- #249 — structured `REGISTRO.Cobro terceros`;
- #250 — pre-collection obligation semantics/card;
- #251 — physical `PAGO_TERCEROS` ledger integration + selected-year/monthly reconciliation backend;
- #252 — visible **COP-only** reconciliation by third-party name;
- #253 — operational obligations queue + bounded `Marcar pagado` action from private Finance Admin.

Visible reconciliation columns:

- `Tercero`
- `Deuda a terceros`
- `Cobrado de terceros`
- `Pagado a terceros`

Operational card:

- 🟠 `Esperando pago del cliente`
- 🟢 `Listo para pagar`
- fully paid obligations disappear
- unassigned amount remains `Sin desglose` and cannot be marked paid

AppSheet `Terceros` is owner-verified to show only outstanding third-party debt; fully paid items disappear.

### Finance source-of-truth boundary

- Google Sheets = persistence.
- `REGISTRO` = parent work/payment table.
- `PAGO_TERCEROS` = child obligation/payment ledger.
- AppSheet = primary mobile/offline workflow.
- General `/admin/finance/` analytics remain read-only.
- **Only approved write exception:** PR #253 can record a real third-party payment by writing only physical `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero` after a fresh server-side read/revalidation.
- No derived Finance value is written from Admin.
- Generic Finance write-back, D1 Finance mirroring and bidirectional sync remain blocked.

Detailed handoff:

`docs/checkpoints/handoff-finance-third-party-operational-2026-09-07.md`

Finance roadmap:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

## Current Active Gate

**One bounded production smoke of PR #253's `Marcar pagado` path, if a safe obligation exists.**

Required evidence:

1. one obligation is `Listo para pagar`;
2. `Marcar pagado` succeeds once;
3. the obligation disappears from the operational queue/card;
4. `Valor pagado tercero` + `Fecha pago tercero` are updated in Sheets/AppSheet after sync;
5. the AppSheet `Terceros` tab no longer shows the fully paid debt.

If no safe real/test obligation is available, document the smoke as deferred rather than creating unnecessary production data.

## Next Gate

After the third-party operational smoke is passed or explicitly deferred: **2026 PILA estimator** in Finance.

The PILA tool must be browser-local/year-versioned, planning-only, and must not write to Sheets/AppSheet/D1. Exact current 2026 rules and FSP thresholds must be verified before final implementation.

## WhatsApp owner control

PR #246 was merged as `4fc02a565317c802c07fed78e6d25bd231eeb70b`, but Meta/Cloudflare onboarding and live owner-number activation are intentionally paused. Do not restart that rollout unless explicitly requested. Old PR #191 remains superseded historical material.

## Other closed/PASS foundations

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/public widget/full production E2E.
- SD.Live Forms Turnstile Siteverify disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.

Assistant remains isolated from Finance: no Finance reads or writes.

## Work order after Finance PILA

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs. Manual QA with the owner: **one action at a time**.

## Exact continuation

**Inspect current `main` at/after `d4d036bed5203d655dff8ff875f7188868845176`. Run one bounded `Marcar pagado` production smoke if a safe third-party obligation is available. If it passes—or is explicitly deferred—start exact-source verification/planning for the 2026 PILA estimator. Do not redesign AppSheet/Sheets without a concrete regression.**

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-finance-third-party-operational-2026-09-07.md` — current Finance third-party handoff.
- `docs/roadmap/finance-third-party-pila-2026-09-05.md` — Finance third-party + PILA roadmap.
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md` — historical source-of-truth baseline; superseded only where the newer handoff explicitly authorizes the narrow J/K fact write.
- `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md` — final Assistant rollout closeout.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
