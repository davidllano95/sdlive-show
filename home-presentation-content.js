export const PRESENTATION_SECTION_KEYS = {
  rental: { section: "rental", market: "col", route: "root" },
  contact: { section: "contact", market: "all", route: "root" }
};

const localized = (en, es) => ({ en, es });

export const PRESENTATION_SECTION_DEFAULTS = {
  rental: {
    heading: {
      eyebrow: localized("Rental", "Alquiler"),
      title: localized("Equipment built around the show", "Equipo organizado alrededor del show"),
      intro: localized(
        "Professional audio rental in Bogotá for live music, theatre, corporate and broadcast productions: Behringer WING, Waves LV1 Classic, Midas DL32, StageGrid 4000, wireless microphones, PA and production tools. Equipment rental includes technical support for the supplied gear; operation, transport and setup are quoted separately.",
        "Alquiler de audio profesional en Bogotá para música en vivo, teatro, eventos corporativos y broadcast: Behringer WING, Waves LV1 Classic, Midas DL32, StageGrid 4000, micrófonos inalámbricos, PA y herramientas de producción. El alquiler incluye soporte técnico sobre los equipos suministrados; la operación, el transporte y el montaje se cotizan por separado."
      ),
      disclaimer: localized(
        "Listed rental prices do not include VAT and may be subject to change.",
        "Los precios de alquiler publicados no incluyen IVA y pueden estar sujetos a cambios."
      )
    },
    recommended: {
      eyebrow: localized("Recommended configurations", "Configuraciones recomendadas"),
      title: localized("A useful starting point — never a rigid package", "Un punto de partida útil, nunca un paquete rígido"),
      intro: localized(
        "Choose a starting package, then adjust it freely. Consoles and stage racks are independent selections and can be combined in the same rental.",
        "Elige un paquete como punto de partida y luego ajústalo libremente. Las consolas y los stage racks son selecciones independientes y pueden combinarse en el mismo alquiler."
      )
    },
    presets: {
      corporate: { kicker: localized("Up to 150 guests", "Hasta 150 personas"), title: localized("Corporate Event", "Evento Corporativo"), action: localized("Use as starting point", "Usar como punto de partida") },
      digital: { kicker: localized("FOH & stage I/O", "FOH e I/O de escenario"), title: localized("Digital Show Rig", "Sistema digital para show"), action: localized("Use as starting point", "Usar como punto de partida") },
      theater: { kicker: localized("Up to 6 headsets", "Hasta 6 headsets"), title: localized("Theater Wireless Rig", "Sistema Inalámbrico para Teatro"), action: localized("Use as starting point", "Usar como punto de partida") },
      livePro: { kicker: localized("Professional live music", "Música en vivo profesional"), title: localized("Live Show Pro", "Live Show Pro"), action: localized("Use as starting point", "Usar como punto de partida") },
      fohMonPro: { kicker: localized("FOH + MON professional rig", "Sistema profesional FOH + MON"), title: localized("FOH + MON Pro", "FOH + MON Pro"), action: localized("Use as starting point", "Usar como punto de partida") }
    },
    cartHint: {
      eyebrow: localized("Build your rental", "Arma tu alquiler"),
      body: localized(
        "Use the + and − controls on each equipment card. Your selection stays in the rental cart at the top right; open it whenever you are ready to add event details and send the request.",
        "Usa los controles + y − en cada tarjeta de equipo. Tu selección queda en el carrito de alquiler arriba a la derecha; ábrelo cuando quieras agregar los datos del evento y enviar la solicitud."
      )
    },
    groups: {
      consoles: localized("Consoles", "Consolas"),
      stageRacks: localized("Stage racks", "Racks de escenario"),
      wireless: localized("Wireless", "Inalámbricos"),
      pa: localized("PA System", "Sistema PA"),
      tools: localized("Production tools", "Herramientas de producción")
    },
    items: {
      wing: {
        title: localized("Behringer WING", "Behringer WING"),
        description: localized("Digital console for FOH, monitors and show control.", "Consola digital para FOH, monitores y control de show."),
        technicalNote: localized("Includes router and network switch. Standalone: 8 XLR inputs with phantom power, 8 aux inputs, 8 XLR outputs and 8 aux outputs.", "Incluye router y switch de red. Sin DL32: 8 entradas XLR con phantom, 8 entradas auxiliares, 8 salidas XLR y 8 salidas auxiliares."),
        image: { src: "assets/equipment/display/behringer-wing.webp", alt: "Behringer WING digital mixing console", width: 1200, height: 572, scale: 1 }
      },
      flow8: {
        title: localized("Behringer FLOW 8", "Behringer FLOW 8"),
        description: localized("Compact digital mixer for small events, speech and content playback.", "Mezclador digital compacto para eventos pequeños, voz y reproducción de contenido."),
        technicalNote: localized("Onboard I/O is intended for compact setups: 8 input channels; phantom power is available on mic inputs 1–2; CH 5/6 and 7/8 are paired stereo line inputs. The USB interface supports up to 10 recording tracks and 4 playback channels.", "El I/O integrado está pensado para montajes compactos: 8 canales de entrada; phantom disponible en las entradas de micrófono 1–2; CH 5/6 y 7/8 son entradas de línea estéreo emparejadas. La interfaz USB admite hasta 10 pistas de grabación y 4 canales de reproducción."),
        image: { src: "assets/equipment/display/behringer-flow-8.webp", alt: "Behringer FLOW 8 digital mixer", width: 1065, height: 733, scale: 1 }
      },
      lv1: {
        title: localized("LV1 Classic", "LV1 Classic"),
        description: localized("Professional live-music mixing system for concerts, touring workflows and demanding show production. Two units are available and can be rented individually or as a pair.", "Sistema profesional de mezcla para conciertos, giras y producción de shows de música en vivo de alta exigencia. Hay dos unidades disponibles y pueden alquilarse individualmente o en pareja."),
        technicalNote: localized("Standalone I/O: 16 inputs / 12 outputs. Standalone rate: $2,700,000 COP per unit / day. Bundle rate: LV1 Classic + 1 StageGrid 4000 = $3,000,000 COP per day. A second StageGrid 4000 adds $500,000 COP. Two LV1 units are available for professional live-music shows.", "I/O standalone: 16 entradas / 12 salidas. Tarifa por separado: $2.700.000 COP por unidad / día. Tarifa en bundle: LV1 Classic + 1 StageGrid 4000 = $3.000.000 COP por día. Un segundo StageGrid 4000 suma $500.000 COP. Hay dos unidades disponibles para shows profesionales de música en vivo."),
        image: { src: "assets/equipment/display/lv1-classic.webp", alt: "Waves LV1 Classic digital live mixing console", width: 431, height: 300, scale: 1 }
      },
      dl32: {
        title: localized("Midas DL32", "Midas DL32"),
        description: localized("Digital stagebox for remote I/O and flexible stage connectivity.", "Stagebox digital para I/O remoto y conectividad flexible en escenario."),
        technicalNote: localized("Includes professional-grade Cat6a EtherCON cabling: 2 × 45 m, 2 × 10 m, 4 × 3 m, plus 2 EtherCON couplers.", "Incluye cableado Cat6a EtherCON de grado profesional: 2 × 45 m, 2 × 10 m, 4 × 3 m y 2 acoples EtherCON."),
        image: { src: "assets/equipment/display/midas-dl32.webp", alt: "Midas DL32 digital stagebox", width: 1179, height: 491, scale: 1 }
      },
      stageGrid: {
        title: localized("StageGrid 4000", "StageGrid 4000"),
        description: localized("Professional stage I/O for concerts, touring and live-music productions that require robust high-channel-count infrastructure. Two units are available and can be rented individually or as a pair.", "I/O profesional de escenario para conciertos, giras y producciones de música en vivo que requieren infraestructura robusta y alta cantidad de canales. Hay dos unidades disponibles y pueden alquilarse individualmente o en pareja."),
        technicalNote: localized("Standalone rate: $500,000 COP per unit / day. When paired as the first StageGrid 4000 in an LV1 Classic bundle, the full package totals $3,000,000 COP per day. A second StageGrid 4000 adds $500,000 COP. Two units are available for professional live-music shows.", "Tarifa por separado: $500.000 COP por unidad / día. Cuando se usa como el primer StageGrid 4000 dentro de un bundle con LV1 Classic, el paquete completo cuesta $3.000.000 COP por día. Un segundo StageGrid 4000 suma $500.000 COP. Hay dos unidades disponibles para shows profesionales de música en vivo."),
        image: { src: "assets/equipment/display/stagegrid-4000.webp", alt: "Waves StageGrid 4000 professional stage I/O rack", width: 594, height: 325, scale: 1 }
      },
      handhelds: {
        title: localized("AKG WP-300", "AKG WP-300"),
        description: localized("Handheld wireless microphones for speakers, hosts and live vocals.", "Micrófonos inalámbricos de mano para conferencistas, presentadores y voz en vivo."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/display/akg-wp300.webp", alt: "AKG WP-300 handheld wireless microphone system", width: 1100, height: 733, scale: 1 }
      },
      headsets: {
        title: localized("Phenyx Pro PTU-71-2B", "Phenyx Pro PTU-71-2B"),
        description: localized("Wireless headset channels for theater, presentations and performers.", "Canales inalámbricos headset para teatro, presentaciones y performers."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/display/phenyx-ptu-71-2b.webp", alt: "Phenyx Pro PTU-71-2B wireless headset microphone kit", width: 1186, height: 800, scale: 1 }
      },
      pa: {
        title: localized("BetaThree BT-1500", "BetaThree BT-1500"),
        description: localized("Active column PA systems for corporate and social events of up to 150 guests, depending on the venue, program and acoustic conditions.", "Sistemas PA activos tipo columna para eventos corporativos y sociales de hasta 150 personas, según el espacio, el programa y las condiciones acústicas."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/beta-three-bt1500.webp", alt: "BetaThree BT-1500 active column PA system", width: 850, height: 1275, scale: 1 }
      },
      labeler: {
        title: localized("Event labeler", "Labeler para eventos"),
        description: localized("Includes one label cartridge. Additional cartridges are supplied by the client.", "Incluye un cartucho de etiquetas. Del segundo cartucho en adelante, corre por cuenta del cliente."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/display/event-labeler.webp", alt: "DYMO LetraTag event labeler with label cartridge", width: 374, height: 500, scale: 1 }
      },
      videoServer: {
        title: localized("Video server (gaming PC)", "Servidor de video (PC gamer)"),
        description: localized("High-performance computer for video playback and event content. Operator is not included. Streaming service is available and quoted separately. 30% discount from day two onward.", "Computador de alto rendimiento para playback de video y contenido de eventos. No incluye personal de operación. El servicio de streaming está disponible y se cotiza por separado. 30% de descuento desde el segundo día."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/display/video-server.webp", alt: "Gaming PC available as a video server", width: 380, height: 447, scale: 1 }
      },
      monitor: {
        title: localized("Portable monitor", "Monitor portátil"),
        description: localized("Compact portable display for production, playback or technical monitoring.", "Pantalla portátil compacta para producción, playback o monitoreo técnico."),
        technicalNote: localized("", ""),
        image: { src: "assets/equipment/display/portable-monitor.webp", alt: "ARZOPA 14-inch portable monitor", width: 528, height: 372, scale: 1 }
      }
    },
    sourcing: {
      eyebrow: localized("Individual equipment & sourcing", "Equipos individuales y sourcing"),
      title: localized("Need one item—or something outside this inventory?", "¿Necesitas un solo equipo o algo que no aparece en este inventario?"),
      body: localized("Every item can be quoted separately. Additional equipment that is not shown in this inventory can also be included in a custom quote.", "Cada equipo puede cotizarse por separado. El equipo adicional que no aparece en este inventario también puede incluirse en una cotización personalizada.")
    }
  },
  contact: {
    eyebrow: localized("Contact", "Contacto"),
    title: localized("Start a project", "Iniciar un proyecto"),
    body: localized("Tell me about the show, the space, or the deadline — I'll reply with next steps.", "Cuéntame sobre el show, el espacio o la fecha límite — te responderé con los próximos pasos."),
    form: {
      nameLabel: localized("Name", "Nombre"),
      emailLabel: localized("Email", "Correo"),
      messageLabel: localized("Message", "Mensaje"),
      buttonLabel: localized("Send Message", "Enviar Mensaje"),
      note: localized("Tell me about the project, timeline and what you need.", "Cuéntame sobre el proyecto, las fechas y lo que necesitas.")
    }
  }
};

const RENTAL_ITEM_IDS = Object.keys(PRESENTATION_SECTION_DEFAULTS.rental.items);
const RENTAL_PRESET_IDS = Object.keys(PRESENTATION_SECTION_DEFAULTS.rental.presets);
const RENTAL_GROUP_IDS = Object.keys(PRESENTATION_SECTION_DEFAULTS.rental.groups);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, max, allowEmpty = false) {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  if (!allowEmpty && !value.trim()) throw new Error(`${field} is required`);
  if (value.length > max) throw new Error(`${field} is too long`);
}

function requireLocalized(value, field, max, allowEmpty = false) {
  if (!isObject(value)) throw new Error(`${field} must contain en and es`);
  requireString(value.en, `${field}.en`, max, allowEmpty);
  requireString(value.es, `${field}.es`, max, allowEmpty);
}

function requireMediaSource(value, field) {
  requireString(value, field, 1000);
  const local = /^assets\/[A-Za-z0-9._/-]+$/.test(value);
  const r2 = /^https:\/\/media\.sdlive\.show\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value);
  if (!local && !r2) throw new Error(`${field} must use a first-party asset`);
}

function validateImage(image, field) {
  if (!isObject(image)) throw new Error(`${field} must be an object`);
  requireMediaSource(image.src, `${field}.src`);
  requireString(image.alt ?? "", `${field}.alt`, 240, true);
  const width = Number(image.width);
  const height = Number(image.height);
  const scale = Number(image.scale ?? 1);
  if (!Number.isInteger(width) || width < 1 || width > 5000) throw new Error(`${field}.width is invalid`);
  if (!Number.isInteger(height) || height < 1 || height > 5000) throw new Error(`${field}.height is invalid`);
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 1.8) throw new Error(`${field}.scale must be between 0.5 and 1.8`);
}

function requireExactKeys(object, expected, field) {
  if (!isObject(object)) throw new Error(`${field} must be an object`);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${field} must preserve the fixed production keys`);
  }
}

function validateRental(value) {
  requireExactKeys(value, ["heading", "recommended", "presets", "cartHint", "groups", "items", "sourcing"], "rental");
  for (const [key, max] of [["eyebrow", 120], ["title", 240], ["intro", 1400], ["disclaimer", 500]]) {
    requireLocalized(value.heading[key], `heading.${key}`, max);
  }
  requireLocalized(value.recommended.eyebrow, "recommended.eyebrow", 120);
  requireLocalized(value.recommended.title, "recommended.title", 240);
  requireLocalized(value.recommended.intro, "recommended.intro", 900);
  requireExactKeys(value.presets, RENTAL_PRESET_IDS, "presets");
  RENTAL_PRESET_IDS.forEach((id) => {
    requireLocalized(value.presets[id].kicker, `presets.${id}.kicker`, 160);
    requireLocalized(value.presets[id].title, `presets.${id}.title`, 180);
    requireLocalized(value.presets[id].action, `presets.${id}.action`, 120);
  });
  requireLocalized(value.cartHint.eyebrow, "cartHint.eyebrow", 120);
  requireLocalized(value.cartHint.body, "cartHint.body", 900);
  requireExactKeys(value.groups, RENTAL_GROUP_IDS, "groups");
  RENTAL_GROUP_IDS.forEach((id) => requireLocalized(value.groups[id], `groups.${id}`, 160));
  requireExactKeys(value.items, RENTAL_ITEM_IDS, "items");
  RENTAL_ITEM_IDS.forEach((id) => {
    const item = value.items[id];
    requireLocalized(item.title, `items.${id}.title`, 180);
    requireLocalized(item.description, `items.${id}.description`, 1200);
    requireLocalized(item.technicalNote, `items.${id}.technicalNote`, 1800, true);
    validateImage(item.image, `items.${id}.image`);
  });
  requireLocalized(value.sourcing.eyebrow, "sourcing.eyebrow", 160);
  requireLocalized(value.sourcing.title, "sourcing.title", 300);
  requireLocalized(value.sourcing.body, "sourcing.body", 900);
}

function validateContact(value) {
  requireExactKeys(value, ["eyebrow", "title", "body", "form"], "contact");
  requireLocalized(value.eyebrow, "eyebrow", 120);
  requireLocalized(value.title, "title", 240);
  requireLocalized(value.body, "body", 900);
  requireExactKeys(value.form, ["nameLabel", "emailLabel", "messageLabel", "buttonLabel", "note"], "contact.form");
  Object.entries(value.form).forEach(([key, localizedText]) => requireLocalized(localizedText, `form.${key}`, key === "note" ? 600 : 160));
}

export function validatePresentationSection(section, value) {
  if (!isObject(value)) throw new Error(`${section} content must be an object`);
  if (section === "rental") validateRental(value);
  else if (section === "contact") validateContact(value);
  else throw new Error(`Unsupported presentation section: ${section}`);
  return JSON.stringify(value);
}

export function clonePresentationDefault(section) {
  const value = PRESENTATION_SECTION_DEFAULTS[section];
  if (!value) throw new Error(`Unknown presentation section: ${section}`);
  return JSON.parse(JSON.stringify(value));
}

export { RENTAL_GROUP_IDS, RENTAL_ITEM_IDS, RENTAL_PRESET_IDS };
