# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo se demuestra, qué está aprobado, qué falta y qué solo pertenece a visión futura. Se actualiza al cerrar milestones o ante cambios materiales de arquitectura/alcance, no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-21 |
| Producción / base verificada | `main` @ `c0a7cf5eae070d9acbb1b5401f6fd18f4dbee7be` |
| Trabajo activo | `feat/p2-7-global-select-safety-policy` |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar y cerrar el Home Editor/CMS incrementalmente |
| Estado demostrado | **P2.6 Rental + Contact CMS cerrado y smokeado en producción; PR #35 corrigió market key D1** |
| Active Gate | **P2.7 — Global Select + política permanente de Change Safety / evidencia** |
| Gate posterior | **Home CMS closeout inventory antes de autorizar el siguiente bloque** |

---

# 0. REGLA DE PRECEDENCIA — autoridad del proyecto

En caso de conflicto, prevalece este orden:

1. **Código actual + comportamiento verificable en producción.**
2. **Schema, migrations y configuración desplegada actual.**
3. **Este documento (`PROJECT_STATUS.md`).**
4. **`README.md`.**
5. Prompts, ideas, benchmarks, conversaciones y referencias externas.

Un prompt nunca invalida silenciosamente una funcionalidad existente, una invariante o una fuente de verdad. Si una instrucción futura contradice lo demostrado, el agente debe **señalar el conflicto, investigar y pedir/obtener una decisión explícita** antes de reemplazar arquitectura o comportamiento.

## Separación obligatoria de conceptos

- **CURRENT STATE / ESTADO** = lo que puede demostrarse en repo, schema/config o producción.
- **ROADMAP / ACTIVE GATES** = trabajo aprobado y priorizado.
- **BACKLOG** = trabajo deseado documentado, todavía no necesariamente activo.
- **FUTURE INTEGRATION** = posibilidad documentada y compatible; **no autorizada** por existir aquí.
- **VISION** = dirección estratégica; no es compromiso ni orden de implementación.

Ningún agente debe convertir `FUTURE INTEGRATION` o `VISION` en un Active Gate sin repriorización explícita.

## Clasificación A–F

- **A — Ya existe:** conservar; no duplicar.
- **B — Existe parcialmente:** extender incrementalmente.
- **C — Existe con otra implementación:** conservar salvo ventaja clara y comprobada.
- **D — Future Integration:** valioso/compatible, pero no implementar ahora.
- **E — No recomendado / no aplicable:** no construir salvo cambio explícito de contexto.
- **F — Active Gate / Approved Work:** trabajo autorizado y actualmente priorizado.
- **Externo:** Cloudflare, Google, Workspace u otro servicio fuera del repositorio.

### Regla de evidencia

Toda afirmación de estado **A/B/C/F** debe poder responder: **¿cuál es la evidencia?** Puede ser código concreto, schema/config, endpoint, test, commit/PR y/o smoke de producción. Si no hay evidencia suficiente, marcar **UNKNOWN** o investigar; no inventar.

---

# 1. CONSTITUCIÓN DEL PROYECTO — invariantes arriba de todo

Estas reglas tienen precedencia práctica sobre novedad, benchmarks y prompts amplios:

- **Estabilidad > novedad.**
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics/media si la base actual puede extenderse.
- No crear sistemas paralelos de pricing, CMS, auth, analytics o media cuando el actual puede extenderse.
- Established production aesthetics son contratos; si un cambio CMS vuelve vulnerable una estética aprobada, extender **Visual Safeguards + tests** en el mismo PR.
- `Save Draft` nunca cambia producción; `Publish` es la única acción de contenido que puede promover Draft → Published.
- Public content CMS usa **Published**, nunca Draft.
- Global Select es contrato del Editor: debe llevar desde el visual al dueño CMS y al item correcto, incluso si otra sección está activa.
- Rental pricing/quote logic vive en backend y no puede convertirse en copy editable.
- Rental notifica **solo a `rental@sdlive.show`**; Contact general a `hello@sdlive.show`.
- WLive permanece visible.
- Marca exacta: **SD.Live**; descriptor **Creative Audio**; tagline **Creative Audio. Technical systems. Built for the show.**
- En UI visible, `SD.Live` usa el wordmark/punto flotante cuando aplique; machine strings/metadata siguen literales.
- Cloudflare Access es la barrera real del Admin; no sustituir por login visual falso.
- GTM no controla navegación, branding, copy ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.
- No guardar secretos ni datos sensibles en GitHub.

