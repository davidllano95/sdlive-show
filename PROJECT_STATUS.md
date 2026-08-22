# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Se actualiza al cerrar milestones o ante cambios materiales de arquitectura/alcance, no con cada parche pequeño.
>
> **Backlog detallado preservado:** `ROADMAP_MASTER_CHECKLIST.md` contiene la reconciliación completa del checklist histórico/futuro. Ese archivo **no reemplaza** este Current State/Active Gate ni autoriza trabajo por sí solo.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-21 |
| Rama verificada | `main` |
| Commit de producción verificado | `4a8c425bc016acad78ef15d07dd8a7a4792bbc73` |
| Trabajo activo | **Ningún feature gate activo; siguiente F pendiente de decisión explícita** |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar y cerrar el Editor/CMS de forma incremental |
| Estado | **P2.8 Home CMS closeout CERRADO y smokeado en producción; media Home R2 y tooling temporal cerrados** |
| Active Gate | **Ninguno. No implementar backlog hasta promover explícitamente el siguiente trabajo a F.** |
| Gate posterior | **Revisar roadmap y promover explícitamente solo el siguiente trabajo aprobado a F** |

## Regla de precedencia

En caso de conflicto, prevalece este orden:

1. **Código actual + comportamiento verificable en producción.**
2. **Schema, migrations y configuración desplegada actual.**
3. **Este documento.**
4. **README.**
5. **`ROADMAP_MASTER_CHECKLIST.md`** para preservar detalle de backlog/futuro.
6. Prompts, ideas, benchmarks y referencias externas.

Un prompt nunca puede invalidar silenciosamente una funcionalidad existente, una invariante o una fuente de verdad. Si hay conflicto, **investigar y obtener una decisión explícita** antes de reemplazar arquitectura o comportamiento.

## Separación obligatoria: Estado / Roadmap / Future Integration / Vision

- **ESTADO / CURRENT STATE** = lo que puede demostrarse en repo, schema/config o producción.
- **ROADMAP / ACTIVE GATES** = trabajo aprobado y priorizado.
- **BACKLOG** = trabajo deseado documentado, todavía no necesariamente activo.
- **FUTURE INTEGRATION** = posibilidad compatible y documentada, **no autorizada** por existir aquí.
- **VISION** = dirección estratégica, no compromiso ni orden de implementación.

