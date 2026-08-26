# SD.Live Control Center — Finance Phase 2 real-use handoff

**Updated:** 2026-08-25 — America/Bogota  
**Scope:** current Finance continuation/reference for SD.Live Control Center.  
**Status:** **read-only Finance operational/PASS; generic Phase 3 write-back is BLOCKED.**

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

The dedicated workspace provides:

- top operational queues: **Por facturar / Cobrable ahora / Flujo bloqueado**;
- exact lazy-loaded worklists behind those queues;
- Aging 0–30 / 31–60 / 61+ drilldowns for COP and USD;
- Data quality drilldowns;
- monthly/year/all-time financial analytics;
- configurable Tax Reserve;
- browser-local pass-through / third-party retention calculator;
- EN/ES;
- COP/USD separation;
- read-only workflow status and actions;
- `LiventX · Listo para firmar` + external supplier portal.

## Canonical date rule

Source dates:

- `Fecha trabajo` = canonical start;
- `Fecha fin` = canonical end;
- one-day: end=start;
- multi-day: end>=start.

### Invoice eligibility — current rule

For `Estado = Pendiente Envio`:

- canonical end `< today` → **Por facturar**;
- canonical end `= today` → **Flujo bloqueado**;
- canonical end `> today` → **Flujo bloqueado**;
- missing/invalid end → **Flujo bloqueado**, except legacy records may use `Fecha trabajo` when `Fecha fin` is absent.

“Today” is resolved in **America/Bogota**.

This means a multi-day event that already started but has not ended is **not** invoice-ready.

Issue #83 remains relevant only for bringing AppSheet reminders/bots to the same day-after-`Fecha fin` rule. Finance dashboard classification is already aligned.

## Header/schema resilience — PR #133

Finance resolves required fields by normalized header name before rows are mapped into the canonical Finance model. It does not rely on fixed physical column positions.

## Payment-date ambiguity — PR #134

Real data showed false `Duraciones de pago inválidas`, e.g. account sent `2/4/2026` and paid `2/19/2026` being interpreted inconsistently.

Current semantics:

- Google-style ambiguous slash dates are treated deterministically as **M/D/YYYY** when both first components could be months;
- D/M is used when the first component cannot be a month;
- Finance-facing dates are normalized to unambiguous values before calculations/output.

Regression coverage includes the real ambiguous patterns `2/4 → 2/19` and `5/11 → 5/14`.

## LiventX signing workflow — PR #134/#135

A read-only queue exists:

**LiventX · Listo para firmar / Ready to sign**

Eligibility:

- client is LiventX;
- not paid;
- not `Pendiente Envio`;
- `Fecha evaluación` present;
- `Fecha firma` empty.

The queue is always visible. From the **20th through month end** the card is emphasized as the active monthly signing review.

Finance does not write the signature state; it identifies what is ready for the external signing workflow.

Supplier portal:

`https://proveedores.aoscentral.com`

The CTA exists below the LiventX card and inside its worklist/modal and opens in a new tab.

## Finance connection/freeze incident — CLOSED/PASS through PR #141

### Symptom

Production remained at:

`Connecting to SD.Live Track…`

and Safari eventually reported the page as unresponsive.

Early fixes (#137/#139/#140) hardened Google OAuth/Sheets timeouts, formatted-date transport, Worker routing, cache behavior and visible diagnostics. Those were useful guardrails but did not remove the browser freeze.

### Root cause

PR #141 identified the actual main-thread freeze in:

`admin/finance-liventx-portal-link.js`

The script installed a `MutationObserver` on the entire `document.body` subtree. Its callback called a synchronization function that rewrote link text/attributes inside the same observed subtree. Those writes could trigger the observer again, creating:

`mutation → callback → mutation → callback → …`

That loop could saturate Safari's main thread. Once saturated, even the Finance connection timeout could not execute, so the visible symptom looked like an unresolved backend request.

### Final fix — PR #141

- removed the DOM-wide `MutationObserver`;
- portal-link synchronization now runs only from explicit click/keyboard/language events;
- link configuration is idempotent;
- affected runtime is cache-busted so browsers do not reuse the observer-based script;
- Finance freeze tests now explicitly forbid this DOM-wide observer pattern in the relevant Finance runtimes.

**Production smoke: PASS. Finance loads and the Admin page remains responsive.**

No Sheet/AppSheet write path, pricing, Calendar scope or Finance ownership boundary changed.

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

Calendar/Operations controlled create is implemented and production-smoked separately. It writes only mapped source fields into the same `REGISTRO` source and preserves formula/workflow ownership.

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

Finance runtime recovery is **CLOSED/PASS** through PR #141. Do not spend another smoke on that incident.

Return to the active **Admin visual audit**:

1. start/resume at `/admin/` desktop;
2. record findings in issue #126;
3. do not fix each finding as discovered unless a new P0/P1 blocks use;
4. deliberately review Finance desktop/mobile later in the locked Admin sequence for visual/workflow quality;
5. after all 10 Admin surface/device checks, reconcile and implement one coherent Admin stabilization batch.
