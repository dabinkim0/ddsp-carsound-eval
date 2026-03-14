const MAIN_TRIAL_INDICES = [
  "000", "003", "009", "010", "013", "014", "018", "020", "023", "024",
  "025", "026", "030", "031", "035", "039", "041", "050", "051", "052",
  "055", "057", "060", "062", "063", "067", "068", "070", "074", "079",
  "080", "085", "087", "089", "090", "091", "095", "099", "102", "104",
  "112", "132", "150", "161", "167", "171", "172", "174", "178", "179"
];

const WARMUP_TRIAL_INDICES = ["092", "146", "173"];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPath(baseDir, index, type) {
  return `${baseDir}/16kHz/16kHz_${index}_${type}.wav`;
}

function buildTrial(index, phase, position) {
  const baseDir = phase === "warmup" ? "samples_warmup" : "samples";
  const flip = Math.random() >= 0.5;
  const sampleAType = flip ? "proposed" : "baseline";
  const sampleBType = flip ? "baseline" : "proposed";

  return {
    trialIndex: index,
    phase,
    position,
    isWarmup: phase === "warmup",
    referencePath: buildPath(baseDir, index, "gt"),
    sampleAPath: buildPath(baseDir, index, sampleAType),
    sampleBPath: buildPath(baseDir, index, sampleBType),
    sampleAType,
    sampleBType
  };
}

function toClientTrial(trial) {
  return {
    index: trial.trialIndex,
    phase: trial.phase,
    position: trial.position,
    reference: trial.referencePath,
    sampleA: trial.sampleAPath,
    sampleB: trial.sampleBPath,
    aType: trial.sampleAType,
    bType: trial.sampleBType
  };
}

export function createSessionTrials() {
  const warmupTrials = shuffle(WARMUP_TRIAL_INDICES).map((index, position) =>
    buildTrial(index, "warmup", position + 1)
  );

  const mainTrials = shuffle(MAIN_TRIAL_INDICES).map((index, position) =>
    buildTrial(index, "main", position + 1)
  );

  return {
    warmupTrials,
    mainTrials,
    clientWarmupTrials: warmupTrials.map(toClientTrial),
    clientMainTrials: mainTrials.map(toClientTrial)
  };
}

export function getTrialCounts() {
  return {
    main: MAIN_TRIAL_INDICES.length,
    warmup: WARMUP_TRIAL_INDICES.length
  };
}