Ningún agente debe convertir `BACKLOG`, `FUTURE INTEGRATION` o `VISION` en trabajo activo sin repriorización explícita.

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md`, este archivo y luego `ROADMAP_MASTER_CHECKLIST.md` si la tarea toca backlog/futuro.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit de producción verificado arriba.
3. Si cambió, revisar solamente los diffs posteriores y actualizar los estados afectados.
4. Aplicar la **Regla de precedencia** y el **Change Safety Gate** antes de modificar arquitectura existente.
5. No rehacer trabajo marcado `[x]` salvo evidencia concreta de regresión.
6. Continuar por el primer gate **F — Active Gate** abierto. Si no hay ninguno, revisar roadmap y pedir/registrar una priorización explícita antes de implementar.
7. Las secciones **Backlog / Future Integrations / Vision** preservan dirección futura; **no autorizan implementación inmediata**.
8. Al cerrar un milestone material, actualizar este archivo y `README.md` con evidencia real de producción; si cambió el backlog, actualizar también `ROADMAP_MASTER_CHECKLIST.md`.

### Leyenda

- `[x]` Implementado y validado.
- `[~]` Parcial; existe base útil pero falta alcance o validación.
- `[ ]` Pendiente.
- **A — Ya existe**: conservar; no duplicar.
- **B — Existe parcialmente**: extender incrementalmente.
- **C — Existe con otra implementación**: conservar salvo ventaja clara y comprobada.
- **D — Future Integration**: valioso/compatible, pero no implementar ahora.
- **E — No recomendado / no aplicable**: no construir salvo que cambie el contexto.
- **F — Active Gate / Approved Work**: trabajo autorizado y actualmente priorizado.
- **Externo**: Cloudflare, Google, Workspace u otro servicio fuera del repositorio.

### Regla de evidencia

Toda afirmación **A/B/C/F** debe poder responder **“¿cuál es la evidencia?”**: código concreto, schema/config, endpoint, test, PR/commit y/o smoke de producción. Si algo importante no puede demostrarse, marcar **UNKNOWN** o investigar; no inventar.

## Architectural invariants — constitución del proyecto

Estas reglas se consideran permanentes salvo decisión explícita respaldada por evidencia:

- **Estabilidad > novedad.**
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics/media si la base actual puede extenderse.
- No crear sistemas paralelos de pricing, CMS, auth, analytics o media cuando el actual puede extenderse.
- Established production aesthetics son contratos; si un cambio CMS vuelve vulnerable una estética aprobada, extender **Visual Safeguards + tests** en el mismo PR.
- `Save Draft` nunca cambia producción; `Publish` es la acción que puede promover Draft → Published.
- Public content CMS usa **Published**, nunca Draft.
- **Global Select** debe llevar desde el visual al dueño CMS y al item correcto, aunque otra sección esté activa; futuros page editors deben extender el mismo contrato.
- Rental pricing/quote logic vive en backend y no puede convertirse en copy editable.
- Rental notifica **solo a `rental@sdlive.show`**; Contact general a `hello@sdlive.show`.
- Cloudflare Access es la barrera real del Admin.
- GTM no controla navegación, branding, copy ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.
- Retirar tooling temporal solo después de verificar su función cumplida; retirar migradores **no** autoriza borrar fallbacks críticos ni originales versionados.

## Source of Truth / Owner

| Área | Source of Truth | Evidencia actual |
|---|---|---|
| Código, CSS/JS, branding crítico, fallbacks | GitHub `main` | repo + deploy desde `main` |
| CMS Draft/Published estructurado | D1 `sdlive-cms-production` | APIs CMS + `cms_entries` / revisions |
| Contenido público CMS | D1 `published_json` validado | edge renderers + smoke Draft/Publish |
| Media binaria editable | R2 `sdlive-media-production` | upload API + `media.sdlive.show` |
| Metadata/referencias media | D1 | modelos CMS / logical refs |
| Rental pricing / quote math | Backend | pricing/cálculo existentes; presentation CMS no lo posee |
| Acceso Admin | Cloudflare Access | JWT server-side + `/admin/` protegido |
| Analytics público | GA4/GTM con consentimiento | Realtime validado |
| Future CRM | **TBD** | Admin module aún Planned/Soon |
| Future Lead → Quote → Project → Invoice | **TBD antes de implementar** | no existe source-of-truth único todavía |
| AppSheet futuro | **No decidir todavía** | integración pendiente; evitar segundo source-of-truth accidental |

## Evidence matrix — sistemas de alto riesgo

| Feature | Estado | Clasificación | Evidence |
|---|---|---|---|
| Hero CMS | Producción | A | D1 + `worker-entry.js` + APIs + production smoke |
| Trusted By / Supported Brands | Producción | A | D1/R2 + `trusted-*` + smoke + WLive preservation |
| Testimonials | Producción | A | D1/R2 + `testimonials-*` + smoke |
| About / Services / International / Work CMS | Implementado/producción | A | `core-sections-*` + PR #27/#28 + SSR/tests |
| Visual Safeguards | Producción | A | guard CSS/JS + Editor panel + tests |
| Automatic publish failsafe | Producción | A | `automatic-failsafe.js` + PR #31/#32 |
| Reusable Media Library | Implementado | A | `media-library.js` + media API + PR #33 |
| Rental presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34/#35 + smoke |
| Contact presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34 + smoke/Turnstile |
| Rental cart/pricing | Producción | A | runtime/backend + production cart smoke |
| Global Select cross-section | Producción smoke OK | A | PR #36, merge `7d54b83...`, `editor-resilience.js`, regression tests + manual smoke |
| Home CMS managed-media refs | Producción verificada R2 | A | Draft/Published checks + manual public URLs through `media.sdlive.show` for Trusted/About/Work/Testimonials/Rental |
| Temporary Home media migrator cleanup | Producción smoke OK | A | PR #37, merge `4a8c425b...`, CI verde + post-merge Editor/Safeguards/R2 smoke |
| Sound for Picture CMS | No implementado | D/UNKNOWN scope | hidden staging placeholder only |
| Projects | No implementado | D | Admin module disabled/planned |
| CRM pipeline | No implementado | D | leads/forms existen; pipeline ausente |
| Rental Admin full catalog/pricing editor | No implementado | D | public Rental existe; Admin module planned |

## Change Safety Gate

Antes de modificar una funcionalidad existente:

- [ ] ¿La funcionalidad ya existe?
- [ ] ¿Dónde está implementada?
- [ ] ¿Quién la consume?
- [ ] ¿Tiene datos persistentes?
- [ ] ¿Tiene API pública/interna?
- [ ] ¿Tiene impacto SEO/indexación?
- [ ] ¿Tiene impacto visual/interactivo?
- [ ] ¿Tiene impacto en producción/mercado/idioma?
- [ ] ¿Tiene tests?
- [ ] ¿Existe fallback?
- [ ] ¿Puede hacerse incrementalmente?
- [ ] ¿Existe rollback/reversión clara?
- [ ] ¿Cambia una fuente de verdad?
- [ ] ¿Requiere migración de datos/media?

Si alguna respuesta relevante es desconocida: **NO asumir. Investigar primero.**

Para CMS/editor, el smoke debe incluir cuando aplique: EN/ES, COL/INT, Desktop/Mobile, `Save Draft ≠ live`, `Publish = live` + Failsafe, estética/Safeguards, fallback y **Select desde la propia sección y desde otra sección/page, llegando al item exacto**.

## Política de mejoras futuras

Cuando se defina una mejora futura para SD.Live:

1. registrarla en **README + este roadmap**; el detalle extenso puede vivir en `ROADMAP_MASTER_CHECKLIST.md`, que forma parte del roadmap documental;
2. clasificarla A–F y distinguir Backlog/Future Integration/Active Gate;
3. registrar dependencias/source-of-truth cuando aplique;
4. **no implementarla automáticamente** salvo priorización explícita.

Puede agruparse con el PR/milestone activo para evitar deploys documentales innecesarios, pero no debe perderse.

---

# P0 — base pública estable

**Estado: CERRADO el 2026-08-20.**

- [x] Hosting Cloudflare Workers operativo.
- [x] Producción sincronizada con GitHub `main`.
- [x] HTTPS, root canónico, redirect `www` y URLs limpias.
- [x] Home, `/en/`, `/es-co/`, Theatre, Privacy, landings SEO y 404 funcionando.
- [x] D1 `sdlive-cms-production` conectado.
- [x] Admin protegido por Cloudflare Access y JWT server-side.
- [x] Contacto guarda lead + consentimiento y notifica a `hello@sdlive.show`.
- [x] Rental guarda solicitud + consentimiento y notifica **solo** a `rental@sdlive.show`.
- [x] Pricing Rental calculado en backend.
- [x] Turnstile y consentimiento implementados.
- [x] GTM/GA4 base validada en producción.
- [x] `generate_lead`, email y WhatsApp observados en GA4 Realtime.
- [x] SEO técnico P0 publicado: canonical, hreflang, JSON-LD, Open Graph, robots y sitemap.
- [x] WLive confirmado como contenido vigente; no retirar.
- [x] Marca visual `SD.Live` con punto flotante en superficies dinámicas.
- [x] Copy canónico Home: **“Creative Audio. Technical systems. Built for the show.”**

---

# P1 — Hero CMS + first paint

**Estado: CERRADO.**

- [x] Hero Draft/Published/revisions en D1.
- [x] Published Hero conectado al Home.
- [x] SSR en Cloudflare edge antes del first paint.
- [x] Fallback estático si D1 falla o contenido es inválido.
- [x] Draft del Admin aislado de producción.
- [x] EN/ES desde la misma estructura.
- [x] Cookie de idioma disponible al Worker; fallback a `Accept-Language` y luego EN.
- [x] Sin flash de copy ni vacío de hydration.
- [x] Wordmark visual SD.Live correcto antes del line-wrap.
- [x] `node:test` + GitHub Actions CI.
- [x] Tests de schema, D1, fallback, idioma, SSR y aislamiento Admin.

Archivos clave: `worker-entry.js`, `worker.js`, `hero-content.js`, `cms-hydration.js`, `home-navigation.js`.

PRs principales: #1, #2, #3, #4.

---

# P2 — ampliar el Editor/CMS de forma incremental

## P2.1 — Trusted By / Brands Supported Through — Editor

**Estado: CERRADO.**

- [x] Modelo CMS propio para Trusted By.
- [x] Draft y Published en D1.
- [x] API pública `GET /api/content/trusted`.
- [x] Editor de clientes, nombres, roles, logos, orden y reveals.
- [x] Agregar/eliminar/reordenar clientes.
- [x] WLive protegido contra borrado desde UI.
- [x] Flechas rápidas y Pause/Play del carrusel en preview.
- [x] Pause persiste tras hover y reconstrucciones del Draft.
- [x] Select lleva al cliente/reveal/item correspondiente en el inspector.
- [x] Supported Brand placement Auto/Left/Center/Right.
- [x] Wonderlust preview Desktop normalizado para coincidir con el sitio público.
- [x] Swipe táctil en móvil; desktop conserva comportamiento propio.
- [x] Toasts no bloquean controles del inspector.
- [x] Carrusel conserva fase al editar placement y otros cambios del Draft.

### Polish pendiente no bloqueante

- [ ] Corregir pequeño offset de la navegación izquierda al saltar a **Trusted By**; debe alinear contra el contenedor completo de la sección, no quedar unos píxeles abajo.

## P2.1.2 — Media / R2 para Trusted

**Estado: CERRADO para Trusted By / Supported Brands.**

- [x] Bucket R2 `sdlive-media-production`.
- [x] Storage class **Standard**.
- [x] Custom Domain `media.sdlive.show` activo.
- [x] Public Development URL / `r2.dev` desactivado.
- [x] Binding Worker `MEDIA_BUCKET`.
- [x] `MEDIA_PUBLIC_BASE=https://media.sdlive.show`.
- [x] Endpoint autenticado de status/upload.
- [x] PNG/JPEG/WebP, máximo 5 MB.
- [x] Keys versionadas bajo `cms/<folder>/...`.
- [x] Cache metadata larga/immutable.
- [x] Upload/Replace desde Trusted Editor.
- [x] Slider de escala visual 50%–180% sin generar derivados binarios.
- [x] Escala y placement persistidos como metadata en D1.
- [x] Migrador one-click de assets legacy de Trusted/Supported Brands a R2.
- [x] Migración ejecutada y validada; Editor recargado correctamente después de `Save Draft`.
- [x] Producción Trusted/Supported Brands verificada sirviendo media desde `media.sdlive.show`.
- [x] GitHub conserva originales/fallbacks; su borrado no forma parte del cleanup de migradores.

