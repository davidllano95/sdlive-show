import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  SITE_PRESENTATION_DEFAULT_CONTENT,
  cloneSitePresentationDefault,
  validateSitePresentationDraft
} from "../site-presentation-content.js";
import {
  defaultRentalCards,
  defaultRentalItemOrder,
  validateRentalPresentationExtras
} from "../rental-presentation-contract.js";
import { PRESENTATION_SECTION_DEFAULTS } from "../home-presentation-content.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function loadFinanceCycleRules() {
  const context = { globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read("admin/finance-cycle-rules.js"), context);
  return context.SDLiveFinanceCycleRules;
}

test("Site presentation accepts bounded defaults", () => {
  const draft = cloneSitePresentationDefault();
  assert.doesNotThrow(() => validateSitePresentationDraft(draft));
  assert.equal(draft.header.items.length, SITE_PRESENTATION_DEFAULT_CONTENT.header.items.length);
});

test("Site presentation rejects arbitrary or duplicate header targets", () => {
  const arbitrary = cloneSitePresentationDefault();
  arbitrary.header.items[0].target = "https://example.com";
  assert.throws(() => validateSitePresentationDraft(arbitrary), /approved internal anchor/);

  const duplicate = cloneSitePresentationDefault();
  duplicate.header.items[1].target = duplicate.header.items[0].target;
  assert.throws(() => validateSitePresentationDraft(duplicate), /target must be unique/);
});

test("Rental presentation accepts supported cards, ordering and extended media bounds", () => {
  const draft = clone(PRESENTATION_SECTION_DEFAULTS.rental);
  draft.recommended.cards = defaultRentalCards(draft);
  draft.recommended.itemOrder = defaultRentalItemOrder();
  draft.items.wing.image.displayScale = 2.5;
  draft.items.wing.image.positionX = -35;
  draft.items.wing.image.positionY = 42;
  assert.doesNotThrow(() => validateRentalPresentationExtras(draft));
});

test("Rental presentation cannot invent presets, item membership or media bounds", () => {
  const badPreset = clone(PRESENTATION_SECTION_DEFAULTS.rental);
  badPreset.recommended.cards = defaultRentalCards(badPreset);
  badPreset.recommended.cards[0].presetKey = "custom-price-package";
  assert.throws(() => validateRentalPresentationExtras(badPreset), /not supported by Rental quote logic/);

  const badOrder = clone(PRESENTATION_SECTION_DEFAULTS.rental);
  badOrder.recommended.itemOrder = defaultRentalItemOrder();
  badOrder.recommended.itemOrder.consoles = ["wing", "flow8", "stageGrid"];
  assert.throws(() => validateRentalPresentationExtras(badOrder), /each supported item exactly once/);

  const badScale = clone(PRESENTATION_SECTION_DEFAULTS.rental);
  badScale.items.wing.image.displayScale = 2.51;
  assert.throws(() => validateRentalPresentationExtras(badScale), /displayScale must be between 0.5 and 2.5/);
});

test("Admin stabilization worker is the deploy entry and covers localized home routes", () => {
  const wrangler = read("wrangler.jsonc");
  const worker = read("admin-stabilization-worker.js");
  assert.match(wrangler, /"main"\s*:\s*"\.\/admin-stabilization-worker\.js"/);
  assert.match(worker, /new Set\(\["\/", "\/en", "\/es-co"\]\)/);
  assert.match(worker, /validateRentalPresentationExtras/);
});

test("LiventX cycle colors follow 5-19 green, 20-25 yellow, 26-4 red", () => {
  const rules = loadFinanceCycleRules();
  for (const day of [5, 6, 12, 19]) assert.equal(rules.urgencyFor(day), "low", `day ${day}`);
  for (const day of [20, 21, 25]) assert.equal(rules.urgencyFor(day), "medium", `day ${day}`);
  for (const day of [1, 2, 4, 26, 27, 31]) assert.equal(rules.urgencyFor(day), "high", `day ${day}`);
});

test("Collection reminders fire only on days 5 and 19", () => {
  const rules = loadFinanceCycleRules();
  assert.equal(rules.reminderKind(5), "open");
  assert.equal(rules.reminderKind(19), "close");
  for (const day of [1, 4, 6, 18, 20, 31]) assert.equal(rules.reminderKind(day), null, `day ${day}`);
});

test("Finance stabilization keeps observation narrow", () => {
  const source = read("admin/finance-stabilization.js");
  assert.match(source, /observer\.observe\(card/);
  assert.doesNotMatch(source, /observe\(document\.(?:body|documentElement)/);
  assert.doesNotMatch(source, /observe\(document\.querySelector\(["']body/);
  assert.match(source, /America\/Bogota/);
  assert.match(source, /financeCollectionCycleReminder/);
});

test("Required stabilization scripts parse as JavaScript modules or classic scripts", () => {
  const files = [
    "admin-stabilization-worker.js",
    "media-presentation-edge.js",
    "rental-presentation-contract.js",
    "rental-presentation-edge.js",
    "rental-presentation-runtime.js",
    "site-presentation-api.js",
    "site-presentation-content.js",
    "site-presentation-edge.js",
    "admin/admin-stabilization.js",
    "admin/editor/admin-stabilization-cms.js",
    "admin/editor/rental-stabilization-editor.js",
    "admin/editor/site-presentation-editor.js",
    "admin/finance-cycle-rules.js",
    "admin/finance-stabilization.js",
    "admin/site-schedule-stabilization.js"
  ];

  for (const relative of files) {
    const result = spawnSync(process.execPath, ["--experimental-default-type=module", "--check", path.join(root, relative)], {
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${relative} failed syntax check:\n${result.stderr || result.stdout}`);
  }
});

test("Calendar and Site Schedule stabilization assets are present", () => {
  for (const relative of [
    "admin/calendar-stabilization.css",
    "admin/site-schedule-stabilization.css",
    "admin/site-schedule-stabilization.js"
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} should exist`);
  }
  const shell = read("admin/admin-stabilization.js");
  assert.match(shell, /calendar-stabilization\.css/);
  assert.match(shell, /site-schedule-stabilization\.js/);
});