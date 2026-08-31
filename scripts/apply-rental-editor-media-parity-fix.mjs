import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(path, from, to, label) {
  const source = read(path);
  if (!source.includes(from)) throw new Error(`${label}: expected source not found in ${path}`);
  const next = source.replace(from, to);
  if (next === source) throw new Error(`${label}: replacement made no change in ${path}`);
  write(path, next);
}

const editorPath = "admin/editor/rental-stabilization-editor.js";
const mediaEdgePath = "media-presentation-edge.js";
const shellPath = "admin/admin-stabilization.js";
const adminTestPath = "tests/admin-stabilization.test.mjs";
const paTestPath = "tests/rental-pa-pair-editor.test.mjs";

replaceOnce(
  editorPath,
  `  function applyLocalized(element, value, lang) {\n    if (!element || !value) return;\n    element.dataset.en = value.en || ""; element.dataset.es = value.es || ""; element.textContent = value[lang] || "";\n  }\n`,
  `  function applyLocalized(element, value, lang) {\n    if (!element || !value) return;\n    element.dataset.en = value.en || ""; element.dataset.es = value.es || ""; element.textContent = value[lang] || "";\n  }\n  function focusPreviewItem(id, smooth = false) {\n    try {\n      const card = iframe.contentDocument?.querySelector(\`#rental [data-rental-item="\${CSS.escape(id)}"]\`);\n      card?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center", inline: "nearest" });\n    } catch {}\n  }\n  function updateMediaPathLabel(id) {\n    const code = editorBody.querySelector(\`[data-rental-media-editor="\${CSS.escape(id)}"] code\`);\n    if (code) code.textContent = working?.items?.[id]?.image?.src || "";\n  }\n  function setRentalImageSource(id, source) {\n    const image = working?.items?.[id]?.image;\n    const value = String(source || "").trim();\n    if (!image || !value) return;\n    image.src = value;\n    updateMediaPathLabel(id);\n    changed();\n    focusPreviewItem(id);\n  }\n`,
  "insert preview/media helpers"
);

replaceOnce(
  editorPath,
  `    actions.append(button("↑", () => moveArray(order, index, -1), index === 0), button("↓", () => moveArray(order, index, 1), index === order.length - 1));\n`,
  `    actions.append(button("Preview", () => focusPreviewItem(id, true)), button("↑", () => moveArray(order, index, -1), index === 0), button("↓", () => moveArray(order, index, 1), index === order.length - 1));\n`,
  "add per-item preview focus"
);

replaceOnce(
  editorPath,
  `    const image = working.items[id].image;\n    const row = document.createElement("div"); row.className = "rental-v2-media";\n`,
  `    const image = working.items[id].image;\n    const row = document.createElement("div"); row.className = "rental-v2-media"; row.dataset.rentalMediaEditor = id;\n`,
  "tag media editor row"
);

const oldLibrarySelect = '      window.SDLiveMediaLibrary.open({ folder: "rental", onSelect: (media) => {\n        image.src = media.logicalRef || `${LOGICAL_MEDIA_PREFIX}${media.key}`; changed(true);\n      }});\n';
const newLibrarySelect = '      window.SDLiveMediaLibrary.open({ folder: "rental", onSelect: (media) => {\n        setRentalImageSource(id, media.logicalPath || media.logicalRef || (LOGICAL_MEDIA_PREFIX + media.key));\n      }});\n';
replaceOnce(editorPath, oldLibrarySelect, newLibrarySelect, "use canonical Media Library logicalPath without rerender");

const oldUpload = '      working.items[id].image.src = `${LOGICAL_MEDIA_PREFIX}${data.media.key}`; changed(true); toast("Rental image uploaded.", "Save Draft to keep it.");\n';
const newUpload = '      setRentalImageSource(id, data.media.logicalPath || (LOGICAL_MEDIA_PREFIX + data.media.key)); toast("Rental image uploaded.", "Save Draft to keep it.");\n';
replaceOnce(editorPath, oldUpload, newUpload, "keep upload preview live without rerender");

replaceOnce(
  editorPath,
  `    range.addEventListener("input", () => { working.items[id].image.displayScale = Number(range.value) / 100; working.items[id].image.scale = Number(range.value) / 100; sync(); changed(); });\n`,
  `    range.addEventListener("input", () => { working.items[id].image.displayScale = Number(range.value) / 100; working.items[id].image.scale = Number(range.value) / 100; sync(); changed(); focusPreviewItem(id); });\n`,
  "focus preview during scale edits"
);

replaceOnce(
  editorPath,
  `    range.addEventListener("input", () => { working.items[id].image[key] = Number(range.value); sync(); changed(); });\n`,
  `    range.addEventListener("input", () => { working.items[id].image[key] = Number(range.value); sync(); changed(); focusPreviewItem(id); });\n`,
  "focus preview during position edits"
);

replaceOnce(
  editorPath,
  `        const images = id === "pa"\n          ? [...card.querySelectorAll(".equipment-pa-pair img")]\n          : [card.querySelector(".equipment-card-visual img")].filter(Boolean);\n`,
  `        const images = id === "pa"\n          ? [...card.querySelectorAll(".equipment-pa-pair img")]\n          : [...card.querySelectorAll(".equipment-card-visual img, .equipment-tool-visual img")];\n`,
  "cover normal and Production Tool image containers in preview"
);

replaceOnce(
  mediaEdgePath,
  `    addImageHandler(rewriter, \`#rental [data-rental-item="\${cssEscapeAttribute(id)}"] .equipment-card-visual img\`, item.image, { allowPosition: true });\n`,
  `    addImageHandler(rewriter, \`#rental [data-rental-item="\${cssEscapeAttribute(id)}"] img\`, item.image, { allowPosition: true });\n`,
  "apply extended media presentation to every Rental item image"
);

replaceOnce(shellPath, `const EDITOR_EXTENSION_VERSION = "20260831-3";`, `const EDITOR_EXTENSION_VERSION = "20260831-4";`, "bump editor asset version");
replaceOnce(adminTestPath, `/EDITOR_EXTENSION_VERSION = "20260831-3"/`, `/EDITOR_EXTENSION_VERSION = "20260831-4"/`, "update Admin version expectation");
replaceOnce(paTestPath, `const EDITOR_EXTENSION_VERSION = "20260831-3";`, `const EDITOR_EXTENSION_VERSION = "20260831-4";`, "update PA cache-bust expectation");

console.log("Rental editor media parity patch applied.");
