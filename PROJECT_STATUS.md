# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Este archivo registra qué está hecho, cómo está resuelto, qué falta y cuál es el siguiente gate. Debe actualizarse al cerrar un milestone o ante un cambio material de alcance; no con cada parche pequeño.

| Campo | Valor |
|---|---|
| Última revisión integral | 2026-08-20 |
| Rama verificada | `main` |
| Commit verificado | `537638839e4da7fe348c05a1b87fbbc542cd1297` |
| Producción | `https://sdlive.show` |
| Milestone actual | P1 — conectar el CMS con producción |
| Estado del milestone | **ABIERTO — P1.1/P1.2/P1.3 completados; P1.4 pendiente** |
| Siguiente gate | **P1.4 — tests mínimos + CI antes de ampliar el CMS** |

## Cómo retomar el proyecto en una conversación nueva

1. Leer `README.md` y este archivo.
2. Consultar el `HEAD` actual de `main` y compararlo con el commit verificado arriba.
3. Si cambió, revisar únicamente los diffs posteriores y actualizar los estados afectados.
4. No rehacer trabajo marcado `[x]` salvo que exista evidencia de regresión.
5. Continuar por el primer gate abierto del milestone actual.
6. Al cerrar un milestone o gate material, actualizar este archivo y `README.md` si cambió arquitectura u operación.

### Leyenda

- `[x]` Implementado y validado en código/producción.
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

## P1.1 — Published Hero → Home

**Estado: COMPLETADO.**

- [x] Admin mantiene Draft, Published y revisiones del Hero en D1.
- [x] Endpoint público `GET /api/content/hero` disponible.
- [x] Home quedó conectado al contenido Published.
- [x] Existe fallback estático deliberado.
- [x] Draft del Admin no contamina producción.
- [x] EN/ES se renderizan desde la misma estructura de contenido.

### Implementación

1. Primera integración: binding client-side del Hero.
2. Se detectó flash HTML estático → CMS.
3. Se añadió capa de hydration para eliminar el swap visible.
4. Se detectó un vacío breve mientras esperaba el fetch.
5. Solución final: **Published Hero se renderiza en el Cloudflare edge antes del primer paint**.

Archivos clave:

- `worker-entry.js`: sirve `/`, lee Published de D1 e inyecta el Hero con `HTMLRewriter`.
- `worker.js`: API existente de CMS, Contact y Rental.
- `hero-content.js`: resiliencia client-side y aislamiento del Admin preview.
- `cms-hydration.js`: fallback/hydration utility.
- `home-navigation.js`: carga del binding y navegación Home.

PRs principales:

- #1 — P1.1 Connect published Hero CMS binding.
- #2 — P1.1.1 Stabilize Hero CMS hydration.
- #3 — P1.1.2 Server-render Published Hero at the edge.
- #4 — P1.1.3 Stabilize first-paint language and Hero lede.

## P1.2 — SEO, resiliencia y first paint

**Estado: COMPLETADO.**

- [x] El HTML inicial contiene el Hero Published antes de llegar al navegador.
- [x] Si D1 falla, el Worker entrega el Hero estático.
- [x] La raíz usa `Cache-Control: no-store` porque contiene contenido CMS vivo.
- [x] CSS/JS/assets siguen servidos como estáticos.
- [x] Se eliminó el flash de copy estático → CMS.
- [x] Se eliminó el vacío de hydration del Hero.
- [x] El idioma persistido se conoce antes del primer paint mediante cookie legible por el Worker.
- [x] `localStorage` se mantiene por compatibilidad y se migra/sincroniza a cookie.
- [x] Sin preferencia guardada, se usa `Accept-Language`.
- [x] El wordmark visual `SD.Live` del lede se renderiza antes del primer paint para evitar cambios de line-wrap.
- [x] Validación manual final: EN limpio al recargar; ES permanece ES al recargar; sin popping del párrafo.

## P1.3 — Preview / Draft / Published coherentes

**Estado: COMPLETADO para el Hero.**

- [x] Draft puede diferir del Published sin cambiar Home.
- [x] Publish actualiza producción.
- [x] Cambios EN y ES se mantienen separados correctamente.
- [x] Admin iframe queda aislado de la inyección Published del Worker.
- [x] El Hero del Admin permanece visible y editable.
- [x] Se validó producción restaurando el copy de prueba al final.

## P1.4 — tests mínimos + CI

**Estado: PENDIENTE — SIGUIENTE GATE.**

