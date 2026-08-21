export const CORE_SECTION_KEYS = {
  about: { section: "about", market: "all", route: "root" },
  services: { section: "services", market: "all", route: "root" },
  work: { section: "work", market: "all", route: "root" },
  international: { section: "international", market: "all", route: "root" }
};

export const CORE_SECTION_DEFAULTS = {
  about: {
    eyebrow: { en: "About", es: "Sobre mí" },
    title: {
      en: "One person. Two ways of listening.",
      es: "Una persona. Dos maneras de escuchar."
    },
    paragraphs: [
      {
        en: "I'm Samuel David Llano, an audio engineer, theatre sound designer and A1 with more than 10 years of experience working in sound and audio. My practice is centered on theatre, with an extensive track record across live production, broadcast, corporate AV, audio post and technical systems. I currently work with <strong>Sonolux Creative</strong> as an Associate Sound Designer while developing SD.Live across these fields.",
        es: "Soy Samuel David Llano, ingeniero de audio, diseñador de sonido teatral y A1, con más de 10 años de experiencia trabajando en sonido y audio. Mi práctica está enfocada en teatro, con una amplia trayectoria en producción en vivo, broadcast, AV corporativo, audio post y sistemas técnicos. Actualmente trabajo con <strong>Sonolux Creative</strong> como Diseñador de Sonido Asociado mientras desarrollo SD.Live en estos ámbitos."
      },
      {
        en: "My work sits between creative intention and real-time execution. As Production Stage Manager for <strong>V de Vinilo</strong> with Mediacoustix, I coordinated performers and technical teams, stage movement, cues and show flow, while supporting FOH and monitor workflows when needed.",
        es: "Mi trabajo se encuentra entre la intención creativa y la ejecución en tiempo real. Como Production Stage Manager de <strong>V de Vinilo</strong> con Mediacoustix, coordiné artistas y equipos técnicos, movimientos de escenario, cues y el flujo general del show, apoyando también los flujos de FOH y monitores cuando fue necesario."
      },
      {
        en: "At Magix Colombia I developed production-management, coordination and client-facing skills. Later, with Norwegian Cruise Line Holdings, I worked across Broadway- and West End-style entertainment, deepening my experience in high-performance audio and international production workflows.",
        es: "En Magix Colombia desarrollé habilidades de gestión de producción, coordinación y relación con clientes. Más adelante, en Norwegian Cruise Line Holdings, trabajé en entretenimiento al estilo Broadway y West End, ampliando mi experiencia en audio de alto desempeño y flujos de producción internacional."
      },
      {
        en: "As a dual national of Colombia and Spain, I bring a bilingual, international perspective to every project — combining technical precision, collaboration and a musician's ear.",
        es: "Como ciudadano de Colombia y España, aporto una perspectiva bilingüe e internacional a cada proyecto, combinando precisión técnica, colaboración y el oído de un músico."
      }
    ],
    image: {
      src: "assets/images/samuel-david-llano-live-production.webp",
      alt: {
        en: "Samuel David Llano working during a live production",
        es: "Samuel David Llano trabajando durante una producción en vivo"
      },
      width: 971,
      height: 1620,
      scale: 1
    }
  },
  services: {
    eyebrow: { en: "Services", es: "Servicios" },
    title: {
      en: "Sound design, systems and show operation",
      es: "Diseño sonoro, sistemas y operación de show"
    },
    filters: [
      { id: "all", label: { en: "All", es: "Todos" } },
      { id: "corporate", label: { en: "Corporate", es: "Corporativo" } },
      { id: "theatre", label: { en: "Theatre", es: "Teatro" } },
      { id: "broadcast", label: { en: "Broadcast", es: "Broadcast" } },
      { id: "social", label: { en: "Social", es: "Social" } }
    ],
    items: [
      {
        id: "sound-design-audio-post",
        title: { en: "Sound Design & Audio Post", es: "Sound Design y Audio Post" },
        description: {
          en: "Dialogue editing, effects, atmospheres, transitions and final mix for theatre, commercials and branded content.",
          es: "Edición de diálogo, efectos, atmósferas, transiciones y mezcla final para teatro, comerciales y branded content."
        },
        scopeNote: {
          en: "Theatre and AV sound design is quoted per project according to creative scope, production size, schedule and deliverables.",
          es: "El diseño sonoro para teatro y AV se cotiza por proyecto según el alcance creativo, el tamaño de la producción, las fechas y los entregables."
        },
        categories: ["theatre", "broadcast", "social"],
        capabilities: ["Dialogue Editing", "Foley & FX", "Atmospheres", "Final Mix"],
        market: "all",
        visible: true,
        pricing: null
      },
      {
        id: "live-production-audio",
        title: { en: "Live & Production Audio", es: "Audio en Vivo y de Producción" },
        description: {
          en: "FOH and monitor mixing, RF coordination and playback for theatre, musicals and live events.",
          es: "Mezcla de FOH y monitores, coordinación de RF y playback para teatro, musicales y eventos en vivo."
        },
        scopeNote: { en: "", es: "" },
        categories: ["theatre", "corporate"],
        capabilities: ["FOH / Monitors", "RF Coordination", "Playback"],
        market: "all",
        visible: true,
        pricing: {
          colombia: {
            label: { en: "$350.000 COP / day · service only", es: "$350.000 COP / día · solo servicio" },
            note: { en: "Equipment and setup are not included.", es: "No incluye equipos ni montaje." }
          },
          international: {
            label: { en: "Project-based quote", es: "Cotización según el proyecto" },
            note: { en: "Contact SD.Live to discuss the production and scope.", es: "Contacta a SD.Live para conversar sobre la producción y su alcance." }
          }
        }
      },
      {
        id: "show-control-playback",
        title: { en: "Show Control & Playback", es: "Show Control y Playback" },
        description: {
          en: "QLab programming, timecode sync and show control so cues fire the same way every performance.",
          es: "Programación en QLab, sincronía de timecode y show control para que los cues disparen igual en cada función."
        },
        scopeNote: { en: "", es: "" },
        categories: ["theatre"],
        capabilities: ["QLab", "Timecode", "Cue Systems"],
        market: "all",
        visible: true,
        pricing: null
      },
      {
        id: "system-design-integration",
        title: { en: "System Design & Integration", es: "Diseño de Sistemas e Integración" },
        description: {
          en: "Dante audio networking, console programming, system design and commissioning for venues and touring rigs.",
          es: "Redes de audio Dante, programación de consola, diseño de sistemas y commissioning para venues y rigs de gira."
        },
        scopeNote: { en: "", es: "" },
        categories: ["broadcast"],
        capabilities: ["Dante", "Console Programming", "Commissioning"],
        market: "all",
        visible: true,
        pricing: null
      },
      {
        id: "broadcast-content-audio",
        title: { en: "Broadcast & Content Audio", es: "Audio para Broadcast y Contenido" },
        description: {
          en: "Hybrid streaming, mix-minus routing and technical consulting for broadcast and remote productions.",
          es: "Streaming híbrido, ruteo mix-minus y consultoría técnica para producciones de broadcast y remotas."
        },
        scopeNote: { en: "", es: "" },
        categories: ["broadcast", "corporate", "social"],
        capabilities: ["Streaming", "Mix-Minus", "Technical Consulting"],
        market: "all",
        visible: true,
        pricing: null
      },
      {
        id: "equipment-rental-support",
        title: { en: "Equipment Rental & Technical Support", es: "Alquiler de Equipos y Soporte Técnico" },
        description: {
          en: "Local rental inventory in Colombia for corporate events, theatre and broadcast workflows, with technical support for the supplied equipment.",
          es: "Inventario de alquiler local en Colombia para eventos corporativos, teatro y flujos de broadcast, con soporte técnico sobre los equipos suministrados."
        },
        scopeNote: { en: "", es: "" },
        categories: ["corporate", "theatre", "broadcast"],
        capabilities: ["WING", "DL32", "Wireless", "PA"],
        market: "colombia",
        visible: true,
        pricing: null
      }
    ],
    detailLink: {
      label: {
        en: "Theatre sound design and audio post",
        es: "Audio para eventos corporativos, streaming y teatro en Bogotá"
      },
      href: {
        en: "theatre-sound-design-audio-post",
        es: "audio-eventos-streaming-teatro-bogota"
      }
    }
  },
  work: {
    eyebrow: { en: "Selected collaborations", es: "Colaboraciones seleccionadas" },
    title: {
      en: "Defined roles in real production contexts",
      es: "Roles definidos en contextos reales de producción"
    },
    intro: {
      en: "These credits describe the collaboration and responsibility accurately. Brand relationships shown elsewhere on the site are identified as work supported through the corresponding production partner.",
      es: "Estos créditos describen con precisión la colaboración y la responsabilidad. Las relaciones con marcas que aparecen en otras áreas del sitio se identifican como trabajo realizado a través del aliado de producción correspondiente."
    },
    items: [
      {
        id: "sonolux-international-workflows",
        role: { en: "Sonolux Creative · Associate Sound Designer", es: "Sonolux Creative · Diseñador de sonido asociado" },
        title: { en: "International show workflows", es: "Flujos de shows internacionales" },
        description: {
          en: "Associate sound-design work within Sonolux Creative's production workflow, connecting creative intent, playback and technical systems for live and cruise entertainment.",
          es: "Trabajo de diseño sonoro asociado dentro del flujo de producción de Sonolux Creative, conectando intención creativa, playback y sistemas técnicos para entretenimiento en vivo y de cruceros."
        },
        tags: ["Sound Design", "Show Systems"],
        image: { src: "assets/clients/sonolux-creative.png", alt: "Sonolux Creative", width: 800, height: 320, scale: 1, presentation: "logo" },
        cta: { label: { en: "Explore theatre sound design →", es: "Explorar diseño sonoro teatral →" }, href: { en: "theatre-sound-design-audio-post", es: "theatre-sound-design-audio-post" } },
        visible: true
      },
      {
        id: "wonderlust-broadcast-audio",
        role: { en: "Wonderlust · Broadcast Audio and Sound Design", es: "Wonderlust · Audio para broadcast y diseño sonoro" },
        title: { en: "Brand and corporate production audio", es: "Audio para marcas y producción corporativa" },
        description: {
          en: "Broadcast and sound-design work delivered through Wonderlust for branded and institutional production contexts, with a focus on clarity and format-specific delivery.",
          es: "Trabajo de broadcast y diseño sonoro realizado a través de Wonderlust para contextos de producción de marca e institucionales, con foco en claridad y ejecución según el formato."
        },
        tags: ["Broadcast", "Corporate AV"],
        image: { src: "assets/clients/wonderlust.png", alt: "Wonderlust", width: 800, height: 320, scale: 1, presentation: "logo" },
        cta: { label: { en: "Explore live and broadcast audio →", es: "Explorar audio en vivo y broadcast →" }, href: { en: "audio-eventos-streaming-teatro-bogota", es: "audio-eventos-streaming-teatro-bogota" } },
        visible: true
      },
      {
        id: "rent-2productores",
        role: { en: "2Productores · Collaboration", es: "2Productores · Colaboración" },
        title: { en: "RENT", es: "RENT" },
        description: {
          en: "A production collaboration combining console and stage-I/O rental, technical support and Associate Sound Designer responsibilities.",
          es: "Una colaboración de producción que combinó alquiler de consola e I/O de escenario, soporte técnico y responsabilidades como Diseñador de Sonido Asociado."
        },
        tags: ["Rental", "Associate Design"],
        image: { src: "assets/brands/2productores/rent.png", alt: "RENT — collaboration with 2Productores", width: 800, height: 320, scale: 1, presentation: "logo" },
        cta: { label: { en: "Explore rental systems →", es: "Explorar sistemas de alquiler →" }, href: { en: "alquiler-sonido-wing-midas-dl32-bogota", es: "alquiler-sonido-wing-midas-dl32-bogota" } },
        visible: true
      }
    ]
  },
  international: {
    eyebrow: { en: "International productions", es: "Producciones internacionales" },
    title: {
      en: "Sound design for theatre and cruise productions",
      es: "Diseño de sonido para teatro y producciones de cruceros"
    },
    body: {
      en: "Every international production is quoted around its creative scope, schedule and technical requirements. Flights, accommodation and per diem are discussed as part of the project—tell me what you are building and we will shape the right collaboration.",
      es: "Cada producción internacional se cotiza según su alcance creativo, calendario y necesidades técnicas. Los vuelos, el alojamiento y los viáticos se conversan como parte del proyecto: cuéntame qué estás creando y definimos la colaboración adecuada."
    },
    cta: {
      label: { en: "Discuss your project", es: "Hablemos de tu proyecto" },
      href: { en: "#contact", es: "#contact" }
    }
  }
};

