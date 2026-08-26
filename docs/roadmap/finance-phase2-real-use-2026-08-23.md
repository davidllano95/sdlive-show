# SD.Live Control Center — Finance Phase 2 real-use handoff

**Updated:** 2026-08-25 — America/Bogota  
**Scope:** current Finance continuation/reference for SD.Live Control Center.  
**Status:** **read-only Finance remains the operating model; generic Phase 3 write-back is BLOCKED.**

Where older Finance notes conflict, current `main`, verified production behavior and `PROJECT_STATUS.md` take precedence.

## Architecture

- `/admin/` = lightweight Control Center Dashboard.
- `/admin/finance/` = dedicated Finance / SD.Live Track workspace.
- Finance does **not** auto-boot inside the root Dashboard.
- Cloudflare Access = Admin security boundary.
- Google Sheets `REGISTRO` = operations/finance persistence + formula owner.
- AppSheet **SD.Live Track** = mobile/offline capture/workflow.
- Finance reads Sheets server-side through Admin-only Worker APIs.
- COP and USD remain separate.
- No D1 Finance mirror.
- No generic finance write-back endpoint.
- Browser-facing finance payloads omit `Notas`, `NUM CONTACTO`, internal row IDs and OAuth secrets.

## Established Finance capabilities

The dedicated workspace currently provides:

- top operational queues: **Por facturar / Cobrable ahora / Flujo bloqueado**;
- exact lazy-loaded worklists behind those queues;
- Aging 0–30 / 31–60 / 61+ drilldowns for COP and USD;
- Data quality drilldowns;
- monthly/year/all-time financial analytics;
- configurable Tax Reserve;
- browser-local pass-through / third-party retention calculator;
- EN/ES;
- COP/USD separation;
- read-only workflow status and actions.

## Canonical date rule

Source dates:

- `Fecha trabajo` = canonical start;
- `Fecha fin` = canonical end;
- one-day: end=start;
- multi-day: end>=start.

### Invoice eligibility — current rule

PR #132 replaced the older start-date rule.

For `Estado = Pendiente Envio`:

- canonical end `< today` → **Por facturar**;
- canonical end `= today` → **Flujo bloqueado**;
- canonical end `> today` → **Flujo bloqueado**;
- missing/invalid end → **Flujo bloqueado**, except legacy records may use `Fecha trabajo` when `Fecha fin` is absent.

“Today” is resolved in **America/Bogota**.

This means a multi-day event that already started but has not ended is **not** invoice-ready.

Issue #83 remains relevant only for bringing AppSheet reminders/bots to the same day-after-`Fecha fin` rule. Finance dashboard classification is already aligned.

## Header/schema resilience — PR #133

Finance no longer assumes every canonical field lives at a fixed physical column position. Required fields are resolved by normalized header name before rows are mapped into the canonical Finance model.

This protects Finance when columns move without changing source ownership or writing the Sheet.

## Payment-date ambiguity — PR #134

Real data showed false `Duraciones de pago inválidas`, e.g.:

- account sent `2/4/2026`;
- paid `2/19/2026`;
- incorrect result `-42 días` when one side was interpreted D/M and the other M/D.

Current semantics:

- Google-style ambiguous slash dates are treated deterministically as **M/D/YYYY** when both first components could be months;
- D/M is used when the first component cannot be a month;
- Finance-facing dates are normalized to unambiguous values before calculations/output.

Regression coverage includes the real ambiguous patterns `2/4 → 2/19` and `5/11 → 5/14`.

## LiventX signing workflow — PR #134

A read-only queue now exists:

**LiventX · Listo para firmar / Ready to sign**

Eligibility:

- client is LiventX;
- not paid;
- not `Pendiente Envio`;
- `Fecha evaluación` present;
- `Fecha firma` empty.

The queue is always visible so pending signatures are not hidden before the monthly review. From the **20th through month end** the card is emphasized as the active monthly signing review.

Finance does not write the signature state; it tells the user what is ready for the existing external signing workflow.

## LiventX supplier portal — PR #135

The ready-to-sign workflow links directly to:

`https://proveedores.aoscentral.com`