### Arquitectura de media acordada

**GitHub:** código, CSS/JS, branding crítico, favicon/app icons y fallbacks esenciales.  
**D1:** texto, orden, asociaciones, alt, escala, placement, visibilidad y referencias lógicas.  
**R2:** media administrable/reemplazable desde el Editor.

### Estado de migración de media Home

1. [x] Trusted By + Supported Brands — R2 verificado en producción.
2. [x] Testimonials — R2 verificado en Draft/Published y producción.
3. [x] Portfolio / Selected Work — R2 verificado; el único Draft publicado pendiente se comparó con live, se publicó y Failsafe quedó verde.
4. [x] About — R2 verificado en Draft/Published y producción.
5. [x] Rental imagery — R2 verificado en Draft/Published y producción.
6. [ ] Insights/Journal thumbnails/hero cuando exista contenido real.
7. [ ] Otras imágenes administrables al entrar cada sección al CMS.
8. [ ] Borrar duplicados/originales de GitHub solo mediante cleanup posterior reference-aware; **no** es parte de P2.8.

### Guardrails R2

- Standard storage; no Infrequent Access.
- Media pública por `media.sdlive.show`, no por Worker GET por archivo.
- CDN/cache delante de R2.
- URLs versionadas + cache immutable.
- Resize visual mediante CSS/D1, no derivados por cada movimiento de slider.
- No activar Cloudflare Images, Stream, Data Catalog ni productos pagos sin aprobación explícita.
- Limpieza de objetos huérfanos solo con proceso controlado.

## P2.2 — Published Trusted By → Home

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN.**

- [x] `trusted-edge.js` lee únicamente `published_json` de D1.
- [x] Validación de schema antes de renderizar.
- [x] Public Home `/` recibe Trusted Published por `HTMLRewriter`/SSR.
- [x] Static Trusted permanece como fallback deliberado.
- [x] Admin iframe recibe documento estático y mantiene Draft local aislado de Published SSR.
- [x] R2 logical refs `assets/media/...` se resuelven a `https://media.sdlive.show/...`.
- [x] EN/ES renderizado correctamente.
- [x] WLive preservado.
- [x] Wonderlust mantiene wrappers/layout correcto.
- [x] Scale y placement se respetan en producción.
- [x] Runtime público recalcula placement responsivo.
- [x] Cambio de idioma no reconstruye sets del carrusel ni pierde listeners de Supported Brands.
- [x] Supported Brands permanecen visibles/interactivas al cambiar EN↔ES sin recargar.
- [x] Hover/carrusel estabilizado; el retroceso cerca de Mediacoustix dejó de reproducirse tras el fix.
- [x] Prueba final de publishing validada: **Save Draft no cambia producción; Publish sí cambia producción.**

PRs principales del cierre Trusted/R2/SSR: #12–#22.

## P2.3 — Testimonials CMS + Visual Safeguards

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

- [x] Schema/default model de Testimonials sobre el contenido real existente.
- [x] Draft/Published/revisions en D1.
- [x] API pública y endpoints Admin de Testimonials.
- [x] Editor EN/ES de heading, persona, cargo/empresa y quote.
- [x] Agregar/eliminar/reordenar testimonios.
- [x] Visibilidad pública y featured por testimonio.
- [x] Select exacto desde preview al item correspondiente.
- [x] Upload/Replace/Remove de logo mediante R2 y escala visual 50%–180%.
- [x] Published → Home por edge SSR usando solo `published_json`.
- [x] Static markup como fallback seguro.
- [x] Admin iframe aislado de Published SSR.
- [x] Smoke Desktop/Mobile y EN/ES validado.
- [x] Prueba `Save Draft ≠ live` / `Publish = live` validada y cambio de prueba revertido.
- [x] Visual Safeguards añadidos para proteger estética estable frente a reconstrucciones CMS.
- [x] Panel **Safeguards** en Editor con diagnóstico y **Restore all defaults**; controles solo afectan preview, nunca D1.
- [x] Guard actual cubre glass, auroras, reveal motion, card sheen, Trusted carousel motion, supported-brand reveal y CTA hover.
- [x] Sheen de Trusted/Testimonial usa barrido `background-position` sin transformed child dentro del marquee.
- [x] Sheen reajustado en #25 para pacing visual aprobado y clipping completo dentro de cards.
- [x] Tests de regresión bloquean pérdida silenciosa de estas invariantes visuales.

PRs principales: #24 (P2.3 + safeguards), #25 (sheen pacing/clipping).

## P2.4 — About / Services / International / Selected Work CMS + automatic failsafe

**Estado: CERRADO.**

- [x] CMS models para About, Services, Work e International.
- [x] Draft/Published/revisions y API compartida.
- [x] Published core Home sections renderizadas en edge con fallback estático.
- [x] Editores visuales y navegación International.
- [x] About media R2 habilitado.
- [x] Validación/seguridad de links internos CMS.
- [x] Smoke fixes para core Select y Safeguards.
- [x] Automatic publish failsafe añadido.
- [x] Publish progress visible y false failsafe failure corregido.

PRs principales: #27–#32.

## P2.5 — Reusable Media Library + section migrators

**Estado: CERRADO; tooling migratorio temporal retirado en P2.8.**

- [x] Reusable R2 Media Library API.
- [x] Reusable Media Library panel.
- [x] About/Work conectados a Media Library.
- [x] Migradores temporales About/Work cumplieron su función.
- [x] Migrator observers protegidos contra loops durante la transición.
- [x] Regla de transición: cada sección CMS con media editable obtiene un camino legacy→R2 cuando realmente lo necesita.
- [x] Home media actual verificada en R2 antes de retirar el tooling temporal.
- [x] PR #37 retiró los cuatro migradores temporales tras verificación y smoke, preservando Media Library y fallbacks.

PR principal: #33. Cleanup final del tooling temporal: PR #37.

## P2.6 — Rental + Contact CMS + R2 migration

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

