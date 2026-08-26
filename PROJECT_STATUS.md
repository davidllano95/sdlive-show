# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-08-25 — America/Bogota** |
| Rama operativa | `main` |
| `main` al reconciliar | **PR #141 · `159abff630188399ea9455ed4fe8911758f1fdf3`** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Finance read-only + Calendar create + Site Schedule + automatic Show Day operativos; Finance freeze recuperado/PASS; Admin visual audit aún abierto** |
| Active Gate | **post-integration Admin visual audit + stabilization** |
| Bloqueado | **Generic Finance Phase 3 write-back** |
| Paso manual inmediato | **continuar Admin audit record-first desde `/admin/` desktop** |

## Precedencia

En conflicto prevalece:

1. código actual de GitHub `main` + comportamiento verificable en producción;
2. schema/config desplegada;
3. último handoff/checkpoint fechado;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md` para backlog/historia;
7. prompts/ideas/referencias.

**Stability > novelty.** Un documento futuro no autoriza reemplazar una implementación funcional.

## Método de cambio

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one production smoke for runtime changes`.

Durante el visual audit:

1. recorrer una superficie coherente;
2. registrar hallazgos;
3. no corregir uno por uno;
4. terminar el bloque;
5. reconciliar contra `main`;
6. corregir lo vigente en un solo batch;
7. un smoke de producción por batch runtime.

Excepción: P0/P1 que impide usar o continuar la superficie puede corregirse inmediatamente.

## Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- Google Sheets `REGISTRO` = persistencia + formula owner para operaciones/finanzas.
- AppSheet **SD.Live Track** = cliente mobile/offline.
- D1 no es mirror de Finance/`REGISTRO`.
- D1 `site_schedule_state` = website-only Calendar presentation / Show Day state.
- Cloudflare R2 = source of truth para media administrada/migrada por CMS.
- Formula-owned Sheets columns nunca se escriben desde Admin forms.
- COP y USD permanecen separados; no FX implícito.
- `Save Draft` no cambia producción; `Publish` promueve Draft → Published.
- Rental pricing/quote math permanece backend-owned.
- Rental notifica a `rental@sdlive.show`; Contact general a `hello@sdlive.show`.
- Calendar controlled create es una autorización estrecha y separada; **no** desbloquea generic Finance write-back.
- Home es el contrato visual/navigation del header público.
- Todo UI nuevo/modificado reutiliza palette/tokens aprobados.

## Control Center actual

### `/admin/` — Dashboard
Overview ligero, health, navegación y Admin-only Show Day QA override.

### `/admin/finance/` — Finance
Read-only sobre Google Sheets/API para SD.Live Track. COP/USD separados; no D1 Finance mirror; no generic write-back.

Capacidades actuales:

- top queues: **Por facturar / Cobrable ahora / Flujo bloqueado**;
- Aging drilldowns;
- Data quality drilldowns;
- pass-through / third-party retention calculator;
- canonical billing eligibility basada en `Fecha fin`;
- schema/header resolution por nombre, no por posición fija;
- fechas Google Sheets normalizadas para evitar ambigüedad M/D vs D/M;
- **LiventX · Listo para firmar**: evaluación presente + firma pendiente + no pagado;
- revisión mensual LiventX activa desde el día **20**;
- CTA al portal `https://proveedores.aoscentral.com` desde card y modal.

### Finance reliability status — CLOSED/PASS

Sequence:

- **PR #137:** intentó endurecer timeouts/estado de conexión tras un hang de Finance.
- **PR #139/#140:** redujeron capas, forzaron la ruta Finance por Worker y mejoraron diagnóstico/cache behavior.
- **PR #141:** encontró la causa real del freeze del navegador: `finance-liventx-portal-link.js` instalaba un `MutationObserver` sobre todo `document.body` y su callback reescribía texto/atributos dentro del mismo subtree observado. Eso podía crear un ciclo mutación → callback → mutación, saturando el main thread; una vez saturado, Safari no podía ejecutar ni siquiera los timeouts, por eso el síntoma parecía un connection hang.

PR #141:

- elimina el DOM-wide observer;
- usa eventos explícitos de click/keyboard/language;
- hace idempotente la configuración de links;
- cache-bustea el runtime afectado;
- amplía tests de freeze para prohibir este patrón en los runtimes Finance.

**Production smoke #141: PASS. `/admin/finance/` vuelve a cargar y la página permanece responsive. No pedir otro smoke para #141.**

### `/admin/calendar/` — Calendar / Operations

- lee el mismo `REGISTRO`;
- soporta `Fecha trabajo` + `Fecha fin` multi-day;
- desktop month Calendar + mobile Calendar/Agenda;
- browser payload sanitized;
- effective display puede incorporar Site Schedule blocks;
- controlled Admin create production-smoked PASS.

### `/admin/calendar/site-schedule/` — Site Schedule

- D1 `site_schedule_state`;
- website-only presentation state;
- bloques no solapados con Start, End, Show Day y Location;
- source selector muestra ongoing + future según America/Bogota;
- no modifica fechas ni workflow de `REGISTRO`/AppSheet.

### `/admin/editor/` — Site Editor
CMS visual con Draft/Published/revisions, EN/ES, COL/INT, Media Library, Global Select, Visual Safeguards y publish failsafe.

## Source-of-truth matrix

| Área | Source of Truth | Estado |
|---|---|---|
| Código/CSS/JS/branding/fallbacks | GitHub `main` | Active |
| CMS Draft/Published | D1 `sdlive-cms-production` | Active |
| Public CMS content | validated D1 Published | Active |
| Media binaries | R2 `sdlive-media-production` | Active |
| Rental pricing/quote math | backend | Active |
| Admin access | Cloudflare Access | Active |
| Analytics público | GA4/GTM con consentimiento | Active |
| Operations/Finance persistence + formulas | Google Sheets `REGISTRO` | Active |
| Offline workflow | AppSheet `SD.Live Track` | Active |
| Finance Admin analytics | Worker read-only → Google Sheets/API | Active |
| Website Calendar presentation overrides | D1 `site_schedule_state` | Active |
| Public Show Day active state | Site Schedule + America/Bogota date | Active |
| Show Day Location | Site Schedule block only | Active |
| Future CRM | TBD; Attio candidate only | Planned |
| Future AI chatbot/agent | Dapta.ai candidate only | Planned |

## Calendar / Finance date contract

Canonical source dates:

- `Fecha trabajo` = canonical start;
- `Fecha fin` = canonical end;
- one-day: end = start;
- multi-day: end >= start.

Finance billing rule:

- `Estado = Pendiente Envio` AND canonical end `< today` → **Por facturar**;
- canonical end `= today`, future or invalid → **Flujo bloqueado**;
- legacy rows without `Fecha fin` may fall back to `Fecha trabajo`;
- “today” is evaluated in America/Bogota.

Issue #83 retains only the AppSheet/reminder follow-up: reminder/bot eligibility should use the same day-after-`Fecha fin` rule.

## Finance dates — current safeguard

PR #134 fixed false `Duraciones de pago inválidas` caused by ambiguous formatted dates such as `2/4/2026` and `5/11/2026`.

Current Finance date contract:

- recognized date columns are normalized before calculations;
- ambiguous Google-style slash dates use deterministic M/D unless the first component cannot be a month;
- canonical date calculations remain timezone-aware where applicable;
- no Sheet/AppSheet writes or finance workflow ownership changed.

## LiventX signing workflow

Read-only Finance support includes:

- queue `LiventX · Listo para firmar`;
- eligibility: LiventX + evaluation date present + signature missing + not paid + not `Pendiente Envio`;
- persistent queue visibility so pending work is not hidden before the 20th;
- monthly review emphasis from the **20th through month end**;
- direct external signing CTA to `https://proveedores.aoscentral.com`.

This does not write `Fecha firma`; signing still occurs in the external portal/current workflow.

## Public-site stabilization — current state

Recent merged public fixes:

- **PR #123:** accessibility/continuity closeout, public WhatsApp on SEO/service landings, Rental empty-request guard, pricing parity test, initial testimonial long-copy behavior.
- **PR #125:** testimonial shrink correction, reduced PA presentation, mobile Misi/Wonderlust Supported Brands normalization.
- **PR #127:** synchronized testimonial progressive expansion.
- **PR #129:** shorter testimonial cards stop naturally instead of stretching; collapse preserves reader viewport; BetaThree PA sized like one card in a three-card desktop grid.
- **PR #131:** changing EN ↔ ES preserves testimonial expansion state and viewport coherently.

Issue #124 is still the public smoke ledger. Do not claim the final public block formally closed until its representative smoke is explicitly accepted.

## Admin visual audit — ACTIVE

Admin must still be deliberately reviewed as one coherent block, **record first / batch fix later**:

1. `/admin/` desktop;
2. `/admin/` mobile;
3. `/admin/finance/` desktop;
4. `/admin/finance/` mobile;
5. `/admin/calendar/` desktop;
6. `/admin/calendar/` mobile;
7. `/admin/calendar/site-schedule/` desktop;
8. `/admin/calendar/site-schedule/` mobile;
9. `/admin/editor/` desktop;
10. `/admin/editor/` mobile.

Known required Admin/CMS findings live in issue #126:

- **Global CMS media scaling:** every CMS-managed logo/image control must allow scale up to **250%**, including Testimonials, Trusted By, Supported Brands, Services/Selected Work/Rental media where applicable.
- **CMS collection/card reordering:** repeatable cards must be reorderable with persistent saved order, explicit drag handle plus accessible move up/down controls; stable IDs, Draft → Published and ownership boundaries must remain intact.

Do not implement these piecemeal before the Admin finding set is complete unless one becomes blocking.

## Show Day state

Automatic Show Day is CLOSED/PASS:

- public source: Site Schedule + America/Bogota;
- failure fails closed to normal;
- visitor manual toggle removed;
- Admin-only Visual QA override `Auto / Force On / Force Off` exists and expires at Bogotá day-end;
- override is separate from canonical Site Schedule and `REGISTRO`/AppSheet.

Future concurrency backlog: explicit **Primary / Secondary** presentation priority for simultaneous active Show Day blocks; multiple active Primary blocks should surface an Admin conflict rather than silently choosing by sort order.

Low-priority polish: Show Day favicon and authoritative prepaint to remove normal-violet → red startup pop.

## Future roadmap

### Finance Document Generator

Recorded in `docs/roadmap/future-finance-document-generator-2026-08-25.md`.

Future shared Admin/Finance engine for:

- Cuenta de cobro;
- Cotización;
- Factura / invoice draft;
- reuse SD.Live Track/Finance/Rental/future CRM data;
- branded PDF preview/export;
- revisions/status lifecycle;
- no second finance source of truth.

A locally generated PDF must **not** be represented as a DIAN-valid Colombian electronic invoice until legal/e-invoicing requirements and provider integration are explicitly designed and verified.

### Other future items

- Calendar Agenda `Full Month` vs `Current + Future` filter;
- controlled Calendar edit/workflow actions after stabilization;
- Attio CRM evaluation;
- Dapta.ai AI-agent evaluation;
- Rental availability/double-booking and advanced quote workflow;
- Finance reminder delivery hardening.

## Relevant docs

- `README.md` — architecture/current operating overview.
- `docs/checkpoints/handoff-pr141-2026-08-25.md` — latest checkpoint and exact continuation.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active audit contract.
- `docs/roadmap/finance-phase2-real-use-2026-08-23.md` — Finance real-use history/current rules.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — future document generation.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog; lower precedence than current-state docs above.

## Exact continuation point

1. Finance recovery through **PR #141 is production-smoked PASS**. Do not re-test it unless a new Finance regression appears.
2. Resume the **Admin visual audit record-first** at `/admin/` desktop.
3. Keep adding findings to issue #126; do **not** fix each finding as discovered.
4. Continue the locked 10-surface desktop/mobile sequence one manual action at a time.
5. After all 10 checks, reconcile issue #126 against current `main` and implement one coherent Admin stabilization batch.
6. Only after Admin stabilization PASS continue controlled Calendar edit/workflow or unrelated future roadmap work.
