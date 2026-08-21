import { validateCoreSectionDraft } from "./core-sections-content.js";

function assertInternalHref(value, field) {
  const href = String(value || "");
  const isHash = /^#[-A-Za-z0-9_]+$/.test(href);
  const isRelativePath = /^\/?[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=@%/-]*$/.test(href);
  if (!isHash && !isRelativePath) {
    throw new Error(`${field} must be an internal SD.Live path or hash`);
  }
}

export function validateCoreSectionPayload(section, value) {
  const serialized = validateCoreSectionDraft(section, value);

  if (section === "services") {
    assertInternalHref(value.detailLink.href.en, "services.detailLink.href.en");
    assertInternalHref(value.detailLink.href.es, "services.detailLink.href.es");
  } else if (section === "work") {
    value.items.forEach((item, index) => {
      assertInternalHref(item.cta.href.en, `work.items.${index}.cta.href.en`);
      assertInternalHref(item.cta.href.es, `work.items.${index}.cta.href.es`);
    });
  } else if (section === "international") {
    assertInternalHref(value.cta.href.en, "international.cta.href.en");
    assertInternalHref(value.cta.href.es, "international.cta.href.es");
  }

  return serialized;
}

export { assertInternalHref };