- [x] D1 Draft/Published/revisions para Rental presentation y Contact.
- [x] Rental CMS edita solo presentación: headings, preset labels, groups, equipment copy/notes/images.
- [x] Pricing, availability, preset composition, cart IDs y quote math siguen system/backend-owned.
- [x] Contact CMS edita copy/labels; email, Turnstile y lógica de envío siguen fuera del CMS.
- [x] Targeted edge patching preserva Rental DOM transaccional y Contact form.
- [x] Rental Upload/Replace/Media Library + legacy media migrator durante la transición.
- [x] Testimonials legacy-logo migrator durante la transición.
- [x] Sound for Picture no fue promovido; sigue staging/placeholder oculto.
- [x] Smoke Rental: `Save Draft` no tocó live; Publish sí cambió live y Failsafe quedó verde.
- [x] Smoke media: Rental + Testimonials migraron Draft-only; Published permaneció intacto.
- [x] Limitación temporal del migrador (regresar visualmente al Home tras migrar) quedó eliminada al retirar el tooling en P2.8; no se abrió un fix paralelo.
- [x] Smoke cart: items/cantidades/totales/form operativos.
- [x] Smoke Contact: `Save Draft ≠ live`, Publish correcto, form + Turnstile visibles.
- [x] Primer smoke detectó `market: "colombia"` incompatible con D1 `CHECK market IN ('all','col','int')`; PR #35 corrigió Rental a `col` y añadió test de regresión.

PRs principales: #34, #35.

## P2.7 — Global Select + permanent Change Safety policy

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

Objetivo cumplido: reforzar el Select existente y convertir autoridad/evidencia/change-safety en políticas permanentes del repo.

- [x] Select activa el dueño CMS aunque otra sección esté seleccionada.
- [x] Collections/cards llevan al item exacto cuando es identificable.
- [x] Futuros CMS/pages deben smokear Select desde dentro y desde otra sección/page.
- [x] `editor-resilience.js` existente fue extendido; **no se creó implementación paralela**.
- [x] Routing Home actual: Hero, Trusted, About, Services, International, Work, Testimonials, Rental, Contact.
- [x] Rental recovery INT→COL quedó cubierta por regresión automatizada cuando exista target seleccionable.
- [x] Tests de regresión del contrato Global Select.
- [x] README/roadmap reforzados con precedencia, Evidence, Source of Truth, F Active Gate y Change Safety.
- [x] Checklist histórico/futuro reconciliado en `ROADMAP_MASTER_CHECKLIST.md` sin convertir backlog en Active Gate.
- [x] PR #36 merged; squash commit `7d54b83b37e6e30f889eff9a41b25a18b268b8a9`.
- [x] Production smoke: same-section exact item PASS.
- [x] Production smoke: cross-section exact owner/item PASS.
- [x] Production smoke: non-card Services filter routing PASS sin interacción accidental.
- [x] Production smoke: Interact mode PASS.
- [x] Rental manual desde INT = **N/A por diseño**, porque Rental está oculto y no existe target clickeable; esto no se interpreta como failure. La regresión automatizada mantiene la recuperación INT→COL.

## P2.8 — Home CMS closeout cleanup

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

Objetivo cumplido: retirar únicamente el tooling temporal de migración legacy→R2 que ya cumplió su función, sin tocar contenido, D1, R2, pricing, renderers ni fallbacks.

Evidencia previa al cleanup:

- [x] About saved Draft: R2.
- [x] Selected Work saved Draft: R2.
- [x] Testimonials saved Draft: R2.
- [x] Rental saved Draft: R2.
- [x] Trusted saved Draft: R2.
- [x] About Published/producción: imagen pública resuelve vía `media.sdlive.show`.
- [x] Selected Work Published/producción: imagen pública resuelve vía `media.sdlive.show`.
- [x] Testimonials Published/producción: logo/imagen pública resuelve vía `media.sdlive.show`.
- [x] Rental Published/producción: imagen pública resuelve vía `media.sdlive.show`.
- [x] Trusted Published/producción: logo público resuelve vía `media.sdlive.show`.
- [x] Selected Work tenía Publish habilitado; preview vs live se comparó visualmente como idéntico, se publicó y Failsafe terminó verde.

Scope ejecutado y cierre:

- [x] Branch corta `chore/home-cms-closeout-cleanup` desde `main` verificado.
- [x] Retirados loaders de `trusted-media-migration.js`, `testimonials-media-migration.js`, `core-media-migration.js`, `rental-media-migration.js` del Editor shell.
- [x] Retirados esos cuatro scripts temporales.
- [x] Retirados tests dedicados únicamente al comportamiento de migración eliminado.
- [x] Añadida regresión que asegura que los cuatro migradores retirados no vuelvan a cargarse y que Media Library/bridges/controls permanentes sigan presentes.
- [x] **Conservados** Media Library, section bridges, Trusted media controls, CMS/APIs/edge renderers y static/GitHub fallbacks.
- [x] CI verde en PR #37; el primer run detectó tres asserts históricos que todavía exigían los migradores, se actualizaron al contrato permanente y el siguiente run pasó.
- [x] PR #37 squash-merged a `main`; commit `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`.
- [x] Production smoke: Home Editor sin panel temporal `R2 migration`.
- [x] Production smoke: Media Library / Upload / Replace normales intactos.
- [x] Production smoke: Global Select cross-section PASS.
- [x] Production smoke: Interact mode PASS.
- [x] Production smoke: Safeguards `Run check` **9/9 healthy**.
- [x] Production smoke: About público continúa resolviendo imagen vía `media.sdlive.show`.

**No formó parte de P2.8:** borrar originales/fallbacks de GitHub, limpiar R2 huérfano, cambiar schemas, cambiar URLs públicas, cambiar pricing o promover otro backlog item.

---

# Backlog maestro por área

> El inventario histórico/futuro detallado vive en `ROADMAP_MASTER_CHECKLIST.md`. Este bloque mantiene los temas operativos de alto nivel para no duplicar cientos de subtareas en el Current State.

## Admin / CMS / Editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero CMS completo y Published→Home SSR.
- [x] Trusted By CMS completo, R2 y Published→Home SSR.
- [x] Testimonials CMS completo, R2 opcional y Published→Home SSR.
- [x] About / Services / International / Work CMS.
- [x] Rental / Contact presentation CMS.
- [x] Visual Safeguards + Editor diagnostics/restore.
- [x] Automatic publish failsafe + publish progress.
- [x] Media Library reusable sobre R2.
- [x] **Global Select cross-section/page-aware contract — P2.7 cerrado y smokeado.**
- [x] **Cleanup de migradores temporales — P2.8 cerrado, CI/merge/smoke completos; fallbacks conservados.**
- [ ] Drag/drop, snap-to-grid, resize y layout visual genérico.
- [ ] Reorder genérico de otras cards/bloques.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Full-page Draft transaction/state.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita + acceso controlado a staging/mockups útiles.
- [ ] Autosave Draft, diff before Publish, scheduled Publish/visibility y shortcuts cuando se prioricen.
- [ ] Revisar y retirar `admin/admin.js` / `admin/admin.css` si se confirma duplicación frente a `admin/editor/*`.
- [ ] Fix menor: alineación del salto `Trusted By` en navegación izquierda.

