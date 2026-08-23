# Finance pass-through calculator — 2026-08-23

## Why

Some client invoices include money collected on behalf of third parties. That pass-through amount is operationally not SD.Live income, but the client payment may arrive after retentions have been applied to the full invoice.

## Implemented rule

The Finance workspace now includes a local calculator with these inputs:

- currency (COP / USD)
- total invoiced / charged to the client
- total actually received in the bank
- one or more third-party gross amounts included in that invoice

It calculates:

- total retentions = invoiced - received
- effective retention rate
- SD.Live/user gross share = invoiced - third-party gross
- retention allocated to the SD.Live/user share
- SD.Live/user net received
- third-party gross
- retention allocated to third parties
- net amount payable to third parties
- per-third-party retention and payable amount

The reconciliation invariant is:

`my net received + total third-party payable = total bank receipt`

## Allocation assumption

This is an internal management allocation. Retentions are prorated proportionally across the gross amount belonging to SD.Live/the user and the gross amounts belonging to third parties.

This calculator does **not** determine the legal/tax owner of a withholding certificate and is not a tax filing engine.

## Guardrails

- local browser calculation only
- no Google Sheets/AppSheet write-back
- no Finance API write
- no Notes field exposed through the Admin API
- no persistence of calculator inputs
- supports multiple third parties
- bilingual EN/ES
- responsive mobile layout

## QA examples

A 450,000 invoice, 405,000 bank receipt and 100,000 third-party gross produces:

- total retentions: 45,000
- effective rate: 10%
- own gross: 350,000
- own retentions: 35,000
- own net received: 315,000
- third-party retention: 10,000
- third-party payable: 90,000
- reconciliation: 315,000 + 90,000 = 405,000
