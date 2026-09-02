import { LEAD_CORE_SERVICE_CATEGORIES } from "./lead-core.js";

export const ASSISTANT_KNOWLEDGE_VERSION = "assistant-approved-knowledge-v1";

const SOURCE_PATHS = Object.freeze({
  home: "index.html",
  theatre: "theatre-sound-design-audio-post.html",
  bogota: "audio-eventos-streaming-teatro-bogota.html",
  rental: "alquiler-sonido-wing-midas-dl32-bogota.html"
});

const KNOWLEDGE = Object.freeze({
  live: {
    label: { en: "Live & Production Audio", es: "Audio en Vivo y de Producción" },
    summary: {
      en: "FOH and monitor mixing, RF coordination and playback for theatre, musicals and live events.",
      es: "Mezcla de FOH y monitores, coordinación de RF y playback para teatro, musicales y eventos en vivo."
    },
    claims: [
      { id: "live.foh_monitors", en: "FOH and monitor mixing", es: "Mezcla de FOH y monitores" },
      { id: "live.rf", en: "RF coordination", es: "Coordinación de RF" },
      { id: "live.playback", en: "Playback operation", es: "Operación de playback" },
      { id: "live.corporate", en: "Audio operation for corporate and hybrid events", es: "Operación de audio para eventos corporativos e híbridos" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.bogota]
  },
  theatre: {
    label: { en: "Theatre Audio", es: "Audio para Teatro" },
    summary: {
      en: "Theatre work can connect sound design, playback, show control, system programming, rehearsals and live operation around the production.",
      es: "El trabajo teatral puede conectar diseño sonoro, playback, show control, programación de sistemas, ensayos y operación en vivo alrededor de la producción."
    },
    claims: [
      { id: "theatre.playback_qlab", en: "Playback design and QLab programming", es: "Diseño de playback y programación en QLab" },
      { id: "theatre.show_control", en: "Cue workflows and show control", es: "Flujos de cues y show control" },
      { id: "theatre.system_console", en: "System and console programming", es: "Programación de sistemas y consolas" },
      { id: "theatre.rf_foh_monitors", en: "RF, FOH and monitor workflows", es: "Flujos de RF, FOH y monitores" },
      { id: "theatre.rehearsal_handoff", en: "Rehearsal support, documentation and technical handoff", es: "Soporte de ensayos, documentación y handoff técnico" },
      { id: "theatre.remote_onsite", en: "Remote preparation can be combined with on-site rehearsals and production support", es: "La preparación remota puede combinarse con ensayos y soporte de producción en sitio" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.theatre, SOURCE_PATHS.bogota]
  },
  sound_design: {
    label: { en: "Sound Design & Audio Post", es: "Sound Design y Audio Post" },
    summary: {
      en: "Dialogue editing, effects, atmospheres, transitions and final mix for theatre, commercials and branded content.",
      es: "Edición de diálogo, efectos, atmósferas, transiciones y mezcla final para teatro, comerciales y branded content."
    },
    claims: [
      { id: "sound_design.dialogue", en: "Dialogue editing and cleanup", es: "Edición y limpieza de diálogo" },
      { id: "sound_design.foley_fx", en: "Foley and effects editing", es: "Edición de Foley y efectos" },
      { id: "sound_design.atmospheres", en: "Atmosphere and ambience editing", es: "Edición de atmósferas y ambientes" },
      { id: "sound_design.transitions", en: "Sound effects and transitions", es: "Efectos de sonido y transiciones" },
      { id: "sound_design.final_mix", en: "Final mix and deliverables", es: "Mezcla final y entregables" },
      { id: "sound_design.theatre", en: "Creative and technical sound design for theatre", es: "Diseño sonoro creativo y técnico para teatro" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.theatre]
  },
  systems: {
    label: { en: "System Design & Integration", es: "Diseño de Sistemas e Integración" },
    summary: {
      en: "Dante audio networking, console programming, system design and commissioning for venues and touring rigs.",
      es: "Redes de audio Dante, programación de consola, diseño de sistemas y commissioning para venues y rigs de gira."
    },
    claims: [
      { id: "systems.dante", en: "Dante audio networking", es: "Redes de audio Dante" },
      { id: "systems.console", en: "Console programming", es: "Programación de consola" },
      { id: "systems.design", en: "Audio system design", es: "Diseño de sistemas de audio" },
      { id: "systems.commissioning", en: "System commissioning", es: "Commissioning de sistemas" },
      { id: "systems.show_control", en: "QLab, timecode and cue-system workflows", es: "Flujos de QLab, timecode y sistemas de cues" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.theatre]
  },
  rental: {
    label: { en: "Equipment Rental & Technical Support", es: "Alquiler de Equipos y Soporte Técnico" },
    summary: {
      en: "Local rental inventory in Bogotá supports live, theatre, broadcast and production workflows, with technical support for supplied equipment.",
      es: "El inventario de alquiler local en Bogotá apoya flujos de trabajo en vivo, teatro, broadcast y producción, con soporte técnico sobre los equipos suministrados."
    },
    claims: [
      { id: "rental.lv1", en: "Waves LV1 Classic is listed in the Bogotá rental inventory", es: "Waves LV1 Classic figura en el inventario de alquiler de Bogotá" },
      { id: "rental.stagegrid", en: "StageGrid 4000 is listed in the Bogotá rental inventory", es: "StageGrid 4000 figura en el inventario de alquiler de Bogotá" },
      { id: "rental.wing", en: "Behringer WING is listed in the Bogotá rental inventory", es: "Behringer WING figura en el inventario de alquiler de Bogotá" },
      { id: "rental.dl32", en: "Midas DL32 is listed in the Bogotá rental inventory", es: "Midas DL32 figura en el inventario de alquiler de Bogotá" },
      { id: "rental.wireless", en: "Wireless systems are listed in the Bogotá rental inventory", es: "Los sistemas inalámbricos figuran en el inventario de alquiler de Bogotá" },
      { id: "rental.pa", en: "PA equipment is listed in the Bogotá rental inventory", es: "Equipos de PA figuran en el inventario de alquiler de Bogotá" },
      { id: "rental.support", en: "Technical support is offered for supplied rental equipment", es: "Se ofrece soporte técnico sobre los equipos de alquiler suministrados" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.rental]
  },
  other: {
    label: { en: "Broadcast & Other Audio", es: "Broadcast y Otros Servicios de Audio" },
    summary: {
      en: "SD.Live also supports broadcast, remote and hybrid productions; requests outside the main categories should be handed off for scope confirmation.",
      es: "SD.Live también trabaja con producciones de broadcast, remotas e híbridas; las solicitudes fuera de las categorías principales deben pasar a revisión para confirmar alcance."
    },
    claims: [
      { id: "other.streaming", en: "Hybrid streaming audio workflows", es: "Flujos de audio para streaming híbrido" },
      { id: "other.mix_minus", en: "Mix-minus routing and remote returns", es: "Ruteo mix-minus y retornos remotos" },
      { id: "other.broadcast", en: "Audio support for broadcast and remote productions", es: "Soporte de audio para producciones de broadcast y remotas" },
      { id: "other.consulting", en: "Technical audio consulting", es: "Consultoría técnica de audio" }
    ],
    sourcePaths: [SOURCE_PATHS.home, SOURCE_PATHS.bogota]
  }
});

const CATEGORY_SET = new Set(LEAD_CORE_SERVICE_CATEGORIES);

function safeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "es" ? "es" : "en";
}

function categoryValue(value) {
  const category = String(value || "").trim().toLowerCase();
  if (!CATEGORY_SET.has(category) || !KNOWLEDGE[category]) {
    throw new Error("Assistant knowledge category is invalid");
  }
  return category;
}

function localizeEntry(entry, language) {
  const lang = safeLanguage(language);
  return {
    version: ASSISTANT_KNOWLEDGE_VERSION,
    serviceCategory: entry.serviceCategory,
    label: entry.label[lang],
    summary: entry.summary[lang],
    approvedClaims: entry.claims.map((claim) => ({
      id: claim.id,
      text: claim[lang]
    })),
    sourcePaths: [...entry.sourcePaths],
    guardrails: {
      mayStateCurrentAvailability: false,
      mayStateRentalItemAvailability: false,
      mayQuoteOrNegotiateCommercialTerms: false,
      mayInventCapabilities: false,
      requiresDeterministicAvailabilityToolForCurrentStatus: true,
      requiresDeterministicRentalToolForInventoryAvailability: true
    }
  };
}

export function getApprovedAssistantKnowledge(serviceCategory, language = "en") {
  const category = categoryValue(serviceCategory);
  return localizeEntry({
    ...KNOWLEDGE[category],
    serviceCategory: category
  }, language);
}

export function getApprovedAssistantClaim(serviceCategory, claimId, language = "en") {
  const category = categoryValue(serviceCategory);
  const id = String(claimId || "").trim();
  const claim = KNOWLEDGE[category].claims.find((item) => item.id === id);
  if (!claim) return null;
  return {
    id: claim.id,
    serviceCategory: category,
    text: claim[safeLanguage(language)],
    sourcePaths: [...KNOWLEDGE[category].sourcePaths]
  };
}

export function approvedAssistantKnowledgeContext(language = "en") {
  return LEAD_CORE_SERVICE_CATEGORIES.map((category) =>
    getApprovedAssistantKnowledge(category, language)
  );
}
