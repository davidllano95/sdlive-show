import test from "node:test";
import assert from "node:assert/strict";
import { CORE_SECTION_KEYS, cloneCoreSectionDefault, validateCoreSectionDraft } from "../core-sections-content.js";
import { sectionFromPath } from "../core-sections-api.js";

test("CV CMS uses existing scoped core storage with empty safe defaults", () => {
  assert.equal(CORE_SECTION_KEYS.cv.section, "cv");
  assert.deepEqual(cloneCoreSectionDefault("cv"), { overrides: {} });
  assert.equal(sectionFromPath("/api/admin/content/cv/publish"), "cv");
  assert.equal(sectionFromPath("/api/content/cv"), "cv");
});

test("CV translations are plain text and restrict personal contact disclosure", () => {
  const valid={overrides:{n2:{en:"Associate Sound Designer",es:"Diseñador de sonido asociado"}}};
  assert.deepEqual(JSON.parse(validateCoreSectionDraft("cv",valid)),valid);
  assert.throws(()=>validateCoreSectionDraft("cv",{overrides:{n2:{en:"Phone +57 319 247 3948",es:"Teléfono"}}}),/Private phone/);
  assert.throws(()=>validateCoreSectionDraft("cv",{overrides:{abc:{en:"Hi",es:"Hola"}}}),/key/);
});
