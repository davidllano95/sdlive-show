# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-08-31 — America/Bogota** |
| Rama operativa | `main` |
| `main` al reconciliar | **PR #150 · `f5f527db3a95aaea4cde02febf147f0113e8f356`** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Admin stabilization CLOSED/PASS; Finance, Calendar, Site Schedule, automatic Show Day y Google Calendar projection operativos; public representative smoke #124 sigue separado/abierto** |
| Active Gate | **Admin stabilization CLOSED/PASS; resolver o diferir conscientemente el representative public smoke #124 antes de seleccionar el siguiente módulo** |
| Bloqueado | **Generic Finance Phase 3 write-back** |
| Paso manual inmediato | **revisar el ledger de smoke público #124; si se cierra o se difiere explícitamente, seleccionar el siguiente módulo del roadmap** |

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
| Google Calendar work/site-schedule projection + read-only overlay | `sam@sdlive.show` secondary integration | Active / production-smoked |
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

## Admin stabilization — CLOSED/PASS

Issue #126 is closed as completed after the full desktop/mobile audit, coherent stabilization implementation and final production verification on 2026-08-31.

Accepted current behavior includes:

- shared Admin typography/navigation/mobile drawer/action hierarchy normalized;
- Site Editor CMS scale/order/content/header contracts implemented while preserving Draft → Published and backend ownership boundaries;
- Rental presentation ordering/media/grid behavior stabilized without moving pricing or availability truth into CMS;
- Finance LiventX metric/urgency presentation stabilized; Finance remains read-only and the PR #141 freeze regression guard remains mandatory;
- Calendar mobile and Site Schedule desktop/mobile workflows stabilized;
- Google Calendar target `sam@sdlive.show` integrated as secondary projection/read-only overlay;
- REGISTRO/AppSheet remain operations truth; Site Schedule V2 D1 `site_schedule_state` remains website-block truth;
- Site Schedule Google reconciliation now reads the same V2 store as Admin/Show Day (PR #150).

Final production smoke verified:

- `RENT` is four Site Schedule blocks and its broad REGISTRO parent is gone;
- `JPN - Cubo Colsubsidio` and `N. Jade` Site Schedule projections are present;
- monthly collection reminders exist on day 5 and day 19 at 09:00 America/Bogota and are transparent;
- manual/recurring Google events are not edited/deleted by SD.Live reconciliation;
- no Google → REGISTRO/AppSheet reverse-write path exists.

Issue #126 is historical/completed. Do not reopen the Admin stabilization audit unless a new regression is observed.

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
- `docs/checkpoints/handoff-admin-stabilization-2026-08-31.md` — latest checkpoint and exact continuation.
- `docs/roadmap/post-integration-visual-audit-2026-08-23.md` — active audit contract.
- `docs/roadmap/finance-phase2-real-use-2026-08-23.md` — Finance real-use history/current rules.
- `docs/roadmap/future-finance-document-generator-2026-08-25.md` — future document generation.
- `docs/roadmap/calendar-operations-hub-2026-08-23.md` — Calendar/AppSheet/Site Schedule handoff.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog; lower precedence than current-state docs above.

## Exact continuation point

1. **Admin stabilization is CLOSED/PASS through PR #150**. Issue #126 is completed; do not repeat its audit/smoke unless a new regression appears.
2. **Finance PR #141 remains production-smoked PASS**; preserve the no-DOM-wide-observer regression rule.
3. Public stabilization issue #124 remains a separate representative-smoke ledger. Review/finish it, or explicitly defer it with evidence before claiming the broader post-integration visual audit fully closed.
4. After #124 is closed or consciously deferred, select the next roadmap module rather than implicitly starting one. `SD.Live Patch` is documented and now eligible for prioritization, but is not automatically active.
5. Generic Finance Phase 3 write-back remains blocked; Inbox unread count and Finance → AppSheet deep links still require verified integrations/targets.
