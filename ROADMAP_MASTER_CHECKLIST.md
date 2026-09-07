# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-07 — America/Bogota**

Current `main` at handoff:

`d4d036bed5203d655dff8ff875f7188868845176` — PR #253.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged but smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate — Finance third-party operational closeout

🚧 **ACTIVE.** Code is merged through PR #253 and AppSheet's open-debt UX is owner-verified. One bounded production smoke of the new Finance `Marcar pagado` write path remains before declaring the operational milestone CLOSED/PASS.

Detailed handoff:

`docs/checkpoints/handoff-finance-third-party-operational-2026-09-07.md`

Roadmap:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

## Finance third-party milestone checklist

1. [x] Add `REGISTRO.Cobro terceros` and AppSheet capture/validation.
2. [x] Extend Finance read contract without changing parent source-of-truth ownership.
3. [x] Reuse canonical proportional-retention math.
4. [x] Show pre-collection third-party obligations.
5. [x] Add physical `PAGO_TERCEROS` child ledger integration.
6. [x] Migrate derived child calculations away from stale physical App formulas to AppSheet Virtual Columns.
7. [x] Recompute derived values in Finance from persisted facts only.
8. [x] Add selected-year/monthly reconciliation backend with COP/USD isolation.
9. [x] Simplify visible reconciliation to **COP-only by third-party name** with `Deuda`, `Cobrado`, `Pagado`.
10. [x] Preserve unassigned obligations as `Sin desglose`.
11. [x] Convert `Obligaciones a terceros` into operational states:
    - 🟠 `Esperando pago del cliente`
    - 🟢 `Listo para pagar`
12. [x] Add bounded Admin Finance `Marcar pagado` action that writes only physical `PAGO_TERCEROS!J:K` after fresh server-side validation.
13. [x] Keep raw IDs/notes/contact data out of the browser action contract.
14. [x] Keep `admin-stabilization-worker.js` as stable deploy entry.
15. [x] AppSheet `Terceros` tab owner-verified to hide fully paid debt.
16. [ ] Run one representative production `Marcar pagado` smoke if a safe obligation exists.
17. [ ] If no safe item exists, explicitly record the smoke as deferred rather than manufacturing production data.
18. [ ] Mark third-party operational milestone CLOSED/PASS.

Merged Finance PRs:

- #249 → `c2b2ff1eb977d0d2d0c532abc3fbf65a61c9bd5e`
- #250 → `4dcf3fe90f50fbaf77f41227f9b8b4ce4c6db1bf`
- #251 → `b312b4e7f47ff5526f1bace8325aa85e4a4a1b02`
- #252 → `b02bda1406ba152884aa9b4b2976c7cd9141aba4`
- #253 → `d4d036bed5203d655dff8ff875f7188868845176`

# Priority 1 — Close Finance third-party production smoke

🚧 Run exactly one representative smoke of the `Marcar pagado` path if a safe obligation is available:

- verify `Listo para pagar`;
- mark once;
- verify queue/card removal;
- verify `Valor pagado tercero` + `Fecha pago tercero` in Sheets/AppSheet after sync;
- verify AppSheet `Terceros` no longer shows the fully paid debt.

# Priority 2 — 2026 PILA estimator

⏳ Build the browser-local/year-versioned Finance planning calculator after exact current 2026 source verification.

Required boundaries:

- no Sheet/AppSheet/D1 writes;
- exact 2026 FSP thresholds/current own-account rules verified before final coding;
- support personal-services and own-account/different-contract modes as scoped;
- `Cobro terceros` is not automatically included/excluded from statutory PILA income;
- unsupported legal scenarios fail clearly rather than guessing.

# Priority 3 — Rental real-time availability / double-booking protection

⏳ Establish deterministic inventory truth for Rental and Assistant. This is the prerequisite for future real inventory availability claims.

# Priority 4 — Mobile Rental Cart total visibility / sticky summary

⏳ Contained high-value public UX debt.

# Priority 5 — Rental quote/PDF + Finance Document Generator foundation

⏳ Build one reusable document engine rather than parallel PDF paths.

# Priority 6 — Calendar/Projects workflow additions

