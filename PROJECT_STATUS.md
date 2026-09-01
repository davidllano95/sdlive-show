# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-01 — America/Bogota** |
| Rama operativa | `main` |
| `main` runtime verificado antes de esta reconciliación | **PR #181 · `6844ca60537c88322abc853445ee09060f7b7318`** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/public stabilization/Rental parity CLOSED or operational; Availability Core v1 CLOSED/PASS** |
| Active Gate | **SD.Live Assistant + Lead Core** |
| Bloqueado | **Generic Finance Phase 3 write-back** |
| Paso inmediato | **Diseñar e implementar Lead Core D1 + contrato seguro del SD.Live Assistant sin cambiar las fuentes de verdad existentes.** |

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

Para runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Para QA manual con el owner: **una sola acción a la vez**.

Convención adicional: **no usar Cloudflare → Deployments como paso manual rutinario**. Revisarlo solo si el owner lo pide o si hay evidencia concreta de un problema de deployment.

Para docs-only: branch → docs → tests/CI → PR → CI green → squash merge; **no production smoke**.

## Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- Google Sheets `REGISTRO` = persistencia + formula owner para operaciones/finanzas.
- AppSheet **SD.Live Track** = cliente mobile/offline.
- D1 no es mirror de Finance/`REGISTRO`.
- D1 `site_schedule_state` = website-only Calendar presentation / Show Day state.
- D1 Availability = source of truth de reachability/availability; separado de Finance/REGISTRO/AppSheet.
- Cloudflare R2 = source of truth para media administrada/migrada por CMS.
- Formula-owned Sheets columns nunca se escriben desde Admin forms.
- COP y USD permanecen separados; no FX implícito.
- `Save Draft` no cambia producción; `Publish` promueve Draft → Published.
- Rental pricing/quote math permanece backend-owned.
- Rental notifica a `rental@sdlive.show`; Contact general a `hello@sdlive.show`.
- Calendar controlled create es una autorización estrecha y separada; **no** desbloquea generic Finance write-back.
- Google Calendar `sam@sdlive.show` es secondary projection/read-only overlay; no Google → REGISTRO/AppSheet reverse-write.
- Home es el contrato visual/navigation del header público.
- Todo UI nuevo/modificado reutiliza palette/tokens aprobados.
- Public WhatsApp identity permanece username-only; el owner phone number no se expone en HTML/JS/schema/Availability output.

## Estado de módulos cerrados / operativos

### Finance

**Operational / production-smoked PASS.**

- `/admin/finance/` es read-only sobre Sheets/API.
- COP/USD separados.
- `REGISTRO` conserva persistencia + fórmulas.
- AppSheet conserva mobile/offline workflow.
- PR #141 cerró el freeze causado por un DOM-wide `MutationObserver`; ese patrón queda prohibido en Finance runtimes.
- Generic Finance Phase 3 write-back sigue **BLOCKED**.

### Calendar / Site Schedule / Google Calendar

**CLOSED/PASS u operational.**

- Calendar lee `REGISTRO` y soporta `Fecha trabajo` + `Fecha fin` multi-day.
- controlled create es un write path estrecho, no un editor Finance genérico.
- Site Schedule D1 `site_schedule_state` es website-only presentation state con bloques Start/End/Show Day/Location.
- Google Calendar `sam@sdlive.show` es secondary projection/read-only overlay.
- no reverse-write Google → REGISTRO/AppSheet.

### Show Day

**CLOSED/PASS.**

- automático desde Site Schedule + America/Bogota;
- public visitor toggle eliminado;
- Admin QA override `Auto / Force On / Force Off` separado del source of truth y expira al final del día Bogotá;
- no reabrir salvo regresión.

### Admin/public stabilization + Rental image-editor parity

**CLOSED/PASS.**

- Admin stabilization issue #126 completed.
- Public post-integration visual audit issue #124 completed.
- Rental image-editor parity issue #156 completed through PR #157.
- no repetir auditorías/smokes históricos sin regresión nueva.

## Availability Core v1 — CLOSED/PASS

Availability es un core determinístico SD.Live-owned en D1.

### Estados públicos

- `available`
- `limited`
- `away`

### Precedencia Admin

1. **Backend Force Mode** — `Auto / Force On / Force Off`; máxima prioridad; non-Auto expira automáticamente al final del día del base timezone.
2. **Temporary operational override** — `Auto / Available / Limited / Away`; todos los non-Auto estados son bounded.
3. **Weekly service schedule** — Monday–Sunday, múltiples ventanas por día, evaluadas en el active Availability timezone.
4. **Compatibility default** — antes del primer save deliberado del schedule, Auto conserva Available.

Force Mode no destruye override/schedule subyacentes.

### Travel Mode

**Implemented / production-accepted.**

- timezone IANA temporal;
- explicit end date;
- auto-expire;
- travel no significa Away;
- cambia el timezone con el que se evalúa el weekly schedule;
- `Use device timezone`, comunes y `Other IANA timezone…` disponibles en Admin;
- public output no expone timezone/itinerary/reason.

PRs relevantes: #169, #170, #171.

### Next service window

**Implemented / production-accepted.**

Calcula la próxima ventana humana considerando schedule, closed days, expiración de override/Force/Travel, timezone changes y DST.

