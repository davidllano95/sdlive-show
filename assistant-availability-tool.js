import { handleAvailabilityApi } from "./availability-core.js";
import { decorateAvailabilityNextWindowResponse } from "./availability-next-window.js";

const SAFE_STATUSES = new Set(["available", "limited", "away"]);

function publicAvailabilityRequest() {
  return new Request("https://sdlive.show/api/availability", {
    method: "GET",
    headers: { Accept: "application/json" }
  });
}

function safeWindow(value) {
  if (!value || typeof value !== "object") return null;
  const startsAt = String(value.startsAt || "").trim();
  const labelEn = String(value.labelEn || "").trim();
  const labelEs = String(value.labelEs || "").trim();
  if (!startsAt) return null;

  return {
    startsAt,
    labelEn: labelEn || null,
    labelEs: labelEs || null
  };
}

/**
 * Read the current human Availability for the future public Assistant using
 * only the already-public Availability contract.
 *
 * This adapter deliberately whitelists fields instead of forwarding the raw
 * payload. Internal timezone/travel/override/force/profile information can
 * therefore never become model context through this tool, even if an internal
 * API response is accidentally passed in later.
 *
 * The public site intentionally fails open to `available` if D1 is degraded.
 * The Assistant cannot use that fallback as a promise: degraded state becomes
 * availabilityKnown=false so the bot may continue collecting the request but
 * must not claim that the owner is available.
 */
export async function readAssistantAvailability(
  env,
  {
    availabilityHandler = handleAvailabilityApi,
    decorateResponse = decorateAvailabilityNextWindowResponse
  } = {}
) {
  let response;
  try {
    response = await availabilityHandler(publicAvailabilityRequest(), env, {});
  } catch (error) {
    console.error("[SD.Live] Assistant Availability read failed", error);
    return {
      ok: false,
      availabilityKnown: false,
      currentStatus: null,
      humanReachable: null,
      contactMode: "leave_message",
      nextHumanWindow: null,
      reason: "availability_unavailable"
    };
  }

  if (!response || !response.ok) {
    return {
      ok: false,
      availabilityKnown: false,
      currentStatus: null,
      humanReachable: null,
      contactMode: "leave_message",
      nextHumanWindow: null,
      reason: "availability_unavailable"
    };
  }

  let decorated = response;
  try {
    decorated = await decorateResponse(response, env, { publicView: true });
  } catch (error) {
    console.error("[SD.Live] Assistant next Availability window failed", error);
  }

  const data = await decorated.clone().json().catch(() => null);
  if (!data?.ok || data?.degraded === true) {
    return {
      ok: true,
      availabilityKnown: false,
      currentStatus: null,
      humanReachable: null,
      contactMode: "leave_message",
      nextHumanWindow: null,
      reason: data?.degraded === true ? "degraded" : "invalid_public_snapshot"
    };
  }

  const status = SAFE_STATUSES.has(String(data.status || "").toLowerCase())
    ? String(data.status).toLowerCase()
    : null;

  if (!status) {
    return {
      ok: true,
      availabilityKnown: false,
      currentStatus: null,
      humanReachable: null,
      contactMode: "leave_message",
      nextHumanWindow: null,
      reason: "invalid_public_snapshot"
    };
  }

  return {
    ok: true,
    availabilityKnown: true,
    currentStatus: status,
    humanReachable: data.humanReachable === true,
    contactMode: data.contactMode === "whatsapp" ? "whatsapp" : "leave_message",
    nextHumanWindow: safeWindow(data.nextHumanWindow),
    reason: null
  };
}