## Header, navegación y controles flotantes

- [ ] **WhatsApp en todas las landings públicas.** Reutilizar el botón Home en Theatre, `/en/`, `/es-co/`, servicios Bogotá, Rental y demás páginas públicas; mismo destino, tracking, safe-area y responsive.
- [ ] Reordenar/espaciar elementos del header desde Admin.
- [ ] Show/hide de CTAs, Show Day, WhatsApp y controles por página/mercado/dispositivo.
- [ ] Configurar anchors y scroll offset.
- [ ] Agregar/quitar items del menú.
- [ ] Posición independiente Mobile de WhatsApp, cart, Show Day/Live controls y Back to Top.
- [ ] Presets contextuales de header y preview de safe areas Mobile si se aprueba.

## Contenido público

- [x] Hero CMS real en producción.
- [x] Trusted By CMS real en producción.
- [x] Testimonials CMS real en producción; no recrear placeholders solo por balance visual.
- [x] About/Services/International/Selected Work con CMS core.
- [x] Rental/Contact presentation CMS.
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Portfolio/Selected Work: CMS base existe; faltan case-study/credits/tags/featured más profundos si se aprueban.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Show Day: manual existe; falta integración con calendario y cobertura deliberada de páginas públicas.
- [ ] Portfolio/CV privado no indexado con variantes profesionales/share controls.
- [ ] Recuperar Insights/Journal cuando exista contenido real y capacidad editorial.
- [ ] Technical Audio Training: backlog aprobado; definir oferta/curriculum/audiencia/capacidad/precio/evidencia antes de publicar.
- [ ] Sound for Picture: no promover placeholder; requiere contenido real y scope aprobado.
- [ ] Auditar staging restante como Future Projects / Behind the Console / Field Notes antes de Template Library.

## Contacto / Rental

- [x] Contact → `hello@sdlive.show`.
- [x] Rental → **`rental@sdlive.show` exclusivamente**.
- [x] Turnstile + consentimiento + D1.
- [x] Pricing y bundles server-side.
- [x] Rental oculto en INT salvo intención directa `#rental`/contexto permitido.
- [x] Rental/Contact presentation CMS Draft/Published.
- [x] Rental cart smoke posterior a P2.6.
- [ ] **Compatibilidad guiada para cliente no técnico:** al añadir **Behringer WING**, recomendar **Midas DL32**; al añadir **LV1 Classic**, recomendar **StageGrid 4000**. Definir visual/UX con aprobación antes de implementar; no autoagregar silenciosamente.
- [ ] **Rental Admin — alta de nuevos items + pricing rules validadas:** precio fijo, por día, multi-day, cantidades, pair/bundle y pricing condicional. El Admin edita estructura validada; **backend sigue siendo source-of-truth del cálculo**.
- [ ] Card Equipment Rental debe llevar a `#rental` y tener comportamiento INT deliberado.
- [ ] Hacer inequívoco que el carrito es **solicitud de cotización, no checkout**, para proteger conversión/lead.
- [ ] Resolver empty state, service-only total 0 y reset incompleto.
- [ ] Afinar delivery/logística.
- [ ] PDF de quote, vigencia, disponibilidad y aprobación.
- [ ] Inventario/calendario y prevención de double booking.
- [ ] Contact: rate limiting explícito; confirmation email al visitante solo si se diseña/aprueba.

## CRM / Projects / Calendar

**Estado real del repo:** el dashboard muestra Leads/CRM, Rental Admin, Projects y Calendar como módulos **Planned/Soon**; no tratarlos como módulos ya implementados. Existen datos/forms y piezas públicas que podrán alimentarlos posteriormente.

- [ ] Pipeline Lead: New → Contacted → Quoted → Confirmed → Lost.
- [ ] Clientes/contactos/empresas, notas, historial y source.
- [ ] Relación Lead → Quote → Project → Invoice.
- [ ] Integración AppSheet solo con source-of-truth definida.
- [ ] Projects con cliente, show, rol, fechas, venue, contactos, archivos y Rental/Quote/Calendar.
- [ ] Calendar Admin integrando Google Calendar/AppSheet/Projects/Rental/disponibilidad.
- [ ] Show Day automático desde calendario con ventana configurable y override manual.
- [ ] Quote automation/PDF/acceptance solo sobre pricing/source-of-truth existentes.

## Inbox / Workspace

- [x] Operación de correo vía Gmail/Workspace.
- [x] Main public config usa `hello@sdlive.show`; Rental usa `rental@sdlive.show`.
- [ ] Inbox nativo en Admin por categorías.
- [ ] Responder desde alias correcto.
- [ ] Email → Lead / Rental / Project.
- [ ] Audit final de referencias a email personal/legacy.
- [ ] Verificar aliases operativos antes de automatizar (`hello@`, `info@`, `rental@`, `projects@`, `billing@`, `facturas@`); `noreply@`/`quotes@` solo si aportan valor real.
- [ ] Revisar DMARC cuando Workspace esté estable.

## Analytics / SEO / growth

- [x] GTM + Consent Mode + GA4 base.
- [x] `generate_lead`, email y WhatsApp validados/observados en GA4 Realtime; no reiniciar ese troubleshooting sin evidencia de regresión.
- [x] SEO técnico P0 base: canonical, hreflang, JSON-LD, OG, robots, sitemap y redirects relevantes.
- [ ] Si no hay evidencia explícita aún: confirmar un submit controlado → un solo `generate_lead` para cerrar duplicate-firing integrity.
- [ ] Separar tráfico interno/testing.
- [ ] Revisar Key Events vs microconversiones.
- [ ] Funnel sesión/source → lead → qualified → closed cuando exista downstream source-of-truth.
- [ ] Monitorizar Google/Bing indexación, queries, impressions, CTR, países, entradas y Core Web Vitals.
- [ ] Search Console/Bing Webmaster coverage y discoverability post-arquitectura.
- [ ] Medir landings antes de crear más SEO pages.
- [ ] Candidate query research: `alquiler sonido bogota`, `sonido eventos corporativos bogota`, `alquiler consolas bogota`, `behringer wing bogota` — **no crear páginas automáticamente**.
- [ ] Dashboard SEO/comercial cuando haya volumen y source-of-truth suficiente.
- [ ] Estrategia de adquisición basada en conversiones/revenue; evaluar LinkedIn/RRSS, referrals/partners, outreach, formación/tutoriales y podcast solo con audiencia/ROI definidos.
- [ ] Journal/Insights con contenido real: profesionales de audio, briefs AV para marketing, formación/técnica y análisis responsable de Suno/IA/audio production.

### Regla Analytics permanente

**observar → probar → confirmar → corregir → volver a probar.** No modificar GTM sin evidencia; DebugView es para sesiones debug/Preview y Realtime para validar tráfico live normal.