⏳ Expand only after current operational flows remain stable.

# Priority 7 — SD.Live Patch

⏳ Larger product module: patch sheets, Stage I/O, signal path, snapshots, visual patch and device profiles.

# WhatsApp owner control

🟢 **CODE MERGED / ROLLOUT PAUSED.**

PR #246 merged as:

`4fc02a565317c802c07fed78e6d25bd231eeb70b`.

The bounded verified-owner WhatsApp Availability architecture is in `main`, but Meta/Cloudflare onboarding, activation and production owner-number smoke are intentionally not active. Do not restart rollout unless explicitly requested.

Old PR #191 remains superseded historical source material and must not be merged.

# Closed foundations

✅ Availability Core v1.  
✅ Lead Core through PR #190.  
✅ Assistant storage/backend/runtime/public widget/full production E2E.  
✅ Existing Contact/Rental Turnstile Siteverify disposition.  
✅ Calendar controlled create + multi-day.  
✅ Site Schedule / automatic Show Day / Location.  
✅ Show Day Admin force control.  
✅ Admin stabilization.  
✅ Public visual stabilization.  
✅ Rental image-editor parity.  
✅ Finance general read-only dashboard foundation.  
🟢 Finance third-party operational implementation through PR #253; representative write smoke pending.

# Source-of-truth boundaries

## Finance

- Google Sheets = Finance persistence.
- `REGISTRO` = parent operations/work/payment table.
- `PAGO_TERCEROS` = physical child obligation/payment ledger.
- AppSheet SD.Live Track = primary mobile/offline workflow.
- General Finance Admin analytics = read-only.
- Approved exception: PR #253 may write only `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero` for an explicitly confirmed third-party payment, after server-side re-read/revalidation.
- No derived values are persisted by Finance.
- ⛔ Generic Finance write-back remains BLOCKED.
- ⛔ D1 Finance mirror remains BLOCKED.
- ⛔ Bidirectional Finance sync remains BLOCKED.
- Assistant has no Finance read/write path.

## Rental

- backend pricing/quote logic is authoritative;
- Assistant cannot become a second Rental catalog/pricing engine;
- unknown/ambiguous item resolution fails closed;
- catalog quantity limits fail closed;
- inventory availability remains unknown unless a deterministic backend says otherwise;
- cart is request for quotation, not checkout.

## Availability

- D1 Availability Core is authoritative;
- AI consumes it as a deterministic tool;
- WhatsApp owner control uses the canonical parser/write path;
- public WhatsApp traffic must not migrate D1 schema;
- Travel/private timezone data is not public business context;
- public owner-phone leakage is prohibited.

## Assistant session/privacy

- no transcript persistence;
- structured slots only;
- AES-GCM sealed browser token;
- no provider-side conversation-state dependency;
- explicit product-owned consent only;
- Lead + consent + idempotency effect persisted atomically;
- retry returns existing completed Lead rather than duplicate PII.

# Later backlog

⏳ Basic CRM beyond current Lead Core.  
⏳ Admin Inbox / Workspace association.  
⏳ AppSheet reminder delivery hardening.  
⏳ Data Studio / business analytics.  
⏳ SEO/indexation monitoring.  
⏳ Mobile critical-render performance.  
⏳ Accessibility remediation.  
⏳ CMS advanced layout/DAM/editor capabilities.  
⏳ Canonical HTML CV/private portfolio.  
⏳ Security/Cloudflare periodic evaluation.

# Non-negotiable workflow

- Never write directly to `main`.
- One short branch per coherent change.
- Tests/CI before merge.
- Squash merge.
- Exactly one representative production smoke for runtime changes.
- No production smoke for docs-only.
- One manual QA action at a time.

# Exact continuation

**Inspect current `main` at/after `d4d036bed5203d655dff8ff875f7188868845176`. Run one bounded Finance third-party `Marcar pagado` production smoke if a safe obligation exists. If it passes—or is explicitly deferred for lack of a safe item—mark the third-party operational milestone closed and begin exact-source verification/planning for the 2026 PILA estimator. Do not redesign AppSheet/Sheets without concrete regression evidence.**