The CTA exists below the LiventX card and inside its worklist/modal. It opens in a new tab and does not trigger the card interaction accidentally.

## Finance connection regression + hotfix — PR #137

After PR #134, production was observed stuck at:

`Connecting to SD.Live Track…`

The failure mode was dangerous because upstream Google OAuth/Sheets reads had no bounded timeout and the page could remain indefinitely in an unresolved loading state.

PR #137 introduces a dedicated Finance transport guard:

- Finance uses the previously production-proven Google Sheets `FORMATTED_STRING` date transport;
- only recognized Finance date columns are immediately normalized back to numeric Sheets serials before existing Finance parsers see them;
- this keeps deterministic date calculations while avoiding the hanging transport regression;
- Google OAuth/Sheets upstream requests have an **8-second timeout**;
- the Finance page has a **12-second visible connection guard** so it cannot remain forever at `Connecting…`;
- outer workspace status is synchronized with the actual Finance source state instead of remaining misleadingly green;
- Contact/Rental public rate-limit bindings remain intact through the new Worker entry wrapper.

PR #137 is **merged + CI green**. Exactly one production smoke remains required before marking this hotfix production PASS.

### Required production smoke

Reload `/admin/finance/`.

Expected:

- `Connecting to SD.Live Track…` must resolve;
- normal result: Finance cards/data load;
- failure result: visible bounded error/timeout, **not** an infinite connecting state;
- existing queues, LiventX signing card and portal remain present if source loads.

## Pass-through calculator

Browser-local utility for payments containing money collected on behalf of third parties.

Inputs:

- COP/USD;
- total invoiced;
- total bank receipt;
- one or more third-party gross amounts.

Core rule: the same effective retention rate is allocated proportionally across own and third-party gross values.

Invariant:

`own net received + total third-party net payout = total bank receipt`

No persistence, no Sheets/AppSheet write, no free-form `Notas` exposure.

## Data quality / privacy guardrails

Finance drilldowns remain sanitized and read-only. They may identify records requiring correction but do not expose sensitive/raw fields simply to make Admin convenient.

Do not add:

- `Notas` to browser payload;
- `NUM CONTACTO` to Finance drilldowns;
- internal row IDs unless a future authenticated edit contract explicitly requires a bounded identifier;
- OAuth tokens/secrets;
- arbitrary cell editing.

## Controlled Calendar write boundary

Calendar/Operations controlled create is now implemented and production-smoked separately. It writes only mapped source fields into the same `REGISTRO` source and preserves formula/workflow ownership.

That authorization does **not** enable:

- generic Finance write-back;
- arbitrary Finance status editing;
- D1 Finance mirroring;
- bidirectional finance sync architecture.

Controlled Calendar edit/workflow actions remain later work after visual stabilization.

## Near-term Finance follow-ups

Eligible after current stabilization unless promoted explicitly:

- align AppSheet reminders/bots to canonical day-after-`Fecha fin` eligibility (#83);
- continue reminder-delivery hardening if push remains unreliable;
- consider Received all-time drilldowns;
- consider Top debtors drilldowns;
- if third-party pass-through becomes common, design structured fields instead of parsing `Notas`.

## Future Finance Document Generator

Recorded separately in:

`docs/roadmap/future-finance-document-generator-2026-08-25.md`

Future shared document engine for:

- **Cuenta de cobro**;
- **Cotización**;
- **Factura / invoice draft**.

It should reuse SD.Live Track/Finance/Rental/future CRM data rather than retyping existing information or creating a second source of truth. PDF preview/export, revision/status workflows and later email/archive flows are valid future scope.

A local PDF must never be represented as a legally valid Colombian electronic invoice until DIAN/e-invoicing requirements and provider integration are explicitly designed and verified.

## Current continuation

1. Production-smoke PR #137 on `/admin/finance/`.
2. If PASS, record the connection hotfix as production PASS.
3. Return to the active **Admin visual audit** rather than adding more Finance features immediately.
4. Finance desktop/mobile will be deliberately reviewed as part of that coherent Admin block.
5. Add new Admin findings to issue #126; batch-fix only after the full Admin surface sequence is complete unless a blocking regression appears.