### Regla SEO/IA permanente

La secuencia correcta es:

**oferta real → página útil → SEO**

Nunca:

**keyword → página artificial → contenido generado**.

Antes de crear una página SEO, determinar qué servicio real representa, quién/cómo se presta, mercado, capacidad operativa, evidencia/portfolio, CTA, intención de búsqueda y si otra URL ya cubre esa intención. Si no existe una oferta real detrás: **NO CREARLA**.

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2 y consentimiento forman la base actual.
- [x] Tests + CI base.
- [x] Visual regression contracts para sistemas protegidos por Safeguards.
- [x] Automatic publish verification base.
- [x] `/api/health` existe; ampliar observabilidad sin duplicar sistemas.
- [ ] Rate limiting explícito y verificable.
- [ ] CSP, Referrer-Policy y Permissions-Policy sin romper GTM/Turnstile/media.
- [ ] Migraciones/versionado de esquema D1.
- [ ] Observabilidad Admin de Worker/D1/R2, publish/deploy y errores.
- [ ] Alertar antes de límites relevantes de R2/Workers.
- [ ] Backups/export y rollback operacional.
- [ ] Limpieza segura/reference-aware de R2 huérfano después de replacements/migraciones.
- [ ] Refactor/optimización de monolitos (`index.html`, `script.js`, `styles.css`, `worker.js`) solo incrementalmente, con tests verdes, smoke, rollback y beneficio concreto. **Optimizar sin romper nada > refactor por estética.**
- [ ] Auditoría/pruebas de ciberseguridad sobre stack real + evaluación documentada de Cloudflare free vs paid; no activar productos pagos sin riesgo/ROI/approval.
- [ ] Retirar `deploy-test.txt` en cleanup futuro si se confirma que ya no sirve.

---

# Competitive / Benchmark References

**Estas páginas son inspiración/aprendizaje, nunca templates ni requisitos. No copiar diseño, copy, imágenes o branding. Cuando un cambio de diseño/estructura se apoye materialmente en estas referencias, consultar sus versiones vigentes primero y confirmar antes de adoptar un patrón comparable.**

| Referencia | Aprendizaje permitido |
|---|---|
| `https://www.mediacoustix.com/` | autoridad profesional, servicios, storytelling, SEO |
| `https://www.aerislatam.com` | ingeniería, case studies, proyectos, integración |
| `https://www.adlib.co.uk` | case studies, producción, rental, documentación técnica |
| `https://www.cohesionaudio.com` | proyectos técnicos, equipment associations |
| `https://www.worldtouraudio.com` | rental, staffing, engineering |
| `https://wonderlust.live/` | interacción/brand expression; consultar antes de cambios relacionados |
| `https://www.wlive.co` | referencia contextual/branding; WLive además es contenido vigente de SD.Live |

---

# Future Evolution — visión SD.Live 2.0

**Estado de esta sección: ROADMAP FUTURO / VISION, salvo filas F. No implementación automática.**

La visión recibida el 2026-08-21 se interpreta como una dirección estratégica: evolucionar el sistema actual hacia una plataforma digital que conecte descubrimiento → confianza → cotización/rental → lead → proyecto, **aprovechando la arquitectura existente**. No es una orden de reconstrucción ni de copiar Mediacoustix, Aeris, Adlib, Cohesion, World Tour Audio, Wonderlust o WLive. Las referencias externas son principios de aprendizaje, no templates visuales.

`ROADMAP_MASTER_CHECKLIST.md` preserva el inventario histórico/futuro completo (32 bloques + requisitos cross-cutting + GA4 checkpoint) con cada bloque marcado Done / Partial / Future. **Ese detalle no cambia el Active Gate.**

## Current State contrastado con el repo

- **A — Ya existe:** frontend vanilla HTML/CSS/JS; Cloudflare Workers/Static Assets; D1; R2; Cloudflare Access; CMS Draft/Published/revisions; Hero/Trusted/Testimonials/About/Services/International/Work/Rental/Contact CMS según scope; reusable Media Library; Rental público con pricing backend; Contact/Rental forms; GTM/GA4/Consent; EN/ES; COL/INT; landings SEO actuales; canonical/hreflang/robots/sitemap/JSON-LD base; Visual Safeguards; automatic publish failsafe; Global Select cross-section production-smoked; Home managed-media production refs on R2; temporary Home media migrators retired and production-smoked in P2.8.
- **B — Parcial:** Portfolio/Work sin case-study model profundo, Raw vs Mixed sin media real/Admin, Show Day sin calendario, Rental sin catálogo/admin completo, SEO sin sistema CMS-first para metadata de páginas futuras, analytics sin dashboard comercial/tráfico interno limpio, Insights/Journal sin sistema editorial real.
- **D — Future Integration:** layout visual avanzado, header/floating controls, Projects/case studies, Rental product SEO/Admin pricing rules/compatibility guidance, Article/Journal CMS, CRM pipeline/atribución, AppSheet, Calendar, quote automation, private portfolios, analytics dashboards, SEO CMS, internal linking graph, security/observability, Training y expansión audiovisual.
- **F — Active Gate:** **ninguno actualmente.** El siguiente gate requiere promoción explícita después de revisar valor/riesgo/dependencias.
- **Importante:** aunque una visión futura describa CRM, Projects, Rental Admin u otros módulos, el repo manda. No documentarlos ni tratarlos como implementados hasta que exista código/flujo real.

## Gap analysis / priorización futura

