# SD.Live — Availability Core production checkpoint

**Date:** 2026-09-01 — America/Bogota  
**Status:** **HISTORICAL / SUPERSEDED BY AVAILABILITY v1 CLOSEOUT**

This file records the early Availability Core checkpoint after PR #167. It is retained for chronology only and is **not** the current continuation source.

Current authoritative closeout:

`docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`

Current project state:

`PROJECT_STATUS.md`

## Historical scope captured here

At this checkpoint, the following were already operational:

- deterministic D1-owned Availability Core;
- public `/api/availability`;
- protected `/api/admin/availability`;
- `available / limited / away`;
- expiring manual override;
- weekly service schedule;
- Backend Force Mode `Auto / Force On / Force Off`;
- integrated public WhatsApp status tab;
- username-only public WhatsApp identity;
- Admin Availability visual parity baseline.

At that historical moment, Travel Mode, deterministic next service window and flexible Temporary Status had not yet been completed.

Those items are now implemented and production-accepted. Do not use the old pending list from this checkpoint as current work.

## Runtime work completed after this historical checkpoint

- PR #169 — Travel Mode controls.
- PR #170 — Travel Mode mobile timezone UX.
- PR #171 — Travel Mode timezone documentation.
- PR #172 — deterministic next service window.
- PR #173 — Force Mode expiry date display fix.
- PR #174 — compact Availability Admin card.
- PR #176 — compact Availability + Show Day control cluster.
- PR #177 — control/Weekly Schedule visual polish.
- PR #178 — final visual parity polish.
- PR #179 — flexible Temporary Status timer + owner command parser core.
- PR #180 — timer canonical duration sync fix.
- PR #181 — explicit `Apply status` semantics.

Availability Core v1 is now **CLOSED/PASS**.

The current Active Gate is **SD.Live Assistant + Lead Core**.
