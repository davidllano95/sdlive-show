# Admin Finance freeze fix — 2026-08-23

## Symptom
- `/admin/` became unresponsive on desktop Chrome and stalled on iPhone Safari.
- Public site and individual Admin API endpoints remained fast.
- Base Dashboard values could render before the page froze.

## Root-cause hypothesis addressed
The Finance bilingual layer continuously observed the entire Admin DOM with `MutationObserver`. Finance rendering performs many synchronous DOM mutations (cards, charts, labels), which could repeatedly trigger whole-section translation passes and monopolize the main thread.

## Fix
- Removed continuous whole-DOM observation from Finance i18n.
- Kept translation refresh explicit and bounded.
- Guarded Finance language `localStorage` access.
- Versioned Finance dashboard/i18n runtime asset URLs so clients do not reuse stale scripts.
- Added regression tests for no global MutationObserver and asset versioning.

## Scope
No finance calculations, D1 data, Google Sheets access, Cloudflare Access policy, or public-site behavior changed.

## Validation required
After deployment, retest `/admin/` on desktop Chrome first. Then retest iPhone Safari and verify Finance EN/ES labels still update correctly.