| Funcionalidad | Estado actual | Propuesta futura | Clasificación | Priority | Effort | Impact | Risk | Dependencias / evidencia |
|---|---|---|---|---|---|---|---|---|
| Home media closeout | R2 refs verificadas; migradores temporales retirados; smoke post-merge OK | conservar Media Library/fallbacks; cualquier cleanup adicional requiere auditoría separada | **A** | closed | — | medio | bajo | PR #37 + `4a8c425b...` + production smoke |
| Global Select | cross-section/page-aware implementado y smokeado | conservar/expandir el mismo contrato para futuros pages | A/B | P0 | incremental | alto | bajo/medio | PR #36 + production smoke |
| Visual layout Editor | CMS content editing exists; no freeform layout engine | drag/drop, grid, resize, spacing, device/market controls | D | P2 | XL | alto | alto | define data model + rollback; preserve safeguards |
| Services CMS | implementado en P2.4 | profundizar modelo solo cuando haya necesidad real | A/B | P1 | M | alto | medio | `core-sections-*`, PR #27 |
| Arquitectura de páginas de servicio | landings puntuales, no sistema completo | páginas profundas por servicio/intención real | D | P1 | L | alto | medio | Services model + keyword research + IA aprobada |
| Technical Audio Training | no publicado | evaluar servicio real + content/page | D | P2 | M | medio/alto | bajo | curriculum/audience/capacity/pricing/evidence |
| SEO CMS fields | metadata mayormente code/static | title, description, canonical, OG, noindex, sitemap, social preview, schema config | D | P1 | M | alto | medio | modelo de página; no duplicar metadata existente |
| Rental SEO | Rental público + algunas landings; no catálogo indexable completo | categorías/product pages conectadas al configurador | D | P1 | L | alto | medio | Rental model estable + canonical strategy |
| Rental compatibility guidance | no recomendaciones automáticas | WING→DL32; LV1→StageGrid guidance | D | P2 | M | medio/alto | bajo | UX por aprobar; conservar cart/backend |
| Rental Admin pricing model | pricing backend code-owned | alta de items + reglas validadas desde Admin | D | P1 | L/XL | alto | alto | source-of-truth backend + schema/migration/rollback |
| Rental packages/indexability | bundles/pricing backend existen | páginas/configuraciones útiles y reales | D | P2 | M | medio/alto | bajo | no packages artificiales |
| Projects / case studies | Work CMS base; Admin Projects planned | Project model + casos reales | D | P1 | XL | estratégico | medio | source-of-truth + Media Library + privacy |
| Portfolio CMS profundo | Work CMS base existe | credits/tags/featured/case-study model | B/D | P1 | L | alto | medio | core Work + Media Library |
| Raw vs Mixed | UI/runtime existe | real media + Admin pairs/waveform | B/D | P2 | M | medio | medio | real rights-cleared audio |
| Media Library | reusable library implementada | ref safety/soft-delete/cleanup/crop/alt/OG | A/B | P1 | M/L | alto | medio | R2 + D1 refs; PR #33 |
| Journal / Articles CMS | Insights no operativo como sistema real | artículos técnicos reales | D | P2 | L | alto | bajo/medio | Article model + SEO fields + Media Library |
| Internal linking | links manuales | relaciones Services ↔ Products ↔ Projects ↔ Articles | D | P1 | M | alto | bajo | modelos reales; evitar páginas huérfanas |
| Structured data avanzado | JSON-LD base existe | Service/Product/Article/Breadcrumb schema donde corresponda | B/D | P1 | M | alto | medio | contenido visible real; guías vigentes |
| Multidioma SEO | EN/ES + hreflang base existen | URLs/metadata equivalentes por contenido nuevo | B/D | P1 | M | alto | medio | arquitectura de páginas; no mezclar idiomas |
| Local SEO | Bogotá/Colombia ya tiene landings | ampliar solo para ofertas/queries reales | D | P2 | M | medio/alto | bajo | intent research; no doorway pages |
| CRM pipeline | forms/D1 existen; Admin Leads planned | New→Contacted→Quoted→Confirmed/Lost + cliente/empresa/historial | D | P1 | XL | estratégico | source-of-truth, permisos, quote flow |
| AppSheet/Calendar | external systems exist; no integration | selective sync + Show Day + availability | D | P2 | XL | alto | alto | source-of-truth first |
| Lead attribution | GA4 + forms base | landing, UTM, campaign, service/product y revenue attribution | D | P1 | L | estratégico | CRM + analytics identifiers + privacy/consent |
| Analytics integrity | base events validated; testing traffic contaminated | internal filtering, duplicate proof, Key Events hygiene | B/D | P1 | M | alto | bajo | do not restart confirmed GA4 tests |
| Analytics dashboard | GA4 existe; Admin Analytics planned | SEO/commercial dashboard con GSC/GA4/CRM | D | P2 | L | alto | datos/volumen real + APIs/CRM |
| Conversion/forms | Contact/Rental funcionan | reduce friction + quote clarity | B/D | P1 | M | alto | bajo | measure before/after |
| Email/Workspace | main routing fixed | alias audit, DMARC, native Inbox | B/D | P2 | L | alto | medio | Workspace external state |
| About / professional authority | About CMS existe | perfil más profundo con datos verificables | B/D | P2 | M | medio/alto | material real/autorizaciones |
| Video/motion | identidad audiovisual existe | video contextual y optimizado | D | P2 | L | alto | Media Library/video strategy + CWV |
| Press / mentions | no módulo | `/press` if enough real corpus | D | P3 | M | medio | bajo | no fabricar autoridad |
| Accessibility audit | variable | contrast/keyboard/focus/headings/reduced motion/touch | D | P1 | M | alto | bajo | incremental |
| Performance/CWV + code quality | Cloudflare/CDN + monoliths | measure, optimize/refactor incrementally | D | P1 | M/L | alto | medio | Change Safety + tests/smoke |
| Security hardening | Access/JWT/Turnstile base | rate limit, headers, tests, logs, backups + Cloudflare plan eval | B/D | P1 | L | estratégico | medio | no paid feature without approval |
| Backlinks/authority outreach | fuera del repo | real partnerships/mentions | D externo | P2 | ongoing | alto | bajo | no paid spam links |

## Future Integrations — arquitectura sugerida

### P1 — alto valor cuando llegue su turno

1. **Services/page model future-ready.** Extender CMS actual; no introducir framework paralelo.
2. **Projects / case studies.** Construir primero la fuente de verdad interna del Project; después proyección pública seleccionada.
3. **Rental SEO/catalog.** Reutilizar inventario, pricing backend y configurador actuales; no segundo carrito/pricing.
4. **Rental Admin pricing rules.** Solo después de diseñar schema, migrations, evaluator backend y rollback.
5. **SEO-first CMS.** Metadata por página/idioma, canonical/hreflang, sitemap, OG y schema compatible con contenido visible.
6. **Internal linking model.** Relaciones explícitas entre Services, Products, Projects y Articles.
7. **CRM + attribution.** Forms actuales alimentarán pipeline real cuando source-of-truth esté definido.
8. **Analytics integrity before marketing decisions.** Internal traffic, Key Events and downstream funnel evidence before trusting acquisition/revenue reporting.

### P2 — crecimiento/autoridad después de modelos sólidos

- Journal técnico con pocos artículos excelentes/verificables.
- Technical Audio Training only after real offer definition.
- Dashboard SEO/comercial con GSC/GA4/CRM cuando exista volumen suficiente.
- About/professional profile más profundo.
- Video contextual optimizado con poster/lazy/CDN/performance budget.
- Local SEO adicional solo para servicios y ciudades reales.
- Packages Rental útiles/indexables cuando representen configuraciones comerciales reales.
- Evaluate traffic channels/educational formats by ROI rather than fashion.

### P3 — opcional / condicionado

- Press/mentions page si existe corpus real suficiente.
- Programas de backlinks/partnerships como operación comercial externa, no automatización.
- Chatbot/AI only if free/practically free or with demonstrated ROI; owned FAQ first, no invented price/availability.
- Premium Admin capabilities from `ROADMAP_MASTER_CHECKLIST.md` only when individually promoted.

## Deferred / no autorizado por ahora

- Crear 8–12 servicios, 10–20 productos, 5–10 proyectos o 10 artículos en bloque solo para llenar el sitio.
- Reorganizar de inmediato toda la navegación en Services/Rental/Projects/Journal/About/Contact.
- Construir CRM/Projects/Analytics/SEO dashboards antes de definir source-of-truth y relaciones.
- Borrar fallbacks/originales de GitHub solo porque la media Home ya esté en R2.
- Cambiar framework, lenguaje, base de datos, hosting, CMS, auth o infraestructura por moda tecnológica.
- Hacer un rediseño global mientras el sistema actual funciona.
- Comprar/activar Cloudflare/media/security products sin evidencia de necesidad/ROI y aprobación.