const ALLOWED_SERVICE_CATEGORIES = new Set(["corporate", "theatre", "broadcast", "social"]);
const ALLOWED_MARKETS = new Set(["all", "colombia", "international"]);
const ALLOWED_PRESENTATIONS = new Set(["logo", "cover"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, maxLength, { allowEmpty = false } = {}) {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  if (!allowEmpty && !value.trim()) throw new Error(`${field} is required`);
  if (value.length > maxLength) throw new Error(`${field} is too long`);
}

function requireLocalized(value, field, maxLength, options = {}) {
  if (!isPlainObject(value)) throw new Error(`${field} must contain en and es`);
  requireString(value.en, `${field}.en`, maxLength, options);
  requireString(value.es, `${field}.es`, maxLength, options);
}

function requireId(value, field) {
  requireString(value, field, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) throw new Error(`${field} contains invalid characters`);
}

function requireMediaSource(value, field) {
  requireString(value, field, 1000);
  const local = /^assets\/[A-Za-z0-9._/-]+$/.test(value);
  const r2 = /^https:\/\/media\.sdlive\.show\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value);
  if (!local && !r2) throw new Error(`${field} must be a first-party asset or media.sdlive.show URL`);
}

function requireHref(value, field) {
  requireString(value, field, 500);
  if (!/^(?:#[-A-Za-z0-9_]+|\/?[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@%/-]*)$/.test(value)) {
    throw new Error(`${field} must be an internal SD.Live path or hash`);
  }
}

function requireScale(value, field) {
  const number = Number(value ?? 1);
  if (!Number.isFinite(number) || number < 0.5 || number > 1.8) throw new Error(`${field} must be between 0.5 and 1.8`);
}

function validateImage(image, field, { localizedAlt = false } = {}) {
  if (!isPlainObject(image)) throw new Error(`${field} must be an object`);
  requireMediaSource(image.src, `${field}.src`);
  if (localizedAlt) requireLocalized(image.alt, `${field}.alt`, 240, { allowEmpty: true });
  else requireString(image.alt ?? "", `${field}.alt`, 240, { allowEmpty: true });
  const width = Number(image.width);
  const height = Number(image.height);
  if (!Number.isInteger(width) || width < 1 || width > 6000) throw new Error(`${field}.width is invalid`);
  if (!Number.isInteger(height) || height < 1 || height > 6000) throw new Error(`${field}.height is invalid`);
  requireScale(image.scale ?? 1, `${field}.scale`);
}

function validateRichLocalized(value, field, maxLength) {
  requireLocalized(value, field, maxLength);
  for (const lang of ["en", "es"]) {
    const stripped = value[lang].replaceAll("<strong>", "").replaceAll("</strong>", "");
    if (/[<>]/.test(stripped)) throw new Error(`${field}.${lang} may only contain <strong> inline markup`);
  }
}

function validateAbout(value) {
  requireLocalized(value.eyebrow, "about.eyebrow", 100);
  requireLocalized(value.title, "about.title", 240);
  if (!Array.isArray(value.paragraphs) || value.paragraphs.length < 1 || value.paragraphs.length > 8) {
    throw new Error("about.paragraphs must contain between 1 and 8 paragraphs");
  }
  value.paragraphs.forEach((paragraph, index) => validateRichLocalized(paragraph, `about.paragraphs.${index}`, 3200));
  validateImage(value.image, "about.image", { localizedAlt: true });
}

function validateServices(value) {
  requireLocalized(value.eyebrow, "services.eyebrow", 100);
  requireLocalized(value.title, "services.title", 240);
  if (!Array.isArray(value.filters) || value.filters.length < 2 || value.filters.length > 8) throw new Error("services.filters is invalid");
  const filterIds = new Set();
  value.filters.forEach((filter, index) => {
    requireId(filter.id, `services.filters.${index}.id`);
    requireLocalized(filter.label, `services.filters.${index}.label`, 80);
    if (filterIds.has(filter.id)) throw new Error("services filter ids must be unique");
    filterIds.add(filter.id);
  });
  if (!filterIds.has("all")) throw new Error("services filters must include all");
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 16) throw new Error("services.items is invalid");
  const ids = new Set();
  value.items.forEach((item, index) => {
    const field = `services.items.${index}`;
    requireId(item.id, `${field}.id`);
    if (ids.has(item.id)) throw new Error("service ids must be unique");
    ids.add(item.id);
    requireLocalized(item.title, `${field}.title`, 180);
    requireLocalized(item.description, `${field}.description`, 1800);
    requireLocalized(item.scopeNote ?? { en: "", es: "" }, `${field}.scopeNote`, 1200, { allowEmpty: true });
    if (!Array.isArray(item.categories) || item.categories.length < 1 || item.categories.some((category) => !ALLOWED_SERVICE_CATEGORIES.has(category))) throw new Error(`${field}.categories is invalid`);
    if (!Array.isArray(item.capabilities) || item.capabilities.length < 1 || item.capabilities.length > 8) throw new Error(`${field}.capabilities is invalid`);
    item.capabilities.forEach((capability, capIndex) => requireString(capability, `${field}.capabilities.${capIndex}`, 100));
    if (!ALLOWED_MARKETS.has(item.market)) throw new Error(`${field}.market is invalid`);
    if (typeof item.visible !== "boolean") throw new Error(`${field}.visible must be boolean`);
    if (item.pricing != null) {
      if (!isPlainObject(item.pricing)) throw new Error(`${field}.pricing must be an object or null`);
      for (const market of ["colombia", "international"]) {
        if (item.pricing[market] == null) continue;
        requireLocalized(item.pricing[market].label, `${field}.pricing.${market}.label`, 300, { allowEmpty: true });
        requireLocalized(item.pricing[market].note, `${field}.pricing.${market}.note`, 500, { allowEmpty: true });
      }
    }
  });
  if (!value.items.some((item) => item.visible)) throw new Error("At least one service must remain visible");
  requireLocalized(value.detailLink.label, "services.detailLink.label", 180);
  requireHref(value.detailLink.href.en, "services.detailLink.href.en");
  requireHref(value.detailLink.href.es, "services.detailLink.href.es");
}