---

# 2. SOURCE OF TRUTH — propiedad de datos y sistemas

| Área | Owner / Source of Truth | Evidencia actual |
|---|---|---|
| Código, CSS/JS, branding crítico, fallbacks | GitHub `main` | repo + deploy desde `main` |
| CMS Draft/Published estructurado | D1 `sdlive-cms-production` | APIs CMS + tablas `cms_entries` / revisions |
| Contenido público CMS | `published_json` validado | edge renderers + smoke Draft/Publish |
| Media binaria editable | R2 `sdlive-media-production` | upload API + `media.sdlive.show` |
| Metadata/referencias media | D1 | modelos CMS / logical refs |
| Rental pricing / quote math | Backend | `RENTAL_PRICING` + cálculo backend; CMS presentation no lo posee |
| Acceso Admin | Cloudflare Access | JWT server-side + `/admin/` protegido |
| Contact/Rental leads | D1 + email workflow actual | forms + Worker + Resend |
| Analytics público | GA4/GTM con consentimiento | Realtime validado |
| Future CRM | **TBD** | Admin module aún Planned/Soon |
| Future Lead → Quote → Project → Invoice | **TBD antes de implementar** | no existe source-of-truth único todavía |
| AppSheet futuro | **No decidir todavía** | integración pendiente; no puede convertirse en segundo source-of-truth por accidente |

Cuando un futuro sistema toque datos compartidos, debe definir explícitamente **quién escribe, quién lee y quién manda** antes de crear tablas/integraciones.

---

# 3. EVIDENCE MATRIX — estado de alto riesgo

| Feature / sistema | Estado | Clasificación | Evidence |
|---|---|---|---|
| Hero CMS | Producción | A | D1 + `worker-entry.js` + APIs + smoke Draft/Publish |
| Trusted By / Supported Brands | Producción | A | D1/R2 + `trusted-*` + production smoke + WLive preservation |
| Testimonials | Producción | A | D1/R2 + `testimonials-*` + production smoke |
| About / Services / International / Work CMS | Implementado/producción | A | `core-sections-*` + PR #27/#28 + SSR/tests |
| Visual Safeguards | Producción | A | guard CSS/JS + Editor panel + tests + automatic checks |
| Automatic publish failsafe | Producción | A | `automatic-failsafe.js` + PR #31/#32 |
| Reusable Media Library | Implementado | A | `media-library.js` + media API + PR #33 |
| Rental presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34/#35 + Draft/Publish smoke |
| Contact presentation CMS | Producción smoke OK | A | `home-presentation-*` + PR #34 + Draft/Publish/Turnstile smoke |
| Rental cart/pricing | Producción | A | `script.js` + backend pricing + production cart smoke |
| Global Select cross-section | Active Gate | F | existing `editor-resilience.js` being extended + regression tests |
| Sound for Picture CMS | No implementado | D/UNKNOWN scope | hidden staging placeholder only |
| Projects | No implementado | D | Admin module disabled/planned |
| CRM pipeline | No implementado | D | leads/forms exist; pipeline UI/model absent |
| Rental Admin full catalog/pricing editor | No implementado | D | public Rental exists; Admin module planned |
| Analytics dashboard | No implementado | D | GA4 exists; dashboard module planned |

---

# 4. CHANGE SAFETY GATE — obligatorio antes de cambios importantes

Antes de modificar una funcionalidad existente, responder:

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

Para CMS/editor, además validar en smoke cuando aplique:

- EN/ES;
- COL/INT;
- Desktop/Mobile;
- `Save Draft ≠ live`;
- `Publish = live` + Failsafe;
- **Select desde la misma sección y desde otra sección/página**;
- exact item routing para collections/cards;
- estética protegida/Safeguards;
- fallback/static behavior.

---

# 5. Política de mejoras futuras

Cuando durante una conversación se defina una **mejora futura** para SD.Live:

