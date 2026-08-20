# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad del proyecto.** Este archivo registra qué está hecho, cómo está hecho, qué falta y cuál es el siguiente gate. Debe actualizarse al cerrar un milestone o ante un cambio material de alcance; no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-20 |
| Rama verificada | `main` |
| Commit verificado | `1775c60ef055cb8b310bd189e61845e5f43d7076` |
| Producción | [https://sdlive.show](https://sdlive.show) |
| Milestone actual | P1 — conectar el CMS con producción |
| Estado del milestone | **ABIERTO** |
| Siguiente gate | P1.1 — binding Hero CMS → Home con fallback estático |
| Auditoría de backlog | **RECUPERADA** contra `main` + handoff/backlog histórico |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo completos.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit verificado arriba.
3. Si el SHA cambió, revisar el diff y actualizar solamente los estados afectados.
4. No rehacer trabajo marcado como completado sin evidencia concreta de una regresión.
5. Continuar por el primer ítem sin completar de **Milestone actual**.
6. Al cerrar el milestone, actualizar la tabla superior, el roadmap, el backlog afectado y el registro de milestones en un solo commit de documentación.
7. Los ítems marcados como **Futuro/opcional** preservan ideas aprobadas o útiles, pero no autorizan construirlas antes de que su fase corresponda.

### Leyenda

- `[x]` Implementado y verificado en código o producción.
- `[~]` Parcial: existe una base útil, pero no cumple todavía toda la definición de terminado.
- `[ ]` Pendiente.
- **Externo**: se resuelve en Cloudflare, Google, correo u otro servicio fuera del repositorio.
- **Futuro/opcional**: idea preservada para no perderla; requiere priorización antes de implementar.

## Milestone cerrado — P0: base pública estable

**P0 CERRADO el 2026-08-20.** Los gates P0.1–P0.5 quedaron completados y el corte de producción validado corresponde a `main` en `1775c60`.

### Completado

- [x] **Hosting Cloudflare operativo.** El Worker `fragrant-brook-7554` sirve el sitio y ejecuta `/api/*` antes de los assets estáticos.
- [x] **Producción sincronizada con GitHub.** El corte actual de producción fue desplegado desde `main` en `1775c60`; Cloudflare mostró deploy exitoso y el usuario verificó el comportamiento nuevo en Safari/iPhone.
- [x] **Rutas públicas base.** Home, EN, ES-CO, Privacy, Theatre, landings SEO y 404 responden desde Cloudflare.
- [x] **URLs limpias.** HTTP redirige a HTTPS y las URLs `.html` se normalizan.
- [x] **D1 conectado.** `CMS_DB` apunta a `sdlive-cms-production`; `/api/health` confirma la conexión.
- [x] **Admin protegido.** Cloudflare Access protege `/admin`; el Worker valida nuevamente el JWT con `jose`, audiencia y correo autorizado.
- [x] **Contacto funcional.** `POST /api/contact` valida datos, Turnstile y consentimiento `2026-08-19`, guarda en D1 y notifica a `hello@sdlive.show` con Resend.
- [x] **Alquiler funcional.** `POST /api/rental` valida datos, calcula precios en servidor, guarda en D1 y notifica exclusivamente a `rental@sdlive.show`.
- [x] **Bundles y selección de alquiler.** LV1 + StageGrid y WING + DL32 se resuelven en backend; se permiten múltiples consolas y stage racks.
- [x] **Privacidad y consentimiento.** Banner/preferencias y modal de autorización están separados; GTM/GA4 se condicionan al consentimiento.
- [x] **Analítica base.** GTM `GTM-W4LDB4T7`, GA4 `G-F6MR3GJ716` y eventos de email, WhatsApp y generación de lead están configurados. `analytics-consent.js` se carga antes de GTM desde `1775c60` para establecer el consentimiento por defecto antes de iniciar Google Tag Manager.
- [x] **Navegación Home en first-party JS.** La flecha usa `home-navigation.js`; GTM no controla la navegación.
- [x] **Theatre estabilizado.** Landing estática con una tarjeta grande y dos tarjetas iguales, sin transformación JS.
- [x] **SEO técnico P0.** Canonicals, `hreflang`, JSON-LD, Open Graph, titles/descriptions, `robots.txt`, sitemap y landings especializadas están publicados.
- [x] **Search Console inicial.** Google quedó configurado y Bing iniciado; el seguimiento continuo pertenece a optimización.
- [x] **Limpieza de implementaciones descartadas.** Se retiraron el mockup de Owner Access, `site-runtime.js/css`, la navegación en GTM y la frase antigua.
- [x] **Copy canónico.** Home usa exactamente “Creative Audio. Technical systems. Built for the show.”
- [x] **Convenciones históricas retiradas.** No quedan `SD.live`, `SDLive`, `SD Live`, el correo iCloud antiguo ni la implementación display-only en el alcance auditado.
- [x] **WLive es contenido vigente.** El logo/card, el reveal “Brands supported through WLive” y el testimonial asociado deben mantenerse visibles. La nota previa que sugería retirarlo fue una inferencia incorrecta y no estaba respaldada por los handoffs fuente.
- [x] **Redirect `www` → root validado (Externo).** La regla wildcard de Cloudflare quedó configurada para preservar correctamente la ruta usando `${2}`; el usuario verificó en Safari/iPhone que `https://www.sdlive.show/` abre y funciona correctamente. No existe evidencia de que el supuesto destino `/s` haya ocurrido en producción; esa afirmación previa fue una inferencia incorrecta y queda descartada.
- [x] **Wordmark dinámico validado.** `privacy-consent.js` y `analytics-consent.js` renderizan las menciones visuales mediante el wordmark con punto flotante; el alert nativo de éxito de Contact ya no intenta mostrar la marca sin estilo. En producción el usuario confirmó tanto Preferencias de cookies como los modales de autorización con `SD.Live` estilizado correctamente.

### Gates P0

- [x] **P0.1 — validar redirect de `www` (Externo).** Regla corregida y verificada manualmente en navegador real: `www.sdlive.show` resuelve correctamente hacia el sitio canónico.
- [x] **P0.2 — garantizar el wordmark visual en contenido dinámico.** Cerrado en producción. Los scripts de privacidad/analítica usan renderer seguro para `SD.Live`; el alert nativo de Contact evita la marca en una superficie no estilizable. Se detectó además que `analytics-consent.js` no estaba cargado en Home y se corrigió en `1775c60` cargándolo antes de GTM. El usuario verificó visualmente Preferencias de cookies y los modales de autorización en Safari/iPhone.
- [x] **P0.3 — confirmar alcance WLive.** Confirmado: WLive se mantiene visible y no constituye un bug ni un bloqueo.
- [x] **P0.4 — smoke test final en navegador real.** PASS el 2026-08-20: Home móvil, EN→ES→EN, Back to Top con URL limpia, Trusted By/WLive, Rental móvil + carrito + bundles visuales, preferencias de cookies, autorización de Contact, autorización de Rental, Theatre, `/en/`, `/es-co/`, `/privacy` y 404 personalizada.
- [x] **P0.5 — validación analítica en producción.** PASS el 2026-08-20 en GA4 Realtime: `contact_email_click = 1`, `contact_whatsapp_click = 1`; un único envío real produjo exactamente `generate_lead = 1`. El evento incluyó `lead_type`, `market`, `page_location`, `page_path`, `page_referrer` y `page_title`; los valores validados fueron `lead_type = contact` y `market = colombia`. La separación de tráfico interno/testing queda como optimización posterior y no como blocker retroactivo de P0.

### Definición de P0 cerrado

Cumplida. P0.1–P0.5 están completos, no se observaron regresiones visuales o funcionales en el smoke test y el commit desplegado fue verificado contra `main`.

## Milestone actual — P1: conectar el CMS con producción

- [ ] **P1.1 — binding Hero CMS → Home.** Consumir `GET /api/content/hero` desde el sitio público con fallback seguro al contenido estático.
- [ ] **P1.2 — preservar SEO y resiliencia.** El contenido crítico debe seguir disponible si la API falla y no provocar layout shift evitable.
- [ ] **P1.3 — preview y publish coherentes.** Verificar que Draft, Published y revisiones produzcan el mismo resultado visual en Editor y Home.
- [ ] **P1.4 — pruebas mínimas.** Añadir cobertura de la API, fallback, publicación y regresión del Hero antes de ampliar el CMS.

### Base ya implementada para P1

- [x] Dashboard y Editor Admin V6.4.
- [x] Navegación uniforme entre `/admin/` y `/admin/editor/`.
- [x] Previews COL/INT, EN/ES y Desktop/Mobile.
- [x] Modos Select/Interact, paneles colapsables, Focus Mode, capa de selección y preview de marca.
- [x] Draft, Published y revisiones del Hero guardados en D1.
- [x] Endpoints Admin del Hero y endpoint público `GET /api/content/hero`.
- [x] El Hero publicado en D1 coincide con el contenido estático al corte del 2026-08-20.
- [x] El endpoint público existe en `worker.js`.
- [ ] El Home todavía no consulta el endpoint público; no hay referencia a `/api/content/hero` en `index.html` ni `script.js` al corte auditado.

## Roadmap por fases y gates

No se avanza de fase por cantidad de pantallas o commits, sino al cumplir el gate operativo de la fase anterior.

| Fase | Objetivo | Estado | Gate de salida |
|---|---|---|---|
| 1. Base estable | Sitio público, hosting, rutas, marca y formularios | **Cerrado (P0)** | Cumplido 2026-08-20 |
| 2. Seguridad y control | Access, permisos, validación, observabilidad y recuperación | Parcial | Controles probados y operación documentada |
| 3. Sistema de contenido | Modelo, media, versiones y publicación confiable | Iniciado — P1 activo | Hero real + contenido estructurado estable |
| 4. Editor real | Edición visual responsive y reutilizable | Pendiente | Edición/publish sin tocar código |
| 5. Automatización operativa | CRM, calendario, inventario, cotizaciones e inbox | Pendiente | Flujo lead → operación trazable |
| 6. Inteligencia y optimización | Analítica, SEO, rendimiento y reporting | Parcial | Métricas confiables y ciclo de mejora activo |
| 7. Escala comercial | Contenido, casos, automatización y conversión | Pendiente | Adquisición y seguimiento repetibles |
| 8. Ecosistema de plataforma | Extensiones premium e integraciones | Futuro | Solo después de validar las fases anteriores |

## Backlog maestro recuperado por área

Este backlog incorpora el detalle que estaba disperso en handoffs y listas históricas. Los ítems ya resueltos no se reabren; los futuros se conservan para que no desaparezcan al resumir el roadmap.

### Admin, CMS y editor

- [~] **Base Admin V6.4.** Dashboard, Editor, estados de Hero y previews implementados.
- [ ] Conectar Published del CMS al sitio público y luego extender Draft / Published / revisions del Hero a las demás secciones.
- [ ] Selección visual real de todos los elementos editables.
- [ ] Drag/drop y reordenamiento de cards/bloques.
- [ ] Snap-to-grid, resize, gap, padding, alignment y spacing visual.
- [ ] Configuración independiente Desktop/Mobile y show/hide por dispositivo.
- [ ] Show/hide por mercado COL/INT.
- [ ] Undo/redo, rollback de revisiones y draft completo por página.
- [ ] Duplicar bloques/cards y crear bloques nuevos desde templates.
- [ ] Convertir staging oculto en **Template Library** explícita; no mantener mockups ocultos indefinidamente en HTML.
- [ ] **Media Library + R2:** crear binding/bucket, subir y reutilizar imágenes, logos, portfolio, equipment, testimonials y OG images; permitir reemplazo/eliminación segura.
- [ ] **Futuro/opcional Media:** folders/tags, búsqueda, alt text, crop/focal point, WebP/AVIF automático y detección de assets sin usar.
- [ ] Gestión dinámica de **Trusted By:** alta/baja, logo, reordenar, duplicar, resize, idioma y visibilidad por mercado.
- [ ] Gestión dinámica de **Brands Supported Through:** alta/baja, asociaciones empresa→marca, reorder, hover Desktop y tap Mobile.
- [ ] Gestión dinámica de **Testimonials:** logo/foto, nombre, cargo, empresa, quote, orden, featured y placeholders.
- [ ] Verificar y retirar `admin/admin.js` y `admin/admin.css` si se confirma que son duplicados sin uso respecto a `admin/editor/*`.

#### Header, navegación y controles flotantes

- [ ] **WhatsApp en todas las landings públicas.** Reutilizar el botón flotante del Home en Theatre, `/en/`, `/es-co/`, servicios Bogotá, landings de Rental y demás landings públicas; mantener el mismo destino, tracking, safe-area y comportamiento coherente en Desktop/Mobile.
- [ ] Reordenar elementos del header y ajustar spacing entre logo, navegación, idiomas, Live/Show Day y CTAs.
- [ ] Mostrar/ocultar botones, Live/Show Day y WhatsApp desde Admin.
- [ ] Configurar comportamiento independiente Desktop/Mobile.
- [ ] Configurar destino de cada link y **scroll offset** por anchor.
- [ ] Agregar/quitar items del menú desde Admin.
- [ ] Mover WhatsApp, Rental/cart, Live/Show Day y Back to Top; posición independiente Mobile, distancia a bordes y orden entre controles.
- [ ] Show/hide de controles por página.
- [ ] **Futuro/opcional:** presets de Header (Normal / Show Day / Minimal) y preview de safe areas de iPhone.

#### Settings y operación del Admin

- [ ] Settings centralizados: marca, contacto, aliases Workspace, WhatsApp, redes, default COL/INT, Show Day, Rental, SEO defaults y notificaciones.
- [ ] Permisos editoriales y controles por ambiente.
- [ ] **Futuro/opcional:** Global Search/Command Palette, Activity Center, Automation Center, shortcuts, autosave Draft, comparación antes de Publish, Scheduled Publish, Scheduled Visibility, notificaciones globales y role-based access.

### Contenido y experiencia pública

- [x] Hero, navegación Home, cards de Theatre y UI frontend de marcas están implementados.
- [~] **Portfolio / Highlight Projects:** tres piezas públicas y tres slots ocultos; faltan CMS/media, imágenes/video, credits, rol, cliente/productora, año, descripción, tags y featured/hidden.
- [ ] **Futuro/opcional Portfolio:** filtros por disciplina, case studies extensos, Before/After y ejemplos QLab/audio/video.
- [~] **Raw vs Mixed:** UI/lógica existe oculta; faltan audios reales y administración de pares desde Admin.
- [ ] **Futuro/opcional Raw vs Mixed:** waveform real, cambio sample-accurate y múltiples ejemplos.
- [~] **Testimonials:** un testimonio real y placeholders ocultos; falta administración. El testimonial/logotipo de WLive es contenido vigente y debe mantenerse.
- [~] **Show Day:** cambio manual en Home implementado; falta automatización, reglas y propagación coherente a landings.
- [x] El viejo Owner Access fue retirado; el acceso real se hace por `/admin/` detrás de Cloudflare Access. No se necesita un login público por defecto.
- [ ] **Portfolio/CV privado:** páginas no indexadas/no navegables, con versiones Sound Design, Live Audio, Theatre, AV/Systems, Production y General CV.
- [ ] **Futuro/opcional Portfolio privado:** links revocables, expiración, límite/registro de accesos, “prepared for [Company]”, PDF y snapshot por candidatura.
- [ ] Chatbot basado en knowledge base aprobada, manteniendo costo gratuito o casi gratuito y sin inventar precios/disponibilidad.
- [ ] Recuperar/activar contenido editorial útil: blog/Insights, Field Notes, Behind the Console y otros bloques ocultos cuando haya contenido real.
- [ ] Evaluar **Technical Audio Training** como servicio explícito antes de publicarlo.
- [ ] Preservar ideas de contenido: audio profesional, briefs AV para equipos de marketing, IA/Suno aplicada a producción de audio, formación y tutoriales.

### Contacto, alquiler y operación

- [x] Ingesta de contacto y alquiler en D1 con Turnstile, consentimiento y Resend.
- [x] Contacto notifica a `hello@sdlive.show`; Rental notifica exclusivamente a `rental@sdlive.show`.
- [x] Precios y bundles de alquiler calculados en servidor.
- [x] Rental se oculta para INT y puede revelarse con intención directa `#rental`.
- [~] La card de Equipment Rental respeta la visibilidad INT, pero todavía debe llevar directamente a `#rental` cuando corresponda.
- [ ] Autoresponder, rate limiting explícito y UI para seguimiento de leads.
- [ ] Mejorar claridad del carrito: dejar inequívoco que es **solicitud de cotización**, no compra/pago; resolver empty state, service-only total 0 y reset incompleto.
- [ ] Afinar logística/delivery y decidir si hacen falta presets/paquetes adicionales sin reabrir el pricing backend estable.
- [ ] PDF de cotización, disponibilidad, vigencia y flujo de aprobación.
- [ ] Calendario de inventario y prevención de double booking.

#### CRM, AppSheet y Projects

- [ ] CRM básico con pipeline **New → Contacted → Quoted → Confirmed → Lost**.
- [ ] Clientes, contactos, empresas, notas, historial y source (Web / Email / Referral / LinkedIn / etc.).
- [ ] Relación trazable **Lead → Quote → Project → Invoice**.
- [ ] Integración AppSheet: trabajos, clientes, eventos y pagos cuando aporte valor; definir primero la **source of truth** de cada dato y evitar duplicación.
- [ ] Módulo Projects: cliente, show, rol, fechas, venue, contactos, notas, archivos, Rental, Quote y Calendar asociados.
- [ ] **Futuro/opcional Projects:** checklist pre-show / show day / wrap.

#### Calendario, Show Day y cotizaciones

- [ ] Vista Calendar en Admin integrando Google Calendar, AppSheet events, Projects, Rental y disponibilidad.
- [ ] Conectar Show Day al calendario real; detectar show/evento, activar/desactivar automáticamente y conservar override manual.
- [ ] **Futuro/opcional Show Day:** ventana configurable antes/después del evento.
- [ ] Automatización de cotizaciones desde Rental/Lead: equipo, servicios, transporte, IVA, días, descuentos/reglas, PDF, numeración y envío.
- [ ] Estados de Quote: **Draft / Sent / Viewed / Accepted / Rejected**.
- [ ] **Futuro/opcional:** aceptación online y convertir Quote aceptada en Project.

#### Inbox y correo

- [x] Acceso directo a Gmail para la operación de correo.
- [ ] Inbox nativo dentro del Admin con General, Rental, Projects y Billing; responder desde el alias correcto.
- [ ] Email → Lead / Rental Request / Project cuando el modelo de datos esté listo.
- [ ] Verificar configuración/uso de aliases operativos acordados (`hello@`, `info@`, `rental@`, `projects@`, `billing@`, `facturas@`) antes de automatizarlos.
- [ ] Evaluar `noreply@` y completar revisión de DMARC cuando Workspace/email esté estable.

### Analítica, SEO y crecimiento

- [x] Consent Mode, GTM, GA4 y eventos base implementados y validados en producción para el flujo P0.
- [x] Validado en **GA4 Realtime** `contact_whatsapp_click` y `contact_email_click` desde la web live sin Tag Assistant: 1 evento de cada uno en la prueba P0.5.
- [x] Un único envío real confirmó **1 submission = 1 `generate_lead`**.
- [x] Confirmados parámetros de lead: `lead_type`, `market`, `page_location`, `page_path`, `page_referrer`, `page_title`; valores observados `lead_type = contact` y `market = colombia`.
- [ ] Separar tráfico interno/testing cuando deje de ser necesario verlo para debugging.
- [ ] Revisar Key Events: solo outcomes de negocio; no tratar `page_view` o `scroll` como conversiones. En el corte P0 aparecen `contact_email_click`, `contact_whatsapp_click` y `generate_lead` como Key events; revisar si los clicks deben seguir siendo Key events o solo microconversiones.
- [ ] Completar funnel medible: usuarios/sesiones → source/channel → país/ciudad/device → form starts/contactos → lead type/market → qualified → closed.
- [ ] Validar atribución antes de interpretar “Unassigned” u otros canales como problema real.
- [~] SEO técnico y landings P0 publicados; falta monitorizar indexación real, queries, impressions, CTR, países, páginas de entrada, Core Web Vitals y conversión.
- [ ] Medir rendimiento real de “alquiler sonido Bogotá”, “sonido eventos corporativos Bogotá”, “alquiler consolas Bogotá” y “Behringer WING Bogotá” antes de crear más páginas.
- [ ] Revisar internal linking, alt text y consistencia visual/Show Day de landings cuando toque optimización, sin rehacer la auditoría SEO P0 desde cero.
- [ ] Dashboard/Data Studio: evaluar dashboard propio, Looker Studio o híbrido con Website, Leads, CRM, Rental, Projects, AppSheet/NextPay, Revenue, Quotes y conversiones.
- [ ] Analizar canales óptimos de adquisición/traffic (orgánico, LinkedIn/RRSS, referral, outreach, QR/UTM y otros) con métricas de conversión y revenue, no solo visitas.
- [ ] Estrategia de contenido, casos, Insights/blog, podcast, formación y tutoriales basada en objetivos comerciales.
- [ ] Ciclo de experimentación de conversión y ROI por canal.
- [ ] **Futuro/opcional:** UTM/link builder integrado, QR generator y reporting de revenue por cliente/servicio, utilización de equipos, mercados y forecast.

### Plataforma, seguridad y calidad

- [~] Access, JWT, Turnstile, D1 y consentimiento dan una base de seguridad útil.
- [ ] Rate limiting verificable, pruebas de autorización y estudio explícito de qué ofrece Cloudflare **Free vs Paid** para seguridad/controles.
- [ ] Evaluar CSP, Referrer-Policy y Permissions-Policy sin romper GTM, Turnstile ni assets.
- [ ] Tests automatizados, lint, CI y migraciones/versionado de esquema D1.
- [ ] Observabilidad de Worker, D1, futuro R2, último publish/deploy, errores y backups/export desde Dashboard.
- [ ] Auditoría de código orientada a limpieza, orden, rendimiento y fluidez **sin romper comportamiento validado**; refactor posterior a pruebas porque `index.html`, `script.js`, `styles.css` y `worker.js` son monolíticos.
- [ ] Diagnóstico visible y validación real de detección COL/INT por locale/timezone.
- [ ] Revisar artefactos de desarrollo antes de cierre/cleanup futuro; `deploy-test.txt` sigue presente en `main` y parece ser únicamente una prueba de deploy del 2026-08-17.
- [ ] **Futuro/opcional:** audit log administrativo, backups exportables y rollback desde UI.

### Ecosistema / ideas futuras preservadas

No son compromisos inmediatos. Se conservan para que el handoff no pierda decisiones/ideas de producto anteriores.

- [ ] **Futuro/opcional:** Client Portal para cotizaciones, archivos, datos de proyecto y confirmaciones mediante link privado.
- [ ] **Futuro/opcional:** Share Links genéricos para Portfolio, CV, quotes, documentos o previews.
- [ ] **Futuro/opcional:** preview links de Draft y versiones de la web por campaña sin duplicar todo el sitio.
- [ ] **Futuro/opcional:** PWA del Admin.
- [ ] **Futuro/opcional:** disponibilidad compartible, conflictos de agenda/equipo y automatizaciones de follow-up.
- [ ] Cualquier evolución multi-user, multi-tenant o SaaS debe validarse comercialmente antes de construirse; no se asume como destino automático de SD.Live.

## Decisiones e invariantes — no reabrir sin evidencia

- La marca se escribe **SD.Live**. En UI visible debe usarse el wordmark con punto flotante; en strings machine-readable se mantiene texto literal.
- Descriptor canónico: **Creative Audio**.
- Tagline canónica exacta: **Creative Audio. Technical systems. Built for the show.**
- SD.Live no se presenta como agencia genérica de eventos, rental house ni sociedad incorporada.
- Rental es Colombia-first. INT lo oculta por defecto; una intención directa `#rental` puede exponerlo.
- **WLive debe mantenerse visible** como cliente/partner y como respaldo del testimonial y de las marcas atendidas a través de WLive.
- Los formularios de rental se envían únicamente a `rental@sdlive.show`, nunca a `hello@sdlive.show`.
- Cloudflare Access es la barrera real del Admin; no reemplazarla con un login visual falso.
- El pricing de rental vive en backend; no moverlo al cliente ni rediseñarlo sin un bug o requisito nuevo.
- GTM controla consentimiento/analytics/eventos; no navegación, layout, branding, Theatre ni UI general.
- No restaurar Netlify, Owner Access mockup, `site-runtime`, navegación mediante GTM, tagline anterior, cards duplicadas Theatre/Theater ni dirección residencial.
- No reconstruir CMS/D1, Access, privacidad, Turnstile, analítica o SEO desde cero si el componente actual puede extenderse.
- No guardar secretos ni datos sensibles en GitHub.
- La instrumentación base de GA4 ya está validada; no interpretar todavía adquisición/ROI como verdad definitiva hasta separar tráfico interno/testing y acumular suficiente tráfico real.

## Registro de milestones

### 2026-08-20 — baseline y ruleout P0

**Resultado:** P0 permanecía abierto en este corte. Se verificó que la mayoría de la base estaba implementada y que quedaban bloqueos concretos; no se debía reiniciar la migración ni reconstruir sistemas ya operativos.

**Evidencia principal:**

- `main` y producción habían sido verificados en `e81b9155c40950bde128218a6196c598f0457a86` durante el corte previo.
- `/api/health` identificó `sdlive-cms-production` en la validación previa.
- `/api/admin/whoami` fue interceptado por Cloudflare Access en la validación previa.
- En la auditoría de código se confirmó `POST /api/contact` → `hello@sdlive.show` y `POST /api/rental` → `rental@sdlive.show`.
- En la auditoría de código se confirmó que `/api/content/hero` existe en `worker.js`, pero Home aún no lo consume.
- Se confirmó por código que P0.2 era real: consentimientos y alert de Contact todavía podían mostrar `SD.Live` como texto plano.
- WLive está visible en Home, reveal de marcas y testimonial; el usuario confirmó que esto es intencional y debe mantenerse. La inferencia previa de retirarlo se descarta.
- `deploy-test.txt` sigue en `main` como residuo de una prueba de deploy y se añadió a cleanup futuro, sin convertirlo en blocker P0.

**Cambios históricos relevantes ya incorporados:**

- `4c57746`: retiro del mockup Owner Access.
- `9a5a0ce` y `c3c5723`: retiro de `site-runtime`.
- `e81b915`: actualización de `lastmod` del sitemap después de la limpieza P0.

### 2026-08-20 — recuperación del backlog histórico

**Resultado:** el primer `PROJECT_STATUS.md` era un resumen válido pero demasiado comprimido para funcionar como handoff maestro a largo plazo. Se contrastó contra los handoffs/listas históricas y se recuperaron requisitos que no estaban preservados explícitamente.

**Recuperado sin reabrir trabajo ya cerrado:**

- detalle del Site Editor: header, anchors, floating controls, Desktop/Mobile y COL/INT;
- Media Library/R2 y gestión de Trusted By / Brands / Testimonials;
- Portfolio/Raw vs Mixed/Template Library y Portfolio/CV privado;
- CRM, AppSheet, Projects, Calendar, Show Day, Quote flow e Inbox;
- definición de integridad GA4/GTM y funnel de negocio;
- Settings/System/observabilidad/seguridad y auditoría de código;
- adquisición, RRSS/traffic channels, blog/Insights, formación y Technical Audio Training;
- ideas premium/futuras, claramente separadas de los gates actuales.

### 2026-08-20 — corrección de alcance WLive

**Resultado:** WLive se mantiene. La nota que lo había convertido en posible bloqueo P0 provenía de una síntesis anterior y no tenía respaldo en los dos handoffs fuente revisados; ambos no contienen ninguna instrucción de retirar WLive. El código actual que muestra WLive se considera comportamiento correcto.

### 2026-08-20 — P0.1 redirect `www` validado

**Resultado:** P0.1 cerrado. Se corrigió la referencia wildcard del Target URL de Cloudflare para preservar la ruta y el usuario verificó inmediatamente en Safari/iPhone que `https://www.sdlive.show/` abre y funciona correctamente. La mención previa de una redirección observada a `/s` se elimina como hecho: nunca fue reportada ni observada; había sido una inferencia técnica a partir de la configuración anterior.

### 2026-08-20 — P0.2 wordmark dinámico validado

**Resultado:** P0.2 cerrado. Se añadió un renderer seguro de `SD.Live` a las superficies dinámicas de privacidad y analítica y se retiró la marca del `alert()` nativo de éxito de Contact. Durante la validación se detectó que `analytics-consent.js` existía pero no estaba incluido en Home; `1775c60` lo carga antes de GTM. Cloudflare desplegó ese commit y el usuario verificó en Safari/iPhone que Preferencias de cookies y los modales de autorización muestran `SD.Live` con el punto flotante correcto.

### 2026-08-20 — P0.4 smoke test final validado

**Resultado:** P0.4 cerrado. El usuario completó el smoke test en navegador real con PASS en Home móvil, idioma EN/ES, Back to Top con URL limpia, Trusted By/WLive, carrito Rental y bundles, preferencias de cookies, modales de autorización de Contact y Rental, Theatre, `/en/`, `/es-co/`, `/privacy` y la 404 personalizada. No se observaron regresiones funcionales o visuales en ese recorrido.

**Nuevo backlog detectado durante el smoke:** añadir el botón flotante de WhatsApp a todas las landings públicas con el mismo destino, tracking y comportamiento responsive del Home. Se registra como mejora de consistencia pública y no reabre P0.4.

### 2026-08-20 — P0.5 GA4 validado y P0 cerrado

**Resultado:** P0.5 cerrado y, con ello, **P0 completo**. En GA4 Realtime, desde producción y sin Tag Assistant, se observaron `contact_email_click = 1` y `contact_whatsapp_click = 1`. Un único envío real de Contact produjo exactamente `generate_lead = 1`, descartando duplicación en la prueba. El evento expuso los parámetros `lead_type`, `market`, `page_location`, `page_path`, `page_referrer` y `page_title`; los valores inspeccionados fueron `contact` y `colombia` para `lead_type` y `market` respectivamente.

**Siguiente milestone:** P1 — conectar el Hero publicado del CMS con el Home mediante `GET /api/content/hero`, preservando fallback estático, SEO y resiliencia.

## Protocolo de actualización por milestone

Actualizar este archivo cuando ocurra uno de estos eventos:

1. Se cierra un milestone o uno de sus gates.
2. Aparece o se resuelve un bloqueo que cambia la fecha o el orden del roadmap.
3. Cambia una decisión/invariante acordada.
4. Producción deja de coincidir con el estado documentado.

En cada actualización:

- Registrar fecha, rama y SHA verificados.
- Mover los checkboxes afectados sin borrar el historial.
- Añadir evidencia breve en el registro de milestones.
- Definir un único siguiente gate accionable.
- Actualizar `README.md` solo si cambió arquitectura, rutas u operación.

No actualizar por cambios cosméticos aislados, microcopy o commits intermedios que todavía no cierran un resultado verificable.

## Orden recomendado inmediato

1. Empezar P1.1: binding del Hero CMS hacia Home con fallback estático.
2. Validar P1.2: fallback, SEO y resiliencia si la API falla.
3. Implementar el botón flotante de WhatsApp en todas las landings públicas dentro del bloque de consistencia/navegación, sin convertirlo en blocker retroactivo de P0.
4. Continuar P1.3/P1.4 y después ampliar CMS/editor siguiendo el backlog recuperado y los gates de las 8 fases.
