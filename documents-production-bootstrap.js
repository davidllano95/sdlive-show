import { SAMUEL_SEQUENCE_BOOTSTRAP } from "./documents-kinds.js";
import { inspectDocumentsProductionPreflight } from "./documents-production-preflight.js";
import {
  DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
  bootstrapDocumentSequence
} from "./documents-storage.js";

export const DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION = "BOOTSTRAP_SAMUEL_CC_21_AND_INV_0019";

function compactResult(config, result) {
  return {
    seriesKey: config.seriesKey,
    issuerId: config.issuerId,
    docType: config.docType,
    nextValue: Number(result?.nextValue ?? config.nextValue),
    displayPattern: config.displayPattern,
    applied: result?.applied === true
  };
}

function postflightMatches(preflight, configs) {
  if (preflight?.ready !== true) return false;
  const byKey = new Map((preflight.series || []).map((item) => [item.seriesKey, item]));
  return configs.every((config) => {
    const item = byKey.get(config.seriesKey);
    return item?.ready === true
      && item.sequenceState === "existing"
      && Number(item.existingNextValue) >= Number(config.nextValue)
      && item.issuerId === config.issuerId
      && item.docType === config.docType
      && item.displayPattern === config.displayPattern;
  });
}

export async function bootstrapDocumentsProduction(
  env,
  {
    actorEmail,
    confirmation,
    now = () => new Date().toISOString(),
    preflightFn = inspectDocumentsProductionPreflight,
    bootstrapFn = bootstrapDocumentSequence
  } = {}
) {
  if (confirmation !== DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION) {
    throw new Error("explicit_production_bootstrap_confirmation_required");
  }

  const before = await preflightFn(env);
  if (before?.ready !== true) throw new Error("production_preflight_not_ready");

  const configs = Object.values(SAMUEL_SEQUENCE_BOOTSTRAP);
  const results = [];
  for (const config of configs) {
    const result = await bootstrapFn(env, {
      config,
      actorEmail,
      confirmation: DOCUMENT_SEQUENCE_BOOTSTRAP_CONFIRMATION,
      note: "Owner-authorized SD.Live Documents v1 production bootstrap",
      now
    });
    results.push(compactResult(config, result));
  }

  const after = await preflightFn(env);
  if (!postflightMatches(after, configs)) throw new Error("production_bootstrap_postflight_failed");

  return {
    ok: true,
    bootstrapped: true,
    idempotent: results.every((item) => item.applied === false),
    series: results,
    preflight: after
  };
}

export function documentsProductionBootstrapPolicy() {
  return Object.freeze({
    adminOnly: true,
    requiresExplicitOwnerConfirmation: true,
    requiresReadyPreflightImmediatelyBeforeWrite: true,
    writesDatabase: true,
    writesBucket: false,
    emitsDocument: false,
    consumesDocumentNumber: false,
    createsOnlyRealSequenceRows: true,
    confirmation: DOCUMENTS_PRODUCTION_BOOTSTRAP_CONFIRMATION
  });
}
