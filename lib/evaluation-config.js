const SOURCE_ITEM_SEQUENCE = [
  { sourceItemId: "000", itemDirNumber: 1 },
  { sourceItemId: "023", itemDirNumber: 2 },
  { sourceItemId: "024", itemDirNumber: 3 },
  { sourceItemId: "031", itemDirNumber: 4 },
  { sourceItemId: "041", itemDirNumber: 5 },
  { sourceItemId: "052", itemDirNumber: 6 },
  { sourceItemId: "080", itemDirNumber: 7 },
  { sourceItemId: "091", itemDirNumber: 8 },
  { sourceItemId: "095", itemDirNumber: 9 },
  { sourceItemId: "099", itemDirNumber: 10 },
  { sourceItemId: "102", itemDirNumber: 11 },
  { sourceItemId: "104", itemDirNumber: 12 },
  { sourceItemId: "112", itemDirNumber: 13 },
  { sourceItemId: "172", itemDirNumber: 14 },
  { sourceItemId: "179", itemDirNumber: 15 }
];

const FIXED_ITEM_ORDER = [8, 3, 13, 1, 10, 5, 14, 6, 0, 11, 4, 12, 2, 9, 7];

const AUDIO_ROOT = "/samples/aes-selected";

const STAGE_DEFINITIONS = [
  {
    key: "stage1",
    title: "Test A",
    introTitle: "Test A",
    introBody: "You are about to begin Test A. This test contains 15 items.",
    outroTitle: "Test A Complete",
    outroBody: "You have completed Test A. Please continue to start Test B. Test B contains 15 items.",
    prompt: "Rate each candidate from 0 to 100 against the Reference.",
    candidates: [
      { id: "reference_test", filename: "reference_test.wav" },
      { id: "c2_direct", filename: "c2_direct.wav" },
      { id: "c1_direct", filename: "c1_direct.wav" },
      { id: "c2_encoder", filename: "c2_encoder.wav" },
      { id: "c1_encoder", filename: "c1_encoder.wav" }
    ]
  },
  {
    key: "stage2",
    title: "Test B",
    introTitle: "Test B",
    introBody: "You are about to begin Test B. This test contains 15 items.",
    outroTitle: "Test B Complete",
    outroBody: "You have completed Test B. Please continue to finish the test.",
    prompt: "Rate each candidate from 0 to 100 against the Reference.",
    candidates: [
      { id: "reference_test", filename: "reference_test.wav" },
      { id: "c1_direct_rpm", filename: "c1_direct_rpm.wav" },
      { id: "c1_encoder_rpm", filename: "c1_encoder_rpm.wav" },
      { id: "c1_direct_rpm_pedal_gear", filename: "c1_direct_rpm_pedal_gear.wav" },
      { id: "c1_encoder_rpm_pedal_gear", filename: "c1_encoder_rpm_pedal_gear.wav" },
      { id: "c1_direct_full", filename: "c1_direct_full.wav" },
      { id: "c1_encoder_full", filename: "c1_encoder_full.wav" }
    ]
  }
];

function toItemDir(itemDirNumber) {
  return `item${String(itemDirNumber).padStart(2, "0")}`;
}

function buildItem(stageDefinition, sequenceEntry, itemIndex) {
  const itemNumber = itemIndex + 1;
  const itemDir = toItemDir(sequenceEntry.itemDirNumber);

  return {
    id: `${stageDefinition.key}-item-${String(itemNumber).padStart(2, "0")}-src-${sequenceEntry.sourceItemId}`,
    title: `${stageDefinition.title} Item ${itemNumber} · Source ${sequenceEntry.sourceItemId}`,
    prompt: stageDefinition.prompt,
    sourceItemId: sequenceEntry.sourceItemId,
    position: itemNumber,
    groundTruth: {
      path: `${AUDIO_ROOT}/${stageDefinition.key}/${itemDir}/ground_truth.wav`
    },
    candidates: stageDefinition.candidates.map((candidate) => ({
      id: candidate.id,
      path: `${AUDIO_ROOT}/${stageDefinition.key}/${itemDir}/${candidate.filename}`
    }))
  };
}

export const STAGES = STAGE_DEFINITIONS.map((stageDefinition) => ({
  key: stageDefinition.key,
  title: stageDefinition.title,
  introTitle: stageDefinition.introTitle,
  introBody: stageDefinition.introBody,
  outroTitle: stageDefinition.outroTitle,
  outroBody: stageDefinition.outroBody,
  candidateCount: stageDefinition.candidates.length,
  candidateIds: stageDefinition.candidates.map((candidate) => candidate.id),
  items: FIXED_ITEM_ORDER.map((sequenceIndex, itemIndex) =>
    buildItem(stageDefinition, SOURCE_ITEM_SEQUENCE[sequenceIndex], itemIndex)
  )
}));

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }
  return copy;
}

function toAudioDescriptor(path) {
  return {
    path,
    hasAudio: Boolean(path)
  };
}

function prepareItem(item, itemPosition) {
  const shuffledCandidates = shuffle(item.candidates).map((candidate, candidateIndex) => ({
    candidateId: candidate.id,
    candidateSlot: candidateIndex + 1,
    displayLabel: `Sample ${candidateIndex + 1}`,
    ...toAudioDescriptor(candidate.path)
  }));

  return {
    id: item.id,
    title: item.title,
    prompt: item.prompt,
    position: itemPosition,
    sourceItemId: item.sourceItemId,
    groundTruth: toAudioDescriptor(item.groundTruth.path),
    candidates: shuffledCandidates
  };
}

export function createStagePayload() {
  return STAGES.map((stage, stageIndex) => ({
    key: stage.key,
    title: stage.title,
    introTitle: stage.introTitle,
    introBody: stage.introBody,
    outroTitle: stage.outroTitle,
    outroBody: stage.outroBody,
    candidateCount: stage.candidateCount,
    candidateIds: stage.candidateIds,
    position: stageIndex + 1,
    items: stage.items.map((item, itemIndex) => prepareItem(item, itemIndex + 1))
  }));
}

export function getEvaluationCounts() {
  const stageCount = STAGES.length;
  const itemCount = STAGES.reduce((sum, stage) => sum + stage.items.length, 0);
  return {
    stageCount,
    itemCount
  };
}
