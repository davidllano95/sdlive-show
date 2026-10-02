export const PATCH_PROFILE_CATALOG_VERSION = 1;

function bank(id, name, direction, count, prefix, signalProtocol, connector, resource = "port") {
  return Object.freeze({
    id,
    name,
    direction,
    count,
    prefix,
    signalProtocol,
    connector,
    resource
  });
}

function consoleProfile({
  id,
  model,
  monoChannels,
  stereoChannels = 8,
  localInputs,
  localOutputs,
  danteInputs,
  danteOutputs,
  mixBuses,
  matrices,
  mySlots
}) {
  return Object.freeze({
    id,
    manufacturer: "Yamaha",
    model,
    kind: "console",
    verified: true,
    family: model.startsWith("QL") ? "QL" : "CL",
    banks: Object.freeze([
      bank("local-in", "Local Inputs", "input", localInputs, "Local In", "Analog", "XLR"),
      bank("local-out", "Local Outputs", "output", localOutputs, "Local Out", "Analog", "XLR"),
      bank("dante-rx", "Dante Rx", "input", danteInputs, "Dante Rx", "Dante", "Network"),
      bank("dante-tx", "Dante Tx", "output", danteOutputs, "Dante Tx", "Dante", "Network")
    ]),
    consoleChannels: Object.freeze({
      mono: monoChannels,
      stereo: stereoChannels
    }),
    internalResources: Object.freeze({
      mixBuses,
      matrices,
      stereoBus: 1,
      monoBus: 1,
      mySlots
    })
  });
}

export const PATCH_PROFILES = Object.freeze([
  consoleProfile({
    id: "yamaha-cl5",
    model: "CL5",
    monoChannels: 72,
    localInputs: 8,
    localOutputs: 8,
    danteInputs: 64,
    danteOutputs: 64,
    mixBuses: 24,
    matrices: 8,
    mySlots: 3
  }),
  consoleProfile({
    id: "yamaha-cl3",
    model: "CL3",
    monoChannels: 64,
    localInputs: 8,
    localOutputs: 8,
    danteInputs: 64,
    danteOutputs: 64,
    mixBuses: 24,
    matrices: 8,
    mySlots: 3
  }),
  consoleProfile({
    id: "yamaha-cl1",
    model: "CL1",
    monoChannels: 48,
    localInputs: 8,
    localOutputs: 8,
    danteInputs: 64,
    danteOutputs: 64,
    mixBuses: 24,
    matrices: 8,
    mySlots: 3
  }),
  consoleProfile({
    id: "yamaha-ql5",
    model: "QL5",
    monoChannels: 64,
    localInputs: 32,
    localOutputs: 16,
    danteInputs: 64,
    danteOutputs: 64,
    mixBuses: 16,
    matrices: 8,
    mySlots: 2
  }),
  consoleProfile({
    id: "yamaha-ql1",
    model: "QL1",
    monoChannels: 32,
    localInputs: 16,
    localOutputs: 8,
    danteInputs: 32,
    danteOutputs: 32,
    mixBuses: 16,
    matrices: 8,
    mySlots: 2
  }),
  Object.freeze({
    id: "yamaha-rio3224-d2",
    manufacturer: "Yamaha",
    model: "Rio3224-D2",
    kind: "stage-io",
    verified: true,
    banks: Object.freeze([
      bank("analog-in", "Analog Inputs", "input", 32, "In", "Analog", "XLR"),
      bank("analog-out", "Analog Outputs", "output", 16, "Out", "Analog", "XLR"),
      bank("dante-tx", "Dante Tx", "output", 32, "Dante Tx", "Dante", "Network"),
      bank("dante-rx", "Dante Rx", "input", 24, "Dante Rx", "Dante", "Network"),
      bank("aes-out", "AES/EBU Outputs", "output", 8, "AES Out", "AES3", "XLR")
    ])
  }),
  Object.freeze({
    id: "yamaha-rio1608-d2",
    manufacturer: "Yamaha",
    model: "Rio1608-D2",
    kind: "stage-io",
    verified: true,
    banks: Object.freeze([
      bank("analog-in", "Analog Inputs", "input", 16, "In", "Analog", "XLR"),
      bank("analog-out", "Analog Outputs", "output", 8, "Out", "Analog", "XLR"),
      bank("dante-tx", "Dante Tx", "output", 16, "Dante Tx", "Dante", "Network"),
      bank("dante-rx", "Dante Rx", "input", 8, "Dante Rx", "Dante", "Network")
    ])
  })
]);

const BY_ID = new Map(PATCH_PROFILES.map((profile) => [profile.id, profile]));

export function getPatchProfile(profileId) {
  return BY_ID.get(String(profileId || "")) || null;
}

export function listPatchProfiles(kind = null) {
  return PATCH_PROFILES.filter((profile) => !kind || profile.kind === kind);
}