1. registrarla en **este roadmap y README** antes de cerrar el checkpoint documental actual;
2. clasificarla A–F y separar claramente si es Backlog, Future Integration o Active Gate;
3. registrar dependencias/source-of-truth cuando aplique;
4. **no implementarla automáticamente** salvo priorización explícita.

Puede agruparse con el PR/milestone activo para evitar deploys documentales innecesarios, pero **no debe perderse**.

---

# 6. Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar `HEAD` de `main` y compararlo con el commit de producción/base verificado arriba.
3. Si cambió, revisar solo los diffs posteriores y actualizar los estados/evidencias afectados.
4. Aplicar la **Regla de Precedencia** y el **Change Safety Gate** antes de tocar arquitectura existente.
5. No rehacer trabajo A/[x] salvo evidencia de regresión.
6. Continuar por el primer **F — Active Gate** abierto.
7. Future Integration/Vision no autorizan implementación por sí mismas.
8. Al cerrar un milestone material, actualizar README + este archivo con evidencia real de producción.

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
- [x] Cookie de idioma disponible al Worker; fallback `Accept-Language` → EN.
- [x] Sin flash de copy ni vacío de hydration.
- [x] Wordmark visual SD.Live correcto antes del line-wrap.
- [x] `node:test` + GitHub Actions CI.
- [x] Tests de schema, D1, fallback, idioma, SSR y aislamiento Admin.

Archivos clave: `worker-entry.js`, `worker.js`, `hero-content.js`, `cms-hydration.js`, `home-navigation.js`.

PRs principales: #1–#4.

---

# P2 — Home Editor/CMS incremental

## P2.1 — Trusted By / Brands Supported Through

**Estado: CERRADO.**

- [x] Modelo CMS propio; Draft/Published en D1.
- [x] API pública + Editor de clientes/nombres/roles/logos/orden/reveals.
- [x] Agregar/eliminar/reordenar clientes; WLive protegido contra borrado.
- [x] Flechas rápidas, Pause/Play y swipe táctil.
- [x] Supported Brand placement Auto/Left/Center/Right.
- [x] Select exacto a cliente/reveal/item.
- [x] Preview Desktop/parity estabilizado.
- [x] Carrusel conserva fase y hover estable.

### Polish pendiente no bloqueante

- [ ] Corregir pequeño offset de navegación izquierda al saltar a **Trusted By**.

## P2.1.2 — Media/R2 Trusted

**Estado: CERRADO.**

- [x] Bucket R2 `sdlive-media-production`, Standard, custom domain `media.sdlive.show`.
- [x] `r2.dev` desactivado; binding `MEDIA_BUCKET`.
- [x] Upload autenticado PNG/JPEG/WebP máx. 5 MB.
- [x] Keys versionadas + cache immutable.
- [x] Upload/Replace + scale/placement en D1.
- [x] Migración legacy Trusted/Supported Brands ejecutada y validada.
- [x] GitHub conserva fallbacks/originales hasta cleanup deliberado.

## P2.2 — Published Trusted By → Home

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN.**

- [x] Published-only edge SSR con schema validation + static fallback.
- [x] R2 logical refs resueltos a `media.sdlive.show`.
- [x] EN/ES, WLive, wrappers/layout, scale/placement correctos.
- [x] Cambio idioma no rompe carrusel/Supported Brands.
- [x] `Save Draft ≠ live`; `Publish = live` validado.

PRs principales: #12–#23.

## P2.3 — Testimonials CMS + Visual Safeguards

**Estado: CERRADO y VALIDADO EN PRODUCCIÓN el 2026-08-21.**

- [x] D1 Draft/Published/revisions + API/Admin.
- [x] EN/ES heading/persona/role/quote.
- [x] Add/delete/reorder/visibility/featured.
- [x] Upload/Replace/Remove logo R2 + scale.
- [x] Published-only edge SSR + fallback + Admin isolation.
- [x] Smoke Desktop/Mobile, EN/ES, Draft/Publish.
- [x] Select exacto por testimonial.
- [x] Visual Safeguards + Editor diagnostics/Restore defaults.
- [x] Guard: glass, auroras, reveal, card sheen, carousel, Supported reveal, CTA hover.
- [x] Sheen compositor-stable y pacing/clipping aprobado.

PRs principales: #24–#25.

