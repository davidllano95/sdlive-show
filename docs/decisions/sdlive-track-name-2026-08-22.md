# Naming Decision — SD.Live Track

**Date:** 2026-08-22 — America/Bogota
**Status:** Approved name; rollout in progress under Control Center Step 4.

## Decision

The finance/work-tracking system previously known as **NextPay26** will be renamed to **SD.Live Track**.

## Why this name

- `Track` describes the actual workflow: jobs are recorded and followed through account/invoice, collection and payment states.
- It fits naturally inside the SD.Live brand and has an audio-native meaning without limiting the product to bookkeeping only.
- It can grow to include work, clients, receivables and related operational views without becoming misleading.
- The name does not change the completed architecture decision: **repair + integrate; do not rewrite**.

## Rollout guardrails

- AppSheet remains the offline/field-capture surface.
- Google Sheets + AppSheet business logic, formulas, schema, actions, slices, views and bots must not be renamed or altered blindly just to change presentation branding.
- First identify whether `NextPay26` appears only as a user-facing label or as a technical identifier/deep-link dependency.
- Preserve `NextPay26` in historical audit/migration references where it is necessary to understand the system's history.
- Step 4 remains open until the surviving Google Sheets + AppSheet implementation presents the new name consistently and a smoke confirms existing workflows still operate normally.
- Only after Step 4 closes may Step 5 source-of-truth mapping become the finance track's active gate.

## Approved presentation name

**SD.Live Track**
