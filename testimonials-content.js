export const TESTIMONIALS_KEY = {
  section: "testimonials",
  market: "all",
  route: "root"
};

export const TESTIMONIALS_DEFAULT_CONTENT = {
  eyebrow: {
    en: "Testimonials",
    es: "Testimonios"
  },
  title: {
    en: "Client & production partner feedback",
    es: "Opiniones de clientes y aliados de producción"
  },
  items: [
    {
      id: "manuel-matamoros",
      name: "Manuel Matamoros",
      role: {
        en: "CEO",
        es: "CEO"
      },
      quote: {
        en: "We have had the opportunity to work with Samuel on multiple projects, where he has consistently demonstrated an exceptional level of professionalism, commitment, and broad technical expertise. His industry experience has been key to ensuring high-quality results in both in-person events and live broadcast productions. Without a doubt, he is a highly recommended professional for any production that requires high standards in live sound, broadcast, or corporate events.",
        es: "Hemos tenido la oportunidad de trabajar con Samuel en múltiples proyectos en donde siempre ha demostrado un nivel excepcional de profesionalismo, compromiso y amplio conocimiento técnico. Su experiencia en la industria ha sido clave para garantizar resultados de alta calidad tanto en eventos presenciales como en producciones de transmisión en vivo. Sin duda, es un profesional altamente recomendado para cualquier producción que requiera altos estándares en sonido en vivo, broadcast o eventos corporativos."
      },
      featured: true,
      logo: {
        src: "assets/clients/wlive.png",
        alt: "WLive",
        className: "",
        width: 800,
        height: 320,
        scale: 1
      }
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

function requireId(value, field) {
  requireString(value, field, 100);

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${field} contains invalid characters`);
  }
}

function requireClassList(value, field) {
  requireString(value, field, 240, { allowEmpty: true });

  if (value && !/^[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*$/.test(value)) {
    throw new Error(`${field} contains invalid CSS classes`);
  }
}

function requireDimension(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 5000) {
    throw new Error(`${field} must be an integer between 1 and 5000`);
  }
}

function requireScale(value, field) {
  const number = Number(value ?? 1);
  if (!Number.isFinite(number) || number < 0.5 || number > 1.8) {
    throw new Error(`${field} must be between 0.5 and 1.8`);
  }
}

function requireMediaSource(value, field) {
  requireString(value, field, 1000);

  const isLocalAsset = /^assets\/[A-Za-z0-9._/-]+$/.test(value);
  const isPublicR2 = /^https:\/\/media\.sdlive\.show\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value);

  if (!isLocalAsset && !isPublicR2) {
    throw new Error(`${field} must be a first-party asset or media.sdlive.show URL`);
  }
}

function validateLogo(logo, field) {
  if (logo == null) return;

  if (!isPlainObject(logo)) {
    throw new Error(`${field} must be an object or null`);
  }

  requireMediaSource(logo.src, `${field}.src`);
  requireString(logo.alt ?? "", `${field}.alt`, 240, { allowEmpty: true });
  requireClassList(logo.className ?? "", `${field}.className`);
  requireDimension(logo.width ?? 800, `${field}.width`);
  requireDimension(logo.height ?? 320, `${field}.height`);
  requireScale(logo.scale ?? 1, `${field}.scale`);
}

export function cloneTestimonialsDefault() {
  return JSON.parse(JSON.stringify(TESTIMONIALS_DEFAULT_CONTENT));
}

export function validateTestimonialsDraft(value) {
  if (!isPlainObject(value)) {
    throw new Error("Testimonials content must be an object");
  }

  requireLocalized(value.eyebrow, "eyebrow", 100);
  requireLocalized(value.title, "title", 240);

  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 12) {
    throw new Error("items must contain between 1 and 12 testimonials");
  }

  const ids = new Set();

  value.items.forEach((item, index) => {
    const field = `items.${index}`;
    if (!isPlainObject(item)) {
      throw new Error(`${field} must be an object`);
    }

    requireId(item.id, `${field}.id`);
    if (ids.has(item.id)) {
      throw new Error(`${field}.id must be unique`);
    }
    ids.add(item.id);

    requireString(item.name, `${field}.name`, 160);
    requireLocalized(item.role, `${field}.role`, 240, { allowEmpty: true });
    requireLocalized(item.quote, `${field}.quote`, 3000);

    if (typeof item.featured !== "boolean") {
      throw new Error(`${field}.featured must be a boolean`);
    }

    validateLogo(item.logo, `${field}.logo`);
  });

  return JSON.stringify(value);
}