## P2.4 — About / Services / International / Selected Work CMS + automatic failsafe

**Estado: CERRADO en código; base de producción operativa.**

- [x] Modelos CMS para About/Services/Work/International.
- [x] Draft/Published/revisions y APIs compartidas.
- [x] Published edge SSR + static fallback.
- [x] Editores visuales y navegación International.
- [x] Seguridad de links internos CMS.
- [x] About media R2 habilitado.
- [x] Fixes de smoke para Select core y Safeguards.
- [x] Automatic publish failsafe agregado.
- [x] Publish progress visible + corrección de false failsafe failure.

PRs principales: #27–#32.

## P2.5 — Reusable Media Library + migradores de secciones

**Estado: CERRADO en implementación.**

- [x] API reusable de R2 Media Library.
- [x] Panel reusable del Editor.
- [x] About/Work integrados a Media Library.
- [x] Migradores temporales About/Work disponibles.
- [x] Observers de migración protegidos contra loops.
- [x] Regla: todo CMS con media editable debe tener camino de migración legacy→R2 mientras dure la transición.

PR principal: #33.

## P2.6 — Rental + Contact CMS + R2 migration

**Estado: CERRADO y SMOKEADO EN PRODUCCIÓN el 2026-08-21.**

- [x] Rental presentation CMS: headings, presets visibles, group labels, equipment title/description/technical note/image.
- [x] Rental **no** puede editar pricing, stock/availability, preset composition, quote math ni transactional IDs.
- [x] Contact CMS: copy visible + labels; email/Turnstile/send logic fuera del CMS.
- [x] Targeted edge patching preserva Rental DOM transaccional y Contact form.
- [x] Rental media Upload/Replace/Media Library + legacy migrator.
- [x] Testimonials legacy-logo migrator añadido.
- [x] Sound for Picture permanece staging/placeholder oculto.
- [x] Producción: Rental `Save Draft` no cambió live; `Publish` sí cambió live y Failsafe quedó verde.
- [x] Producción: migración Rental + Testimonials mostró Draft-only/Published unchanged; el reset visual del Editor tras migrate se acepta como limitación temporal del migrador.
- [x] Producción: carrito Rental cantidades/totales/formulario operativos.
- [x] Producción: Contact `Save Draft ≠ live`, Publish correcto, form + Turnstile visibles.
- [x] Bug encontrado en primer smoke: `market: "colombia"` violaba CHECK D1 `all|col|int`; PR #35 corrigió a `col` y añadió regresión.

PRs: #34, #35.

## P2.7 — Global Select + permanent Change Safety policy

**Estado: F — ACTIVE GATE / APPROVED WORK.**

Objetivo: convertir Select y la seguridad de cambio en contratos globales del Editor/repositorio, no en parches por sección.

- [x] Requisito aprobado: Select debe saltar al dueño CMS incluso si otra sección está activa.
- [x] Requisito aprobado: debe localizar el item/card exacto cuando sea identificable.
- [x] Requisito aprobado: nuevo CMS/page siempre smokea Select desde dentro y desde otra sección/page.
- [~] Extender `editor-resilience.js` existente para routing global; **no crear sistema paralelo**.
- [~] Routing actual contemplado: Hero, Trusted, About, Services, International, Work, Testimonials, Rental, Contact.
- [~] Rental Select debe recuperar contexto INT→COL si Rental está deshabilitado por mercado.
- [~] Tests de regresión global Select.
- [~] README/roadmap: autoridad, evidencia, F Active Gate, Source of Truth, Change Safety, benchmarks y reglas SEO/IA.
- [ ] Production smoke después de merge: Select exacto desde misma y otra sección; Rental desde INT; no romper Interact mode.

**Después de P2.7:** ejecutar Home CMS closeout inventory antes de elegir siguiente feature. Verificar referencias R2/fallbacks antes de retirar migradores temporales.

---

# Backlog maestro por área

