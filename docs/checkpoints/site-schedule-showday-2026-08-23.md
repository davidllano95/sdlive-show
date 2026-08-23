# SD.Live Site Schedule + automatic Show Day

**Date:** 2026-08-23 — America/Bogota  
**Status:** implementation ready for production smoke after PR #93 merge.

## Decision

Website calendar presentation is now a separate operational layer from finance/AppSheet persistence.

- Google Sheets `REGISTRO` remains the persistent operations/finance source of truth.
- AppSheet SD.Live Track remains the mobile/offline workflow client.
- D1 `Site Schedule` stores only website presentation overrides for existing Calendar events.
- A REGISTRO range may be split into multiple non-overlapping website blocks without altering `Fecha trabajo`, `Fecha fin`, finance formulas or AppSheet.
- Admin Calendar consumes the website blocks when an override exists; `?view=source` preserves the untouched REGISTRO dates for the Site Schedule editor.

## Per-block controls

Each Site Schedule block owns:

- Start date;
- End date;
- explicit `Show Day` opt-in;
- `Location`.

`Location` is required when `Show Day` is enabled. It is website-only and does not write back to AppSheet or Google Sheets.

Blocks must remain inside the original REGISTRO date range and cannot overlap each other.

## Automatic Show Day

Public Show Day no longer depends on a visitor-operated/session-scoped button.

- Public status endpoint: `GET /api/site/showday-status`.
- Public payload contains only active/inactive state, active Location, active-count/date/timezone metadata; it does not expose Calendar client/project/private finance data.
- Today is evaluated in `America/Bogota`.
- Show Day activates only when today falls inside a Site Schedule block whose `Show Day` switch is enabled and whose Location is present.
- Failure to read Site Schedule fails closed to normal public mode.
- The public runtime refreshes the status periodically and updates the existing `showday-active` visual contract.
- Main Home uses its existing Show Day logo/ON AIR treatment and displays the configured Location.
- SEO/public landings receive the same automatic state through the edge runtime and show the configured Location only while active.
- The legacy public `#showdayToggle` is removed at the edge.

## Brand rule

This feature follows the permanent SD.Live palette contract:

- Site Schedule Admin UI reuses the shared Admin `--accent` / `--accent-rgb` tokens and semantic status tokens.
- Public Show Day reuses the existing canonical `--showday-accent`, `--showday-accent-rgb` and related public design tokens.
- No independent module palette was introduced.

## Security / source-of-truth boundary

- Admin Site Schedule mutations require the existing Cloudflare Access-backed Admin verifier.
- Site Schedule uses the existing `CMS_DB` D1 application store; it is not a Finance mirror.
- No generic Finance Phase 3 write-back is opened.
- Site Schedule split blocks, Show Day state and Location never write to Sheets/AppSheet.
- Controlled Calendar create to REGISTRO remains a separate path and is still blocked in production until the Google OAuth connection is re-authorized for Sheets write scope.

## Production QA sequence

Run one check at a time after deployment:

1. Calendar exposes the `Site schedule` launcher and the workspace opens.
2. Select a known multi-day source event such as RENT.
3. Save a test split using the real desired blocks.
4. Confirm Admin Calendar shows gaps rather than the broad continuous source range.
5. Confirm `Next` follows the website blocks.
6. Enable Show Day on an active test block with a Location and confirm the public site automatically changes state and displays that Location.
7. Confirm a non-Show-Day block remains visible in Calendar without activating Show Day.
