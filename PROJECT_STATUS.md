# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Debe actualizarse al cerrar un milestone o ante un cambio material de alcance; no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-20 |
| Rama verificada | `main` |
| Commit verificado | `1fefb0868790c0f0f51c2861f40397f60261bad3` |
| Producción | `https://sdlive.show` |
| Media pública | `https://media.sdlive.show` |
| Milestone actual | P2 — ampliar el Editor/CMS de forma incremental |
| Estado del milestone | **ABIERTO — Trusted By editable; base R2 creada; binding público aún no terminado** |
| Siguiente gate | **P2.1.2 — Upload/Replace + resize visual de logos en Trusted By y migración controlada de Trusted By/Supported Brands a R2** |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit verificado arriba.
3. Si cambió, revisar únicamente los diffs posteriores y actualizar los estados afectados.
4. No rehacer trabajo marcado `[x]` salvo que exista evidencia de regresión.
5. Continuar por el primer gate abierto del milestone actual.
6. Al cerrar un milestone o gate material, actualizar este archivo y `README.md` si cambió arquitectura u operación.

### Leyenda

- `[x]` Implementado y validado.
- `[~]` Parcial; existe base útil pero falta validación o alcance.
- `[ ]` Pendiente.
- **Externo**: Cloudflare, Google, Workspace u otro servicio fuera del repositorio.
- **Futuro/opcional**: idea preservada; no autoriza construirla antes de priorizarla.

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

# P1 — conectar el CMS con producción

**Estado: CERRADO.**

## P1.1 — Published Hero → Home

- [x] Admin mantiene Draft, Published y revisiones del Hero en D1.
- [x] Endpoint público `GET /api/content/hero` disponible.
- [x] Home conectado al contenido Published.
- [x] Fallback estático deliberado.
- [x] Draft del Admin no contamina producción.
- [x] EN/ES desde la misma estructura de contenido.

### Implementación

1. Primera integración client-side del Hero.
2. Se detectó flash HTML estático → CMS.
3. Se añadió hydration para eliminar el swap visible.
4. Se detectó un vacío breve durante fetch.
5. Solución final: Published Hero se renderiza en Cloudflare edge antes del primer paint.

Archivos clave:

- `worker-entry.js`: sirve `/`, lee Published de D1 e inyecta Hero con `HTMLRewriter`.
- `worker.js`: APIs base de CMS, Contact y Rental.
- `hero-content.js`: resiliencia client-side y aislamiento del Admin preview.
- `cms-hydration.js`: utility de hydration/fallback.
- `home-navigation.js`: navegación Home y carga de bindings.

PRs principales:

- #1 — P1.1 Connect published Hero CMS binding.
- #2 — P1.1.1 Stabilize Hero CMS hydration.
- #3 — P1.1.2 Server-render Published Hero at the edge.
- #4 — P1.1.3 Stabilize first-paint language and Hero lede.

## P1.2 — SEO, resiliencia y first paint

- [x] HTML inicial contiene Published Hero antes de llegar al navegador.
- [x] Si D1 falla, el Worker entrega Hero estático.
- [x] Root usa `Cache-Control: no-store` porque contiene contenido CMS vivo.
- [x] CSS/JS/assets siguen estáticos.
- [x] Sin flash de copy ni vacío de hydration.
- [x] Cookie de idioma disponible al Worker antes del first paint.
- [x] `localStorage` se migra/sincroniza a cookie.
- [x] Sin preferencia guardada, se usa `Accept-Language`.
- [x] Wordmark visual `SD.Live` del lede se renderiza antes del line-wrap.
- [x] Validación manual final EN/ES limpia.

## P1.3 — Preview / Draft / Published coherentes

- [x] Draft puede diferir de Published sin cambiar Home.
- [x] Publish actualiza producción.
- [x] EN y ES se mantienen separados correctamente.
- [x] Admin iframe aislado de Published SSR.
- [x] Hero visible y editable en Admin.

## P1.4 — tests mínimos + CI

**Estado: COMPLETADO.**

- [x] Runner ligero con `node:test`.
- [x] Tests de schema/Published Hero.
- [x] Tests de fallback y D1 inválido.
- [x] Tests de idioma cookie → `Accept-Language` → default.
- [x] Tests de SSR y fast path del cliente.
- [x] Tests de aislamiento Admin.
- [x] CI GitHub Actions en PRs/main.
- [x] Tests extendidos a Trusted By/editor durante P2.