## Admin / CMS / Editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Hero CMS + Published SSR.
- [x] Trusted CMS + R2 + SSR.
- [x] Testimonials CMS + R2 + SSR.
- [x] About/Services/International/Work CMS.
- [x] Rental/Contact presentation CMS.
- [x] Visual Safeguards + diagnostics/restore.
- [x] Automatic publish failsafe + publish progress.
- [x] Reusable Media Library sobre R2.
- [~] **Global Select cross-section/page-aware contract — P2.7 activo.**
- [ ] Cleanup de migradores temporales solo tras verificar todas las refs R2/fallbacks de producción.
- [ ] Reorder genérico de otras cards/bloques donde aún no exista.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita.
- [ ] Revisar/retirar `admin/admin.js` / `admin/admin.css` si se confirma duplicación frente a `admin/editor/*`.
- [ ] Fix menor: alineación del salto `Trusted By` en navegación izquierda.

## Header, navegación y controles flotantes

- [ ] **WhatsApp en todas las landings públicas.** Reutilizar botón Home en Theatre, `/en/`, `/es-co/`, servicios Bogotá, Rental y demás páginas; mismo destino/tracking/safe-area/responsive.
- [ ] Reordenar/espaciar elementos del header desde Admin.
- [ ] Show/hide CTAs, Show Day, WhatsApp y controles por página/mercado/dispositivo.
- [ ] Configurar anchors y scroll offset.
- [ ] Agregar/quitar items del menú.
- [ ] Posición independiente Mobile de WhatsApp, cart y Back to Top.

## Contenido público

- [x] Hero/Trusted/About/Services/International/Work/Testimonials/Rental/Contact con cobertura CMS correspondiente.
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Portfolio/Selected Work ya tiene CMS base; modelo de case-study/credits/tags profundos sigue futuro.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Show Day: manual existe; falta integración con calendario.
- [ ] Portfolio/CV privado no indexado con variantes profesionales.
- [ ] Recuperar Insights/Journal cuando exista contenido real.
- [ ] Evaluar Technical Audio Training como servicio antes de publicarlo.
- [ ] Sound for Picture: no promover placeholder; requiere contenido real y aprobación de scope.

## Contacto / Rental

- [x] Contact → `hello@sdlive.show`.
- [x] Rental → **`rental@sdlive.show` exclusivamente**.
- [x] Turnstile + consentimiento + D1.
- [x] Pricing y bundles server-side.
- [x] Rental oculto en INT salvo intención directa/contexto permitido.
- [x] Rental/Contact presentation CMS Draft/Published.
- [x] Rental cart smoke después de P2.6.
- [ ] **Compatibilidad guiada para cliente no técnico:** si añade **Behringer WING**, recomendar **Midas DL32** como stagebox apropiado; si añade **LV1 Classic**, recomendar **StageGrid 4000**. Definir visual/UX con aprobación antes de implementar. No autoagregar silenciosamente.
- [ ] **Rental Admin — alta de nuevos items + pricing rules validadas:** soportar precio fijo, precio por día, reglas multi-day, cantidades, pair/bundle con otro equipo y pricing condicional. El Admin edita una estructura validada; **backend sigue siendo source-of-truth del cálculo**.
- [ ] Card Equipment Rental debe llevar a `#rental` cuando corresponda.
- [ ] Hacer inequívoco que el carrito es solicitud de cotización, no checkout.
- [ ] Resolver empty state, service-only total 0 y reset incompleto.
- [ ] Afinar delivery/logística.
- [ ] PDF de quote, vigencia, disponibilidad y aprobación.
- [ ] Inventario/calendario y prevención de double booking.

## CRM / Projects / Calendar

**Estado real:** dashboard muestra Leads/CRM, Rental Admin, Projects y Calendar como módulos **Planned/Soon**. Forms/datos públicos no equivalen a esos módulos.

- [ ] Pipeline Lead: New → Contacted → Quoted → Confirmed → Lost.
- [ ] Clientes, empresas, notas, historial y source.
- [ ] Relación Lead → Quote → Project → Invoice.
- [ ] Definir source-of-truth antes de integrar AppSheet.
- [ ] Projects con cliente, show, rol, fechas, venue, contactos, archivos y Rental/Quote/Calendar.
- [ ] Calendar Admin integrando eventos relevantes.
- [ ] Show Day automático desde calendario con override manual.

## Inbox / Workspace