function validateWork(value) {
  requireLocalized(value.eyebrow, "work.eyebrow", 100);
  requireLocalized(value.title, "work.title", 240);
  requireLocalized(value.intro, "work.intro", 1800);
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 18) throw new Error("work.items is invalid");
  const ids = new Set();
  value.items.forEach((item, index) => {
    const field = `work.items.${index}`;
    requireId(item.id, `${field}.id`);
    if (ids.has(item.id)) throw new Error("work ids must be unique");
    ids.add(item.id);
    requireLocalized(item.role, `${field}.role`, 240);
    requireLocalized(item.title, `${field}.title`, 240);
    requireLocalized(item.description, `${field}.description`, 2200);
    if (!Array.isArray(item.tags) || item.tags.length < 1 || item.tags.length > 8) throw new Error(`${field}.tags is invalid`);
    item.tags.forEach((tag, tagIndex) => requireString(tag, `${field}.tags.${tagIndex}`, 80));
    validateImage(item.image, `${field}.image`);
    if (!ALLOWED_PRESENTATIONS.has(item.image.presentation)) throw new Error(`${field}.image.presentation is invalid`);
    requireLocalized(item.cta.label, `${field}.cta.label`, 180);
    requireHref(item.cta.href.en, `${field}.cta.href.en`);
    requireHref(item.cta.href.es, `${field}.cta.href.es`);
    if (typeof item.visible !== "boolean") throw new Error(`${field}.visible must be boolean`);
  });
  if (!value.items.some((item) => item.visible)) throw new Error("At least one work item must remain visible");
}

function validateInternational(value) {
  requireLocalized(value.eyebrow, "international.eyebrow", 100);
  requireLocalized(value.title, "international.title", 260);
  requireLocalized(value.body, "international.body", 2200);
  requireLocalized(value.cta.label, "international.cta.label", 180);
  requireHref(value.cta.href.en, "international.cta.href.en");
  requireHref(value.cta.href.es, "international.cta.href.es");
}

export function cloneCoreSectionDefault(section) {
  const value = CORE_SECTION_DEFAULTS[section];
  if (!value) throw new Error(`Unknown core section: ${section}`);
  return JSON.parse(JSON.stringify(value));
}

export function validateCoreSectionDraft(section, value) {
  if (!CORE_SECTION_KEYS[section]) throw new Error(`Unknown core section: ${section}`);
  if (!isPlainObject(value)) throw new Error(`${section} content must be an object`);
  if (section === "about") validateAbout(value);
  else if (section === "services") validateServices(value);
  else if (section === "work") validateWork(value);
  else validateInternational(value);
  return JSON.stringify(value);
}