**Resultado:** P1 quedó cerrado antes de ampliar el CMS.

---

# P2 — ampliar el Editor/CMS de forma incremental

## P2.1 — Trusted By / Brands Supported Through

**Estado: EN PROGRESO.**

### Editor y Draft/Publish

- [x] Modelo CMS propio para Trusted By.
- [x] Draft y Published en D1.
- [x] Public API `GET /api/content/trusted`.
- [x] Editor de clientes, nombres, roles, logos, orden y reveals.
- [x] Agregar/eliminar/reordenar clientes.
- [x] WLive protegido contra borrado desde UI.
- [x] Save Draft no cambia Home público.
- [x] Publish queda en Published de D1 sin cambiar Home público todavía.
- [x] Flechas rápidas y Pause/Play del carrusel en preview.
- [x] Pause persiste tras hover y tras editar/reconstruir el preview.
- [x] Select sobre una card de cliente lleva al cliente principal en el inspector.
- [x] Toasts de Save/Discard/Publish no tapan los botones del inspector.
- [x] Swipe táctil del carrusel en móvil; desktop conserva comportamiento existente.

### Pendiente inmediato

- [ ] Upload/Replace de logos desde el Editor usando R2.
- [ ] Control visual de escala/tamaño del logo con preview inmediato.
- [ ] Guardar escala/posición como metadata/configuración; no generar un archivo nuevo por cada resize visual.
- [ ] Migrar primero **Trusted By + Supported Brands** desde `assets/` de GitHub a R2.
- [ ] Conectar Published Trusted By al Home público mediante SSR/fallback siguiendo el patrón del Hero.
- [ ] Smoke final EN/ES + Desktop/Mobile + Draft/Publish.

## P2.1.2 — base de Media/R2

**Estado: BASE IMPLEMENTADA; validación de deploy en curso al registrar este documento.**

- [x] Bucket R2: `sdlive-media-production`.
- [x] Storage class: **Standard**.
- [x] Custom Domain: `media.sdlive.show` activo.
- [x] Public Development URL / `r2.dev`: desactivado.
- [x] Binding Worker: `MEDIA_BUCKET`.
- [x] Variable pública: `MEDIA_PUBLIC_BASE=https://media.sdlive.show`.
- [x] Endpoint autenticado de estado de Media.
- [x] Endpoint autenticado de upload para PNG/JPEG/WebP.
- [x] Límite inicial de upload: 5 MB por archivo.
- [x] Keys versionadas bajo `cms/<folder>/...`.
- [x] Cache metadata larga/immutable para URLs versionadas.
- [x] Carpetas CMS permitidas explícitamente.
- [x] Tests de auth, allowlists, URL pública y escritura R2.

### Arquitectura de media acordada

**GitHub conserva assets de código/branding crítico:**

- logo principal SD.Live y variantes necesarias para la shell,
- favicon/app icons,
- iconos UI,
- assets estructurales/fallback imprescindibles para que el sitio siga arrancando aunque R2 falle.

**R2 almacena media administrable desde el Editor:**

- logos de clientes,
- logos de Supported Brands,
- Portfolio / Selected Work,
- Rental,
- imágenes de Insights,
- fotos de Testimonials si aplica,
- otras imágenes de contenido que deban poder cambiarse sin commit/deploy.

**D1 guarda metadata/referencias, no binarios:**

- key/URL lógica,
- alt,
- escala,
- posición,
- orden,
- visibilidad,
- asociaciones.

### Migración futura de imágenes — NO OLVIDAR

La migración será **progresiva**, no masiva en un solo cambio.

1. [ ] **Trusted By + Supported Brands** — primer lote y patrón de referencia.
2. [ ] **Portfolio / Selected Work** — migrar cuando el Media Library base esté estable.
3. [ ] **Rental** — imágenes de equipos y paquetes administrables desde Admin.
4. [ ] **Testimonials** — fotos/avatar si existen o se agregan.
5. [ ] **Insights / blog** — thumbnails/hero media cuando se reactive contenido real.
6. [ ] Revisar otras imágenes públicas administrables y moverlas a R2 cuando su sección entre al CMS.
7. [ ] Al terminar cada migración, retirar duplicados de GitHub **solo después** de validar producción y mantener los fallbacks críticos que sí deban seguir versionados.