- [x] Operación de correo vía Gmail/Workspace.
- [ ] Inbox nativo en Admin por categorías.
- [ ] Responder desde alias correcto.
- [ ] Email → Lead / Rental / Project.
- [ ] Verificar aliases operativos antes de automatizar (`hello@`, `info@`, `rental@`, `projects@`, `billing@`, `facturas@`).
- [ ] Revisar DMARC cuando Workspace esté estable.

## Analytics / SEO / growth

- [x] GTM + Consent Mode + GA4 base.
- [x] `generate_lead`, email y WhatsApp validados.
- [x] SEO técnico P0 base: canonical, hreflang, JSON-LD, OG, robots, sitemap, redirects.
- [ ] Separar tráfico interno/testing.
- [ ] Revisar Key Events vs microconversiones.
- [ ] Funnel sesión → source → lead → qualified → closed.
- [ ] Monitorizar indexación, queries, impressions, CTR, países, entradas y Core Web Vitals.
- [ ] Medir landings antes de crear más SEO pages.
- [ ] Dashboard SEO/comercial cuando haya volumen y source-of-truth suficiente.
- [ ] Estrategia de adquisición basada en conversiones/revenue.

### Regla SEO/IA permanente

Secuencia correcta:

**oferta real → página útil → SEO**

Nunca:

**keyword → página artificial → contenido generado**.

Antes de crear una URL SEO, determinar:

- qué servicio real representa;
- quién/cómo se presta;
- mercado real;
- capacidad operativa;
- evidencia/portfolio disponible;
- CTA;
- intención de búsqueda;
- si otra URL ya cubre esa intención.

Si no existe una oferta real detrás: **NO CREARLA**.

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2, consentimiento y validation forman base actual.
- [x] Tests + CI base.
- [x] Visual regression contracts + Safeguards.
- [x] Automatic publish verification base.
- [ ] Rate limiting explícito/verificable.
- [ ] CSP, Referrer-Policy, Permissions-Policy sin romper GTM/Turnstile/media.
- [ ] Migraciones/versionado de schema D1.
- [ ] Observabilidad Worker/D1/R2, publish/deploy y errores.
- [ ] Alertar antes de límites relevantes R2/Workers.
- [ ] Backups/export + rollback operacional.
- [ ] Limpieza segura de objetos R2 huérfanos.
- [ ] Refactor monolitos solo con tests verdes y razón concreta.
- [ ] Retirar `deploy-test.txt` si se confirma que ya no sirve.

---

# Competitive / Benchmark References

**Regla:** inspiración/aprendizaje únicamente. No son requisitos funcionales ni visuales; no copiar diseño, copy, imágenes ni branding. Cuando un cambio de diseño/estructura se apoye materialmente en estas referencias, **consultar las páginas vigentes primero y confirmar antes de adoptar el patrón**.

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

**Estado de esta sección: FUTURE INTEGRATION / VISION, salvo fila marcada F. No implementación automática.**

La dirección estratégica es conectar descubrimiento → confianza → cotización/rental → lead → proyecto, aprovechando arquitectura existente. No autoriza reconstrucción ni copia de benchmarks.

## Gap analysis con evidencia