- Admin puede mostrar timezone para contexto.
- public `nextHumanWindow` es privacy-safe y no expone timezone/itinerary/private calendar detail.

PRs relevantes: #172, #173.

### Dashboard visual contract

**Production visual PASS.**

Availability y Show Day forman un compact control cluster coherente en desktop y se apilan en mobile.

- compact cards;
- `Manage availability` / `Manage Show Day`;
- typography/status pills/disclosures normalizados;
- Weekly Schedule compacto y sin overflow;
- deterministic CSS chevrons;
- Travel `OFF`, Availability y Show Day pills centradas/coherentes.

PRs relevantes: #174, #176, #177, #178.

### Flexible Temporary Status

**PRODUCTION SMOKE PASS.**

- timer flexible hours + minutes;
- min 15 min;
- max 24 h;
- `Auto / Available / Limited / Away` son selección;
- `Apply status` hace el commit explícito;
- timer/status pendientes no se aplican silenciosamente;
- `0 h / 15 min` fue verificado con Limited y Away;
- Away mostró el `Next service window` correcto;
- producción quedó limpia nuevamente en `Auto`.

PRs relevantes:

- #179 — flexible timer on polished Admin;
- #180 — fix canonical duration sync;
- #181 — explicit Apply status action.

### Owner WhatsApp command core

**Parser preparado; transport real NO conectado.**

Command shapes soportados para futuro transport autenticado incluyen:

- `away 4h`
- `limited 1h 30m`
- `away until 23:00`
- `ausente hasta 23:00`
- `back` / `volver`
- `status` / `estado`

Antes de activar WhatsApp:

- provider elegido deliberadamente;
- owner identity autenticada server-side;
- mensajes no autenticados rechazados antes del parser;
- owner phone number solo server-side;
- no webhook público inseguro.

### Public Availability / WhatsApp

- floating WhatsApp sigue siendo el único persistent floating CTA;
- integrated status tab `AVAILABLE / LIMITED / AWAY` + ES;
- bilingual explanatory popover;
- username-only WhatsApp public identity;
- owner phone number no aparece en browser/public output;
- Away puede mostrar deterministic next human window;
- no claim de AI availability hasta que SD.Live Assistant exista realmente.

### Closeout checkpoint

`docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md`

No reabrir Availability Core v1 salvo regresión.

## Active Gate — SD.Live Assistant + Lead Core

### Objetivo

Crear una capa de lead qualification/handoff que use las fuentes determinísticas existentes sin convertirse en nueva fuente de verdad de Availability, Rental o Finance.

Preferred architecture:

`Public site / popup → SD.Live API → optional AI → safe tools → SD.Live-owned Lead Core in D1 → notification → human handoff → optional CRM later`

### Nombre

**SD.Live Assistant**

Debe identificarse como assistant y nunca hacerse pasar por Samuel.

### Required v1 behavior

- bilingual EN/ES;
- classify `Live / Theatre / Sound Design / Systems / Rental / Other`;
- collect name/contact/date/city/venue/service/equipment/schedule/summary;
- consult deterministic Availability Core;
- answer from approved service/business information;
- create normalized Lead Core record in D1;
- generate clear human handoff;
- preserve deterministic Contact/Rental/WhatsApp fallbacks.

### Hard guardrails

- no inventar precios;
- no negociar precios;
- no prometer availability sin backend determinístico;
- no convertirse en Rental catalog/quantity/availability source of truth;
- no Finance/Admin data access;
- no inventar credits/capabilities/policies;
- no external CRM/vendor como única copia de lead/transcript data;
- provider outage no puede bloquear Contact/Rental/WhatsApp.

### Preferred initial stack

- Cloudflare
- D1
- Resend
- OpenAI API

Attio/CRM, Dapta y deeper WhatsApp automation permanecen optional/later.

## Backlog que NO desplaza el Active Gate

- Mobile Rental Cart — total visibility / sticky request summary.
- SD.Live Patch.
- Finance Document Generator.
- Rental availability/double-booking.
- Calendar workflow additions.
- AppSheet reminder alignment.
- Show Day simultaneous Primary/Secondary presentation priority.

## Relevant docs

- `README.md` — architecture/current operating overview.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — latest Availability closeout and exact continuation.
- `docs/checkpoints/handoff-availability-core-2026-09-01.md` — historical early Availability checkpoint.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability + Assistant/Lead design contract.
- `docs/checkpoints/handoff-current-state-2026-08-31.md` — historical pre-Availability checkpoint.
- `docs/roadmap/mobile-rental-cart-total-visibility.md` — bounded Rental mobile backlog.
- `ROADMAP_MASTER_CHECKLIST.md` — historical/future backlog, lower precedence than this file.

## Exact continuation point

1. Availability Core v1 is **CLOSED/PASS**. Do not repeat its smoke sequence unless a regression appears.
2. Docs-only reconciliation may merge after CI green; no production smoke required.
3. Begin **SD.Live Assistant + Lead Core** with D1 lead schema + safe tool contract + first public entry-point behavior.
4. Availability must be consumed as a deterministic tool/source, not reimplemented by AI.
5. Keep owner WhatsApp commands transport-neutral until verified-owner authentication/provider are explicitly designed.
6. Generic Finance Phase 3 write-back remains blocked.