Actualmente `package.json` solo contiene la dependencia `jose`; no existe suite de tests ni pipeline CI del proyecto.

Antes de ampliar el CMS a más bloques:

- [ ] Añadir runner de tests ligero.
- [ ] Test de validación/lectura de Published Hero.
- [ ] Test del fallback estático cuando D1 no entrega contenido válido.
- [ ] Test de resolución de idioma: cookie → `Accept-Language` → default.
- [ ] Test de que SSR marca el Hero como server-rendered y no dispara fetch redundante.
- [ ] Test de aislamiento del iframe Admin.
- [ ] Test básico de endpoints críticos sin secretos reales.
- [ ] Añadir CI en GitHub para ejecutar tests en PRs.
- [ ] Documentar comando de test en README.

**Gate de salida de P1:** tests verdes + smoke mínimo en producción. Después se puede ampliar el patrón CMS a otros bloques.

---

# Prioridad inmediatamente después de P1

Orden recomendado:

1. **Expandir CMS de forma incremental**, no convertir toda la página de una vez.
2. **Trusted By / Brands Supported Through**: buen siguiente bloque porque ya existe UI estable y requiere gestión de logos/orden/asociaciones.
3. **Testimonials**: contenido estructurado, reorder y featured.
4. **Services**: copy/orden/visibilidad por mercado.
5. **Portfolio / Selected Work**: solo cuando Media Library/R2 tenga una base estable.

No empezar drag/drop libre, layout tipo Wix o Media Library completa antes de que el patrón Draft → Publish → SSR → fallback tenga tests y se replique de forma controlada.

---

# Backlog maestro por área

## Admin / CMS / editor

- [x] Dashboard + Editor V6.4.
- [x] Preview COL/INT, EN/ES, Desktop/Mobile.
- [x] Select/Interact, Focus, paneles colapsables y selección visual base.
- [x] Hero Draft/Published/revisions en D1.
- [x] Hero publicado conectado a Home con SSR.
- [ ] Extender CMS a Trusted By / Brands Supported Through.
- [ ] Extender CMS a Testimonials.
- [ ] Extender CMS a Services.
- [ ] Extender CMS a Selected Work / Portfolio cuando exista Media Library.
- [ ] Reorder de cards/bloques.
- [ ] Show/hide por mercado y dispositivo desde Admin.
- [ ] Configuración de gap/padding/alignment/spacing.
- [ ] Undo/redo y rollback accesible desde UI.
- [ ] Duplicar bloques/cards desde templates.
- [ ] Template Library explícita.
- [ ] Media Library + R2.
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

- [~] Access, JWT, Turnstile, D1 y consentimiento forman la base actual.
- [ ] Rate limiting explícito y verificable.
- [ ] CSP, Referrer-Policy y Permissions-Policy sin romper GTM/Turnstile.
- [ ] Tests + CI — **P1.4 actual**.
- [ ] Migraciones/versionado de esquema D1.
- [ ] Observabilidad Worker/D1/R2, publish/deploy y errores.
- [ ] Backups/export y rollback operacional.
- [ ] Refactor de monolitos (`index.html`, `script.js`, `styles.css`, `worker.js`) solo después de tests.
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
- No reconstruir desde cero CMS/D1/Access/privacidad/analytics si la base actual puede extenderse.

---

# Registro de milestones

## 2026-08-20 — P0 cerrado

P0.1–P0.5 validados: redirect `www`, wordmark dinámico, alcance WLive, smoke público y GA4 Realtime.

## 2026-08-20 — P1.1 Hero CMS conectado

Se conectó Published del Hero a Home, primero mediante binding client-side. Draft quedó aislado y Publish se validó en producción en EN/ES.

## 2026-08-20 — P1.1.1 hydration

Se eliminó el swap visible de texto estático → CMS y se corrigió el aislamiento/visibilidad del Admin preview.

## 2026-08-20 — P1.1.2 edge SSR

El Worker pasó a leer Published Hero desde D1 e inyectarlo en el HTML inicial. Se eliminó el vacío de hydration y se mantuvo fallback estático.

## 2026-08-20 — P1.1.3 first-paint language + lede

Se corrigieron los dos últimos pops visibles: idioma persistido EN/ES antes del primer paint y wordmark `SD.Live` del lede renderizado antes de que el navegador calcule el line-wrap. Validación final del usuario: **carga limpia**.

**Siguiente gate:** P1.4 — tests mínimos + CI. No ampliar CMS antes de tener esta red de seguridad.