| Funcionalidad | Estado actual | Propuesta futura | Clasificación | Priority | Effort | Impact | Risk | Evidence / dependencias |
|---|---|---|---|---|---|---|---|---|
| Global Select | Select existe por capas; cross-section incompleto | routing global owner→item + future page contract | **F** | P0 | M | alto | bajo/medio | `editor-resilience.js`, section editors; P2.7 activo |
| Services CMS | implementado en P2.4 | profundizar modelo solo cuando haya necesidad real | A/B | P1 | M | alto | medio | `core-sections-*`, PR #27 |
| Arquitectura páginas de servicio | landings puntuales | páginas profundas por servicio/intención real | D | P1 | L | alto | medio | Services model + keyword research + IA aprobada |
| SEO CMS fields | metadata mayormente code/static | title/description/canonical/OG/noindex/sitemap/schema config | D | P1 | M | alto | medio | definir page model sin duplicar metadata |
| Rental SEO | Rental público + landings | categorías/product pages conectadas al mismo configurador | D | P1 | L | alto | medio | Rental model estable + canonical strategy |
| Rental compatibility guidance | no recomendaciones automáticas | WING→DL32; LV1→StageGrid guidance | D | P2 | M | medio/alto | bajo | UX por aprobar; backend/cart actual se conserva |
| Rental Admin pricing model | pricing backend fijo/code-owned | Admin validated rules para nuevos items | D | P1 | L/XL | alto | alto | source-of-truth backend; migration/schema design required |
| Rental packages indexables | bundles backend existen | páginas útiles de configuraciones reales | D | P2 | M | medio/alto | bajo | no crear packages artificiales |
| Projects / case studies | Admin planned; portfolio parcial | Project model + proyección pública seleccionada | D | P1 | XL | estratégico | medio | source-of-truth + Media Library + privacy |
| Portfolio CMS profundo | Work CMS base existe | credits/tags/featured/case-study model | B/D | P1 | L | alto | medio | core Work model + Media Library |
| Media Library | reusable library implementada | reference safety/soft-delete/cleanup más profundo | A/B | P1 | M | alto | medio | R2 + D1 refs; PR #33 |
| Journal / Articles CMS | no sistema real | artículos técnicos basados en experiencia real | D | P2 | L | alto | bajo/medio | Article model + SEO + Media Library |
| Internal linking | links manuales | Services ↔ Products ↔ Projects ↔ Articles | D | P1 | M | alto | bajo | requiere modelos reales; evitar huérfanas |
| Structured data avanzado | JSON-LD base | Service/Product/Article/Breadcrumb donde corresponda | B/D | P1 | M | alto | medio | visible content real + guías vigentes |
| Multidioma SEO | EN/ES + hreflang base | equivalencia por nuevo contenido | B/D | P1 | M | alto | medio | no mezclar idiomas/URLs |
| Local SEO | Bogotá/Colombia landings | ampliar solo servicios/ciudades reales | D | P2 | M | medio/alto | bajo | no doorway pages |
| CRM pipeline | forms/D1, module planned | New→Contacted→Quoted→Confirmed/Lost | D | P1 | XL | estratégico | alto | source-of-truth TBD |
| Lead attribution | GA4/forms base | landing/UTM/service/revenue attribution | D | P1 | L | estratégico | medio | CRM identifiers + privacy |
| Analytics dashboard | GA4 existe; module planned | GSC/GA4/CRM dashboard | D | P2 | L | alto | bajo/medio | esperar volumen + APIs |
| Conversion/forms | Contact/Rental funcionan | reducir fricción/contextual CTA | B/D | P1 | M | alto | medio | medir before/after; preservar routing email |
| About authority | About CMS existe | perfil más profundo con datos/proyectos reales | B/D | P2 | M | medio/alto | bajo | material verificable |
| Video/motion | identidad audiovisual base | video contextual optimizado | D | P2 | L | alto | medio | CDN/performance budget |
| Press/mentions | no módulo | `/press` si hay corpus verificable | D | P3 | M | medio | bajo | no fabricar autoridad |
| Accessibility audit | base variable | contraste/keyboard/focus/headings/reduced motion/touch | D quality | P1 | M | alto | bajo | incremental |
| Performance/CWV | Cloudflare/CDN base | responsive media/cache/fonts/video/JS discipline | D quality | P1 | M/L | alto | medio | medir antes |
| Security hardening | base Access/JWT/Turnstile | rate limit/headers/logs/backups/migrations | B/D | P1 | L | estratégico | medio | no romper GTM/Turnstile/media |
| Backlinks/authority outreach | fuera repo | menciones legítimas partners/venues/media | D externo | P2 | ongoing | alto | bajo | relaciones reales, no spam |

## Future Integrations — arquitectura sugerida

### P1 — alto valor cuando llegue su turno

1. **Page/SEO model future-ready.** Extender CMS actual; no framework paralelo.
2. **Projects/case studies.** Definir primero source-of-truth interno, luego proyección pública selectiva.
3. **Rental SEO/catalog.** Reusar inventario/pricing/configurador actuales; nunca segundo carrito/pricing.
4. **Rental Admin pricing rules.** Solo tras diseñar schema, migrations, backend evaluator y rollback.
5. **SEO-first CMS.** Metadata por página/idioma coherente con contenido visible.
6. **Internal linking model.** Relaciones explícitas entre modelos reales.
7. **CRM + attribution.** Definir fuente de verdad antes de conectar AppSheet/Workspace/GA4.

