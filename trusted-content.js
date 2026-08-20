export const TRUSTED_KEY = {
  section: "trusted",
  market: "all",
  route: "root"
};

export const TRUSTED_DEFAULT_CONTENT = {
  title: {
    en: "Trusted by",
    es: "Con la confianza de"
  },
  clients: [
    {
      id: "sonolux",
      name: "Sonolux Creative",
      role: {
        en: "Associate Sound Designer",
        es: "Diseñador de sonido asociado"
      },
      cardClass: "client-strip-card--primary",
      logo: {
        src: "assets/clients/sonolux-creative.png",
        alt: "Sonolux Creative",
        className: "client-logo--sonolux",
        width: 800,
        height: 320
      },
      reveal: {
        id: "sonoluxSupportedBrands",
        className: "",
        label: {
          en: "Brands supported through Sonolux",
          es: "Marcas atendidas a través de Sonolux"
        },
        layoutClass: "",
        items: [
          {
            type: "logo",
            src: "assets/brands/ncl.png",
            alt: "Norwegian Cruise Line",
            className: "",
            tileClass: "",
            width: 800,
            height: 240
          },
          {
            type: "logo",
            src: "assets/brands/regent-seven-seas.png",
            alt: "Regent Seven Seas Cruises",
            className: "",
            tileClass: "",
            width: 800,
            height: 240
          },
          {
            type: "logo",
            src: "assets/brands/oceania-cruises.png",
            alt: "Oceania Cruises",
            className: "supported-reveal-logo--oceania",
            tileClass: "",
            width: 800,
            height: 240
          }
        ]
      }
    },
    {
      id: "wonderlust",
      name: "Wonderlust",
      role: {
        en: "Broadcast Audio and Sound Design",
        es: "Audio para broadcast y diseño de sonido"
      },
      cardClass: "client-strip-card--secondary",
      logo: {
        src: "assets/clients/wonderlust.png",
        alt: "Wonderlust",
        className: "",
        width: 800,
        height: 320
      },
      reveal: {
        id: "wonderlustSupportedBrands",
        className: "supported-reveal--wide",
        label: {
          en: "Brands supported through Wonderlust",
          es: "Marcas atendidas a través de Wonderlust"
        },
        layoutClass: "supported-reveal-logos--wonderlust",
        items: [
          { type: "logo", src: "assets/brands/wonderlust/coca-cola-femsa.png", alt: "Coca-Cola FEMSA", className: "", tileClass: "supported-brand-tile--featured", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/zeiss.png", alt: "ZEISS", className: "", tileClass: "supported-brand-tile--featured", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/ramo.png", alt: "Ramo", className: "", tileClass: "supported-brand-tile--featured", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/anda.png", alt: "ANDA", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/buscapina.png", alt: "Buscapina", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/terpel.png", alt: "Terpel", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/uniminuto.png", alt: "UNIMINUTO", className: "", tileClass: "supported-brand-tile--dark", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wonderlust/porkcolombia.png", alt: "Porkcolombia", className: "", tileClass: "", width: 800, height: 240 }
        ]
      }
    },
    {
      id: "trebolm",
      name: "TrebolM",
      role: {
        en: "Stage and Associate Sound Designer",
        es: "Escenario y diseñador de sonido asociado"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/trebolm-studio.png",
        alt: "TrebolM",
        className: "client-logo--purple",
        width: 800,
        height: 320
      },
      reveal: {
        id: "trebolmSupportedBrands",
        className: "supported-reveal--trebolm",
        label: {
          en: "Brands supported through TrebolM",
          es: "Marcas atendidas a través de TrebolM"
        },
        layoutClass: "supported-reveal-logos--trebolm",
        items: [
          { type: "logo", src: "assets/brands/trebolm/universidad-sergio-arboleda.png", alt: "Universidad Sergio Arboleda — Escuela de Artes y Creación", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/trebolm/cast.png", alt: "CAST", className: "", tileClass: "", width: 800, height: 240 }
        ]
      }
    },
    {
      id: "2productores",
      name: "2Productores",
      role: {
        en: "Rental, Technical Support and Associate Sound Designer",
        es: "Alquiler, soporte técnico y diseñador de sonido asociado"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/2productores.png",
        alt: "2Productores",
        className: "client-logo--invert",
        width: 800,
        height: 320
      },
      reveal: {
        id: "twoProductoresCollaborations",
        className: "supported-reveal--collaboration",
        label: {
          en: "Collaborations with 2Productores",
          es: "Colaboraciones con 2Productores"
        },
        layoutClass: "",
        items: [
          {
            type: "collaboration",
            image: {
              src: "assets/brands/2productores/rent.png",
              alt: "RENT",
              className: "",
              width: 800,
              height: 320
            },
            title: "RENT",
            lines: [
              {
                en: "Audio rental & technical support",
                es: "Alquiler y soporte de audio"
              },
              {
                en: "Associate Sound Designer",
                es: "Diseñador de sonido asociado"
              }
            ]
          }
        ]
      }
    },
    {
      id: "wlive",
      name: "WLive",
      role: {
        en: "Broadcast and Live Audio",
        es: "Broadcast y audio en vivo"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/wlive.png",
        alt: "WLive",
        className: "client-logo--wlive",
        width: 800,
        height: 320
      },
      reveal: {
        id: "wliveSupportedBrands",
        className: "supported-reveal--wide",
        label: {
          en: "Brands supported through WLive",
          es: "Marcas atendidas a través de WLive"
        },
        layoutClass: "supported-reveal-logos--wlive",
        items: [
          { type: "logo", src: "assets/brands/wlive/lilly-mounjaro.png", alt: "Lilly and Mounjaro", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wlive/wobi.png", alt: "WOBI — Inspiring Ideas", className: "", tileClass: "", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/wlive/lr.png", alt: "LR", className: "supported-reveal-logo--lr", tileClass: "", width: 800, height: 240 }
        ]
      }
    },
    {
      id: "misi",
      name: "Misi Producciones",
      role: {
        en: "Sound Designer and A1",
        es: "Diseñador de sonido y A1"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/misi-producciones.png",
        alt: "Misi Producciones",
        className: "",
        width: 800,
        height: 320
      },
      reveal: {
        id: "misiSupportedBrands",
        className: "supported-reveal--wide",
        label: {
          en: "Brands supported through Misi",
          es: "Marcas atendidas a través de Misi"
        },
        layoutClass: "supported-reveal-logos--misi",
        items: [
          { type: "logo", src: "assets/brands/misi/corferias.png", alt: "Corferias", className: "", tileClass: "supported-brand-tile--misi-corferias", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/misi/colegio-colombo-britanico-cali.png", alt: "Colegio Colombo Británico Cali", className: "", tileClass: "supported-brand-tile--misi-college", width: 800, height: 240 },
          { type: "logo", src: "assets/brands/misi/facrea-universidad-del-rosario.png", alt: "FaCrea y Universidad del Rosario", className: "", tileClass: "supported-brand-tile--misi-pair", width: 800, height: 240 }
        ]
      }
    },
    {
      id: "en-clave-de-broadway",
      name: "En Clave de Broadway",
      role: {
        en: "Musical theatre concert",
        es: "Concierto de musicales"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/en-clave-de-broadway.png",
        alt: "En Clave de Broadway",
        className: "client-logo--broadway",
        width: 1000,
        height: 400
      },
      reveal: null
    },
    {
      id: "magix-event-design",
      name: "Magix Event Design",
      role: {
        en: "Event design and AV production",
        es: "Diseño de eventos y producción AV"
      },
      cardClass: "",
      logo: {
        src: "assets/clients/magix-event-design.png",
        alt: "Magix Event Design",
        className: "client-logo--magix",
        width: 1000,
        height: 400
      },
      reveal: null
    },
    {
      id: "morpho",
      name: "Morpho Colectivo Escénico",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/morpho-colectivo-escenico.png",
        alt: "Morpho Colectivo Escénico",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "tras-bambalinas",
      name: "Tras Bambalinas",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/tras-bambalinas.png",
        alt: "Tras Bambalinas",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "soy-gardel",
      name: "Soy Gardel",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/soy-gardel.png",
        alt: "Soy Gardel",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "awake-audio",
      name: "Awake Audio",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/awake-audio.png",
        alt: "Awake Architectural Acoustics",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "mediacoustix",
      name: "Mediacoustix",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/mediacoustix.png",
        alt: "Mediacoustix",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "fiav",
      name: "FIAV",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/fiav.png",
        alt: "FIAV — Festival Internacional de Artes Vivas",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    },
    {
      id: "delia",
      name: "Delia",
      role: { en: "", es: "" },
      cardClass: "",
      logo: {
        src: "assets/clients/delia.png",
        alt: "Delia — Centro Nacional de las Artes Delia Zapata Olivella",
        className: "",
        width: 800,
        height: 320
      },
      reveal: null
    }
  ]
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, maxLength, { allowEmpty = false } = {}) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  if (!allowEmpty && !value.trim()) {
    throw new Error(`${field} is required`);
  }

  if (value.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
}

function requireLocalized(value, field, maxLength, options = {}) {
  if (!isPlainObject(value)) {
    throw new Error(`${field} must contain en and es`);
  }

  requireString(value.en, `${field}.en`, maxLength, options);
  requireString(value.es, `${field}.es`, maxLength, options);
}

function requireClassList(value, field) {
  requireString(value, field, 240, { allowEmpty: true });

  if (value && !/^[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*$/.test(value)) {
    throw new Error(`${field} contains invalid CSS classes`);
  }
}

function requireId(value, field) {
  requireString(value, field, 100);

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${field} contains invalid characters`);
  }
}

function requireAssetPath(value, field, { allowEmpty = false } = {}) {
  requireString(value, field, 500, { allowEmpty });

  if (!value && allowEmpty) return;

  if (!/^assets\/[A-Za-z0-9._/-]+$/.test(value)) {
    throw new Error(`${field} must be an internal assets/ path`);
  }
}

function requireDimension(value, field, fallback = 800) {
  const number = Number(value ?? fallback);

  if (!Number.isInteger(number) || number < 1 || number > 5000) {
    throw new Error(`${field} must be an integer between 1 and 5000`);
  }
}

function validateImage(image, field, { allowEmptySrc = false } = {}) {
  if (!isPlainObject(image)) {
    throw new Error(`${field} must be an object`);
  }

  requireAssetPath(image.src ?? "", `${field}.src`, { allowEmpty: allowEmptySrc });
  requireString(image.alt ?? "", `${field}.alt`, 240, { allowEmpty: true });
  requireClassList(image.className ?? "", `${field}.className`);
  requireDimension(image.width, `${field}.width`);
  requireDimension(image.height, `${field}.height`, 320);
}

export function cloneTrustedDefault() {
  return JSON.parse(JSON.stringify(TRUSTED_DEFAULT_CONTENT));
}

export function validateTrustedDraft(draft) {
  if (!isPlainObject(draft)) {
    throw new Error("draft must be an object");
  }

  requireLocalized(draft.title, "title", 160);

  if (!Array.isArray(draft.clients) || draft.clients.length < 1 || draft.clients.length > 40) {
    throw new Error("clients must contain between 1 and 40 items");
  }

  const ids = new Set();
  const revealIds = new Set();

  draft.clients.forEach((client, clientIndex) => {
    const field = `clients[${clientIndex}]`;

    if (!isPlainObject(client)) {
      throw new Error(`${field} must be an object`);
    }

    requireId(client.id, `${field}.id`);

    if (ids.has(client.id)) {
      throw new Error(`${field}.id must be unique`);
    }
    ids.add(client.id);

    requireString(client.name, `${field}.name`, 160);
    requireLocalized(client.role, `${field}.role`, 320, { allowEmpty: true });
    requireClassList(client.cardClass ?? "", `${field}.cardClass`);
    validateImage(client.logo, `${field}.logo`, { allowEmptySrc: true });

    if (client.reveal == null) return;

    const reveal = client.reveal;
    if (!isPlainObject(reveal)) {
      throw new Error(`${field}.reveal must be an object or null`);
    }

    requireId(reveal.id, `${field}.reveal.id`);
    if (revealIds.has(reveal.id)) {
      throw new Error(`${field}.reveal.id must be unique`);
    }
    revealIds.add(reveal.id);

    requireClassList(reveal.className ?? "", `${field}.reveal.className`);
    requireLocalized(reveal.label, `${field}.reveal.label`, 240);
    requireClassList(reveal.layoutClass ?? "", `${field}.reveal.layoutClass`);

    if (!Array.isArray(reveal.items) || reveal.items.length < 1 || reveal.items.length > 30) {
      throw new Error(`${field}.reveal.items must contain between 1 and 30 items`);
    }

    reveal.items.forEach((item, itemIndex) => {
      const itemField = `${field}.reveal.items[${itemIndex}]`;

      if (!isPlainObject(item)) {
        throw new Error(`${itemField} must be an object`);
      }

      if (item.type === "logo") {
        requireAssetPath(item.src ?? "", `${itemField}.src`, { allowEmpty: true });
        requireString(item.alt ?? "", `${itemField}.alt`, 240, { allowEmpty: true });
        requireClassList(item.className ?? "", `${itemField}.className`);
        requireClassList(item.tileClass ?? "", `${itemField}.tileClass`);
        requireDimension(item.width, `${itemField}.width`);
        requireDimension(item.height, `${itemField}.height`, 240);
        return;
      }

      if (item.type === "collaboration") {
        validateImage(item.image, `${itemField}.image`, { allowEmptySrc: true });
        requireString(item.title, `${itemField}.title`, 160);

        if (!Array.isArray(item.lines) || item.lines.length < 1 || item.lines.length > 4) {
          throw new Error(`${itemField}.lines must contain between 1 and 4 items`);
        }

        item.lines.forEach((line, lineIndex) => {
          requireLocalized(line, `${itemField}.lines[${lineIndex}]`, 240);
        });
        return;
      }

      throw new Error(`${itemField}.type is invalid`);
    });
  });

  const serialized = JSON.stringify(draft);
  if (serialized.length > 55000) {
    throw new Error("Trusted By draft is too large");
  }

  return serialized;
}
