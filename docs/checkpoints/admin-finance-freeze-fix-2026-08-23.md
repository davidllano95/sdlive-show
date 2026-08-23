# Admin Finance freeze fix — 2026-08-23

## Symptom

- `/admin/` became unresponsive on desktop Chrome and stalled on iPhone Safari.
- Public site and individual Admin API endpoints remained fast.
- Base Dashboard values could render before the page froze.

## Root cause addressed

The Finance bilingual layer continuously observed the entire Admin DOM with `MutationObserver`. Finance rendering performs many synchronous DOM mutations (cards, charts, labels), which could repeatedly trigger whole-section translation passes and monopolize the main thread.

## Fix — PR #68

- Removed continuous whole-DOM observation from Finance i18n.
- Kept translation refresh explicit and bounded.
- Guarded Finance language `localStorage` access.
- Versioned Finance dashboard/i18n runtime asset URLs so clients do not reuse stale scripts.
- Added regression tests for no global MutationObserver and asset versioning.

## Validation

- **Desktop Chrome: PASS.** After PR #68, `/admin/` loaded and remained responsive.
- **iPhone with Finance autoload: still problematic.** This established that a second mobile startup issue remained after the freeze itself was fixed.
- PR #69 deferred Finance on compact screens.
- **iPhone core Admin before Finance: PASS.**
- **iPhone Finance after explicit load: PASS and fluid.**

This isolated the remaining mobile failure to **startup contention from booting Dashboard + Finance together**, not Cloudflare Access, the core Admin APIs, the Finance API or Finance rendering in isolation.

## Permanent architecture consequence

The temporary mobile defer button is not the long-term architecture. Finance is being moved to the dedicated `/admin/finance/` workspace while `/admin/` remains lightweight.

See `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`.

## Scope / guardrails

No finance calculations, D1 finance persistence, Google Sheets ownership, AppSheet workflow, Cloudflare Access policy or public-site behavior changed. Finance remains read-only and Phase 3 write-back remains blocked.