**No migrar por sistema a R2:** branding esencial, favicon/app icons y assets estrictamente ligados al código/fallback.

### Guardrails para mantener R2 dentro del free tier

- Usar **Standard storage**; no Infrequent Access para este proyecto.
- Servir media pública por `media.sdlive.show`, no por un endpoint Worker por cada descarga.
- Mantener CDN/cache delante de R2.
- Usar URLs/keys versionadas para replacements y cache immutable.
- Evitar duplicados innecesarios y limpiar objetos huérfanos solo con un proceso controlado.
- Comprimir/optimizar uploads; no guardar originales enormes sin necesidad.
- Resize visual mediante CSS/D1; no crear múltiples derivados por mover un slider.
- No activar R2 Data Catalog, Cloudflare Images, Stream u otros productos de pago salvo decisión explícita futura.
- Añadir observabilidad de storage/operaciones antes de que el volumen crezca.

---

# Orden recomendado después del gate actual

1. Terminar Upload/Replace + resize visual para Trusted By.
2. Migrar Trusted By + Supported Brands a R2.
3. Conectar Published Trusted By al Home público con SSR/fallback.
4. Testimonials.
5. Services.
6. Media Library reusable.
7. Portfolio / Selected Work.

No empezar drag/drop libre de layout tipo Wix antes de que el patrón de contenido/media esté estable y probado.

---

# Backlog maestro por área

## Admin / CMS / editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero Draft/Published/revisions en D1.
- [x] Hero Published conectado a Home con SSR.
- [~] Trusted By / Brands Supported Through: editor y D1 listos; falta media R2 + binding público SSR.
- [~] Media/R2: infraestructura base creada; falta UI de upload, biblioteca y migración progresiva.
- [ ] Testimonials CMS.
- [ ] Services CMS.
- [ ] Selected Work / Portfolio CMS cuando Media Library sea estable.
- [x] Reorder de clientes Trusted By.
- [ ] Reorder genérico de otras cards/bloques.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita.
- [ ] Media Library reusable sobre R2: listar, buscar, reemplazar, reutilizar y borrar con seguridad.
- [ ] Revisar y retirar `admin/admin.js` / `admin/admin.css` si se confirma duplicación frente a `admin/editor/*`.

## Header, navegación y controles flotantes

- [ ] **WhatsApp en todas las landings públicas.** Reutilizar el botón Home en Theatre, `/en/`, `/es-co/`, servicios Bogotá, Rental y demás páginas públicas; mismo destino, tracking, safe-area y comportamiento responsive.
- [ ] Reordenar/espaciar elementos del header desde Admin.
- [ ] Show/hide de CTAs, Show Day, WhatsApp y controles por página/mercado/dispositivo.
- [ ] Configurar anchors y scroll offset.
- [ ] Agregar/quitar items del menú.
- [ ] Posición independiente Mobile de WhatsApp, cart y Back to Top.

## Contenido público

- [x] Hero CMS real en producción.
- [x] Theatre estabilizado.
- [x] WLive visible y vigente.
- [~] Trusted By: contenido editable y Published en D1; binding público pendiente.
- [~] Portfolio: piezas públicas existen; falta modelo CMS/media/credits/tags/featured.
- [~] Raw vs Mixed: UI existe; faltan audios reales + Admin.
- [~] Testimonials: contenido real + placeholders; falta gestión CMS.
- [~] Show Day: manual existe; falta integración con calendario.
- [ ] Portfolio/CV privado no indexado con variantes profesionales.
- [ ] Recuperar Insights/blog cuando exista contenido real.
- [ ] Evaluar Technical Audio Training como servicio antes de publicarlo.

## Contacto / Rental

- [x] Contact → `hello@sdlive.show`.
- [x] Rental → **`rental@sdlive.show` exclusivamente**.
- [x] Turnstile + consentimiento + D1.
- [x] Pricing y bundles server-side.
- [x] Rental oculto en INT salvo intención directa `#rental`.
- [ ] Card Equipment Rental debe llevar a `#rental` cuando corresponda.
- [ ] Hacer inequívoco que el carrito es solicitud de cotización, no checkout.
- [ ] Resolver empty state, service-only total 0 y reset incompleto.
- [ ] Afinar delivery/logística.
- [ ] PDF de quote, vigencia, disponibilidad y aprobación.
- [ ] Inventario/calendario y prevención de double booking.