## Not Applicable / no recomendado

- Copiar diseños, copy, imágenes o branding de referencias externas.
- Convertir SD.Live en empresa genérica de producción/rental si diluye Creative Audio + Technical Audio Systems.
- Generar una URL por keyword o cientos de páginas por ciudad.
- Publicar cientos de artículos genéricos producidos por IA.
- Inventar métricas, clientes, proyectos, certificaciones, testimonios o structured data.
- Comprar backlinks de baja calidad.
- Crear segundo sistema de pricing, auth, analytics, CMS o media cuando el actual puede extenderse.

## Prerequisitos antes de cualquier bloque Future Integration

1. Inspeccionar código real y confirmar qué ya existe.
2. Aplicar Change Safety Gate.
3. Identificar consumidores/APIs y mantener backward compatibility por defecto.
4. Definir source-of-truth/owner de datos.
5. Definir datos afectados, migración y rollback para cambios de schema.
6. Preservar contenido, D1, R2, historial y relaciones.
7. Keyword research/intention mapping antes de nuevas URLs SEO.
8. Definir métricas de éxito antes de cambios de conversión.
9. Extender Visual Safeguards/tests si se reconstruye sistema visual aprobado.
10. Validar EN/ES, COL/INT, Desktop/Mobile, accessibility básica, performance y Draft/Published.
11. Validar **Global Select misma sección + otra sección/page + exact item** para todo nuevo CMS.
12. Si una funcionalidad no puede verificarse, marcar **UNKNOWN** en vez de inventar.
13. Revisar `ROADMAP_MASTER_CHECKLIST.md` para requisitos históricos relacionados y evitar pérdida/duplicación.

---

# Decisiones e invariantes — no reabrir sin evidencia

- Marca exacta: **SD.Live**.
- Descriptor: **Creative Audio**.
- Tagline exacta: **Creative Audio. Technical systems. Built for the show.**
- En UI visible, `SD.Live` usa el wordmark con punto flotante cuando aplique; metadata/código/string machine-readable usa texto literal.
- SD.Live no debe parecer agencia genérica de eventos, rental house, CV personal ni sociedad incorporada.
- Referencias externas aportan principios, nunca identidad visual/copys a copiar.
- WLive se mantiene visible.
- Rental es Colombia-first; INT lo oculta por defecto.
- Rental nunca envía a `hello@` ni correo personal: **solo `rental@sdlive.show`**.
- Pricing Rental vive en backend.
- Cloudflare Access es la barrera real del Admin; no usar login visual falso.
- GTM no controla navegación, branding, copy, Theatre ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.
- No guardar secretos ni datos sensibles en GitHub.
- GitHub = source-of-truth de código; D1 = contenido estructurado; R2 = media administrable.
- `media.sdlive.show` es el dominio público canónico para media R2.
- Public Development URL de R2 permanece desactivado salvo necesidad explícita.
- Established aesthetics son contratos: no degradar branding/UX por trabajo CMS. Safeguards + tests deben acompañar reconstrucciones vulnerables.
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.
- **Global Select es un contrato del Editor y parte del smoke de cada nuevo CMS/page.**
- **Mejoras futuras se documentan, pero no se implementan automáticamente.**
- **Estabilidad > novedad.** Si no hay evidencia suficiente para modificar una implementación funcional, conservarla.
- **Migrador retirado ≠ fallback borrado.** Los assets críticos/versionados permanecen hasta una revisión de referencias separada y explícita.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero servido desde D1 con SSR en edge, fallback estático, idioma resuelto antes del first paint y Draft aislado.

## 2026-08-20 — P1.4 tests + CI

Se añadió `node:test` y GitHub Actions.

## 2026-08-20/21 — P2.1 Trusted By + R2

Modelo CMS Trusted/Supported Brands, Draft/Published, reorder, WLive protegido, controles de carrusel, Select, parity, R2, upload autenticado, scale/placement y migración.

## 2026-08-21 — P2.2 Trusted Published → Home

Published Trusted servido desde D1/R2 con SSR/fallback. Confirmado: **Save Draft no cambia producción; Publish sí cambia producción.**

## 2026-08-21 — P2.3 Testimonials + Visual Safeguards

Testimonials gestionable desde Admin con D1/R2/SSR/fallback + sistema Visual Safeguards.

## 2026-08-21 — P2.4 Core Home CMS + automatic failsafe

About/Services/International/Work CMS, smoke fixes y automatic publish verification.

## 2026-08-21 — P2.5 Reusable Media Library

R2 Media Library reusable + About/Work bridges/migradores.

## 2026-08-21 — P2.6 Rental + Contact CMS

Rental/Contact presentation CMS + migration paths; smoke completo correcto después de PR #35 (`market: col`).

## 2026-08-21 — P2.7 Global Select + permanent Change Safety

**CERRADO.** PR #36 merged en `7d54b83b37e6e30f889eff9a41b25a18b268b8a9`. Production smoke pasó same-section Select, cross-section Select, routing de control no-card e Interact. Rental en INT no tiene target por diseño; recuperación INT→COL permanece cubierta por tests. Las políticas de precedencia/evidencia/source-of-truth/change-safety quedaron permanentes.

## 2026-08-21 — Home CMS R2 closeout inventory

**INVENTARIO COMPLETADO.** Saved Draft y producción verificados para About, Selected Work, Testimonials, Rental y Trusted/Supported Brands. Producción resuelve media administrable vía `media.sdlive.show`. Selected Work tenía un Draft guardado pendiente, se comparó visualmente con live, se publicó y Failsafe quedó verde. Esto habilitó retirar los migradores temporales, pero **no** borrar fallbacks GitHub.

## 2026-08-21 — P2.8 Home CMS closeout cleanup

**CERRADO.** PR #37 squash-merged en `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`. Se retiraron únicamente los cuatro migradores temporales y tests migration-only. CI final verde. Production smoke confirmó: no panel `R2 migration`; Media Library/Upload/Replace intactos; Global Select e Interact normales; Safeguards 9/9; About público sigue resolviendo media por `media.sdlive.show`. Fallbacks GitHub/static permanecen.

---

# Siguiente decisión después de P2.8

**No hay un F — Active Gate abierto automáticamente.** Antes de cualquier nueva implementación:

1. revisar `ROADMAP_MASTER_CHECKLIST.md` completo;
2. escoger el siguiente trabajo por valor, riesgo y dependencias;
3. comprobar qué ya existe con evidencia y aplicar Change Safety Gate;
4. promover **solo** ese trabajo a F — Active Gate;
5. registrar el alcance en README + roadmap antes de implementar;
6. no mezclar el próximo gate con cleanup adicional no autorizado.

**Sound for Picture permanece inert staging hasta contenido/scope real aprobado.**
