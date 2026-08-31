import fs from "node:fs";

const editorPath = "admin/editor/rental-stabilization-editor.js";
const shellPath = "admin/admin-stabilization.js";

let editor = fs.readFileSync(editorPath, "utf8");
let shell = fs.readFileSync(shellPath, "utf8");

const editorHeadNeedle = `    head.append(title, actions); block.append(head);\n    block.append(\n      localizedField("Title", \`items.\${id}.title\`), localizedField("Description", \`items.\${id}.description\`, true), localizedField("Technical note", \`items.\${id}.technicalNote\`, true),\n      mediaEditor(id), scaleField(id), positionField(id, "positionX", "Horizontal position"), positionField(id, "positionY", "Vertical position")\n    );`;

const editorHeadReplacement = `    head.append(title, actions); block.append(head);\n    if (id === "pa") {\n      const pairNote = document.createElement("p");\n      pairNote.className = "field-help";\n      pairNote.dataset.rentalPaPairNotice = "true";\n      pairNote.textContent = "PA pair · both units always use the same image, size and position.";\n      block.append(pairNote);\n    }\n    block.append(\n      localizedField("Title", \`items.\${id}.title\`), localizedField("Description", \`items.\${id}.description\`, true), localizedField("Technical note", \`items.\${id}.technicalNote\`, true),\n      mediaEditor(id), scaleField(id), positionField(id, "positionX", "Horizontal position"), positionField(id, "positionY", "Vertical position")\n    );`;

if (!editor.includes(editorHeadNeedle)) {
  throw new Error("Could not find Rental item editor insertion point");
}
editor = editor.replace(editorHeadNeedle, editorHeadReplacement);

const previewNeedle = `        const img = card.querySelector(".equipment-card-visual img"); if (img) { img.src = resolveMedia(item.image.src); img.alt = item.image.alt || ""; img.style.scale = String(clamp(item.image.displayScale ?? item.image.scale, .5, 2.5, 1)); img.style.translate = \`\${clamp(item.image.positionX, -100, 100, 0)}% \${clamp(item.image.positionY, -100, 100, 0)}%\`; }`;

const previewReplacement = `        const images = id === "pa"\n          ? [...card.querySelectorAll(".equipment-pa-pair img")]\n          : [card.querySelector(".equipment-card-visual img")].filter(Boolean);\n        images.forEach((img, imageIndex) => {\n          img.src = resolveMedia(item.image.src);\n          if (id === "pa" && imageIndex > 0) { img.alt = ""; img.setAttribute("aria-hidden", "true"); }\n          else { img.alt = item.image.alt || ""; if (id === "pa") img.removeAttribute("aria-hidden"); }\n          img.style.scale = String(clamp(item.image.displayScale ?? item.image.scale, .5, 2.5, 1));\n          img.style.translate = \`\${clamp(item.image.positionX, -100, 100, 0)}% \${clamp(item.image.positionY, -100, 100, 0)}%\`;\n        });`;

if (!editor.includes(previewNeedle)) {
  throw new Error("Could not find Rental preview image application path");
}
editor = editor.replace(previewNeedle, previewReplacement);

const versionNeedle = `const EDITOR_EXTENSION_VERSION = "20260831-2";`;
if (!shell.includes(versionNeedle)) {
  throw new Error("Could not find current editor extension version");
}
shell = shell.replace(versionNeedle, `const EDITOR_EXTENSION_VERSION = "20260831-3";`);

fs.writeFileSync(editorPath, editor);
fs.writeFileSync(shellPath, shell);