## CRM / Projects / Calendar

- [ ] Pipeline Lead: New → Contacted → Quoted → Confirmed → Lost.
- [ ] Clientes, empresas, notas, historial y source.
- [ ] Relación Lead → Quote → Project → Invoice.
- [ ] Integración AppSheet solo con source-of-truth definida.
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
- [ ] Separar tráfico interno/testing.
- [ ] Revisar qué eventos deben ser Key Events vs microconversiones.
- [ ] Funnel completo: sesión → source → lead → qualified → closed.
- [ ] Monitorizar indexación, queries, impressions, CTR, países, páginas de entrada y Core Web Vitals.
- [ ] Medir landings antes de crear más SEO pages.
- [ ] Dashboard/Data Studio o equivalente cuando haya volumen real.
- [ ] Estrategia de adquisición basada en conversiones/revenue.

## Plataforma / seguridad / calidad

- [~] Access, JWT, Turnstile, D1, R2 y consentimiento forman la base actual.
- [x] Tests + CI base.
- [ ] Rate limiting explícito y verificable.
- [ ] CSP, Referrer-Policy y Permissions-Policy sin romper GTM/Turnstile/media.
- [ ] Migraciones/versionado de esquema D1.
- [ ] Observabilidad Worker/D1/R2, publish/deploy y errores.
- [ ] Alertar antes de acercarse a límites relevantes de R2/Workers.
- [ ] Backups/export y rollback operacional.
- [ ] Limpieza segura de objetos R2 huérfanos después de reemplazos/migraciones.
- [ ] Refactor de monolitos (`index.html`, `script.js`, `styles.css`, `worker.js`) solo con tests verdes.
- [ ] Retirar `deploy-test.txt` en cleanup futuro si se confirma que ya no sirve.

---

# Decisiones e invariantes — no reabrir sin evidencia

- Marca exacta: **SD.Live**.
- Descriptor: **Creative Audio**.
- Tagline exacta: **Creative Audio. Technical systems. Built for the show.**
- En UI visible, `SD.Live` debe usar el wordmark con punto flotante cuando aplique; en metadata/código/string machine-readable se usa texto literal.
- SD.Live no debe parecer agencia genérica de eventos, rental house, CV personal ni sociedad incorporada.
- WLive se mantiene visible.
- Rental es Colombia-first; INT lo oculta por defecto.
- Rental nunca envía a `hello@` ni a correo personal: **solo `rental@sdlive.show`**.
- Pricing Rental vive en backend.
- Cloudflare Access es la barrera real del Admin; no usar login visual falso.
- GTM no controla navegación, branding, copy, Theatre ni layout.
- No restaurar Netlify, Owner Access mockup, `site-runtime` ni navegación por GTM.
- No guardar secretos ni datos sensibles en GitHub.
- GitHub es source-of-truth de código; D1 de contenido estructurado; R2 de media administrable.
- `media.sdlive.show` es el dominio público canónico para media R2.
- Public Development URL de R2 permanece desactivado salvo necesidad explícita de desarrollo.
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1 Hero CMS + first paint

Published Hero quedó servido desde D1 con SSR en el edge, fallback estático, idioma resuelto antes del first paint y Draft aislado del sitio público.

## 2026-08-20 — P1.4 tests + CI

Se añadió `node:test` y GitHub Actions. El gate quedó verde y permitió ampliar el CMS con una red mínima de regresión.

## 2026-08-20 — P2.1 Trusted By editor

Se creó modelo CMS para Trusted By/Supported Brands con Draft/Published, edición de clientes, reorder y protección de WLive. Publish todavía no controla el Home público.

## 2026-08-20 — P2.1.1 UX del carrusel/editor

Se añadieron flechas, Pause/Play persistente, swipe móvil, Select→cliente y corrección de toasts. Validación final del usuario: comportamiento correcto.

## 2026-08-20 — P2.1.2 R2 media foundation

Se creó `sdlive-media-production`, `media.sdlive.show`, binding `MEDIA_BUCKET` y endpoints autenticados de upload/status con tests. La estrategia acordada es migrar progresivamente toda la media administrable al bucket, empezando por Trusted By/Supported Brands y dejando branding crítico/fallback en GitHub.

**Siguiente gate:** Upload/Replace + resize visual de logos en el Editor, migración de Trusted By/Supported Brands a R2 y después binding Published → Home.