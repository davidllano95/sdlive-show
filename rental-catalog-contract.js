export const RENTAL_CATALOG_CONTRACT_VERSION = "rental-catalog-v1";

export const RENTAL_ITEM_CATALOG = Object.freeze({
  wing: Object.freeze({
    type: "quantity",
    maxQuantity: 1,
    label: "Behringer WING",
    aliases: Object.freeze(["wing", "behringer wing", "consola wing"])
  }),
  flow8: Object.freeze({
    type: "quantity",
    maxQuantity: 1,
    label: "Behringer FLOW 8",
    aliases: Object.freeze(["flow 8", "flow8", "behringer flow 8", "behringer flow8"])
  }),
  lv1: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Waves LV1 Classic",
    aliases: Object.freeze(["lv1", "lv1 classic", "waves lv1", "waves lv1 classic"])
  }),
  dl32: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Midas DL32",
    aliases: Object.freeze(["dl32", "midas dl32"])
  }),
  stageGrid: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "StageGrid 4000",
    aliases: Object.freeze(["stagegrid", "stagegrid 4000", "waves stagegrid", "waves stagegrid 4000"])
  }),
  handhelds: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Wireless handheld microphones",
    aliases: Object.freeze(["handheld", "handheld mic", "handheld microphone", "wireless handheld", "wireless handheld mic", "microfono inalambrico de mano", "microfonos inalambricos de mano"])
  }),
  headsets: Object.freeze({
    type: "quantity",
    maxQuantity: 6,
    label: "Wireless headset microphones",
    aliases: Object.freeze(["headset", "headset mic", "headset microphone", "wireless headset", "wireless headset mic", "diadema", "microfono diadema", "microfonos diadema"])
  }),
  pa: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "PA",
    aliases: Object.freeze(["pa", "pa system", "sistema pa", "parlante pa", "parlantes pa"])
  }),
  labeler: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Labeler",
    aliases: Object.freeze(["labeler", "label printer", "etiquetadora", "impresora de etiquetas"])
  }),
  videoServer: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Video server",
    aliases: Object.freeze(["video server", "servidor de video", "pc gamer", "gaming pc"])
  }),
  monitor: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Portable monitor",
    aliases: Object.freeze(["portable monitor", "monitor portatil", "monitor portable"])
  })
});

export const RENTAL_SERVICE_CATALOG = Object.freeze({
  engineering: Object.freeze({ label: "Sound engineering", aliases: Object.freeze(["engineering", "sound engineering", "sound engineer", "audio engineer", "ingenieria de sonido", "ingeniero de sonido"]) }),
  streaming: Object.freeze({ label: "Streaming", aliases: Object.freeze(["streaming", "streaming service", "servicio de streaming"]) }),
  delivery: Object.freeze({ label: "Delivery", aliases: Object.freeze(["delivery", "delivery service", "entrega", "transporte"]) })
});

export const RENTAL_ITEM_LIMITS = Object.freeze(Object.fromEntries(Object.entries(RENTAL_ITEM_CATALOG).map(([key, entry]) => [key, entry.maxQuantity])));
export const RENTAL_ITEM_KEYS = Object.freeze(Object.keys(RENTAL_ITEM_CATALOG));
export const RENTAL_SERVICE_KEYS = Object.freeze(Object.keys(RENTAL_SERVICE_CATALOG));

export function rentalCatalogPublicMetadata() {
  return {
    version: RENTAL_CATALOG_CONTRACT_VERSION,
    items: Object.entries(RENTAL_ITEM_CATALOG).map(([key, entry]) => ({ key, label: entry.label, type: entry.type, maxQuantity: entry.maxQuantity })),
    services: Object.entries(RENTAL_SERVICE_CATALOG).map(([key, entry]) => ({ key, label: entry.label }))
  };
}