### P2 — crecimiento/autoridad

- Journal técnico con pocos artículos excelentes/verificables.
- Dashboard SEO/comercial cuando haya volumen.
- About/professional profile más profundo.
- Video contextual optimizado.
- Local SEO solo para oferta real.
- Packages Rental útiles/indexables cuando sean configuraciones comerciales reales.

### P3 — opcional / condicionado

- Press/mentions si existe corpus real.
- Backlinks/partnerships como operación comercial externa, no automatización.

---

# Deferred / no autorizado por ahora

- Crear 8–12 servicios, 10–20 productos, 5–10 proyectos o 10 artículos en bloque solo para llenar el sitio.
- Reorganizar de inmediato toda la navegación sin que existan las nuevas secciones.
- Construir CRM/Projects/Analytics/SEO dashboards antes de source-of-truth y relaciones.
- Migrar/borrar todo media de GitHub a R2 de una sola vez sin verificación.
- Cambiar framework, lenguaje, DB, hosting, CMS o auth por moda tecnológica.
- Rediseño global mientras el sistema actual funciona.
- Copiar diseños/copy/imágenes/branding de benchmarks.
- Generar URL por keyword o cientos de páginas por ciudad.
- Publicar cientos de artículos genéricos IA.
- Inventar métricas, clientes, proyectos, certificaciones, testimonios o structured data.
- Comprar backlinks de baja calidad.

---

# Prerequisitos antes de cualquier Future Integration

1. Inspeccionar código real y confirmar qué ya existe.
2. Aplicar Change Safety Gate.
3. Identificar consumidores/APIs y backward compatibility.
4. Definir source-of-truth y ownership.
5. Definir datos/schema/migration/rollback.
6. Preservar contenido, D1, R2, historial y relaciones.
7. Keyword research/intention mapping antes de nuevas URLs SEO.
8. Definir métricas de éxito antes de cambios de conversión.
9. Extender Visual Safeguards/tests si se reconstruye sistema visual aprobado.
10. Validar EN/ES, COL/INT, Desktop/Mobile, accessibility básica, performance y Draft/Published.
11. Validar **Global Select misma sección + otra sección/page + exact item** para todo nuevo CMS.
12. Si algo no puede verificarse, marcar UNKNOWN en vez de inventar.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirects, wordmark, WLive, smoke público, GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero desde D1 con SSR edge, fallback, idioma first-paint y Draft aislado.

## 2026-08-20 — P1.4 tests + CI

`node:test` + GitHub Actions.

## 2026-08-20/21 — P2.1 Trusted By + R2

CMS Trusted/Supported Brands, R2, scale/placement, migración y Select.

## 2026-08-21 — P2.2 Trusted Published → Home

Published D1/R2 SSR/fallback; Save Draft/Publish validado.

## 2026-08-21 — P2.3 Testimonials + Visual Safeguards

Testimonials end-to-end + guard de estética estable.

## 2026-08-21 — P2.4 Core Home CMS + automatic failsafe

About/Services/International/Work CMS, fixes smoke y automatic publish verification.

## 2026-08-21 — P2.5 Media Library

Reusable R2 Media Library + About/Work bridges/migradores.

## 2026-08-21 — P2.6 Rental + Contact CMS

Rental/Contact presentation CMS, R2 migration paths y transactional preservation. Smoke completo correcto después de corregir `market: col` en PR #35.

## 2026-08-21 — P2.7 Global Select + permanent Change Safety

**ACTIVE hasta merge + production smoke.** Convierte routing Select y jerarquía/evidencia/source-of-truth en políticas permanentes del repo.

---

# Siguiente decisión después de P2.7

No asumir automáticamente el siguiente feature. Ejecutar **Home CMS closeout inventory**:

1. qué secciones Home tienen CMS real;
2. qué media sigue legacy vs R2;
3. qué migradores ya cumplieron su función;
4. qué fallbacks siguen siendo críticos;
5. qué contenido real queda fuera del CMS;
6. qué bugs/polish son regresión vs backlog;
7. qué siguiente gate ofrece más valor sin abrir arquitectura paralela.

**Sound for Picture permanece inert staging hasta contenido/scope real aprobado.**