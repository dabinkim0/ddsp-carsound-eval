const STAGE_1_CANDIDATE_IDS = ["A_01", "A_02", "B_01", "B_02"];
const STAGE_2_CANDIDATE_IDS = ["A_sig_01", "A_sig_02", "A_sig_03", "B_sig_01", "B_sig_02", "B_sig_03"];
const ITEMS_PER_STAGE = 12;
const ENABLE_AUDIO_PLAYBACK = false;
const AUDIO_ROOT = "/samples/mushra";

function toItemDir(itemNumber) {
  return `item${String(itemNumber).padStart(2, "0")}`;
}

function maybeEnablePath(path) {
  return ENABLE_AUDIO_PLAYBACK ? path : null;
}

function buildGroundTruthPath(stageKey, itemNumber) {
  return maybeEnablePath(`${AUDIO_ROOT}/${stageKey}/${toItemDir(itemNumber)}/ground_truth.wav`);
}

function buildCandidatePath(stageKey, itemNumber, candidateId) {
  return maybeEnablePath(`${AUDIO_ROOT}/${stageKey}/${toItemDir(itemNumber)}/${candidateId}.wav`);
}

// File naming template:
// /public/samples/mushra/stage1/item01/ground_truth.wav
// /public/samples/mushra/stage1/item01/A_01.wav
// /public/samples/mushra/stage2/item01/A_sig_03.wav
function createTemplateItems(stageKey, prompt, candidateIds) {
  return Array.from({ length: ITEMS_PER_STAGE }, (_, index) => ({
    id: `${stageKey}-item-${String(index + 1).padStart(2, "0")}`,
    title: `${stageKey === "stage1" ? "Stage 1" : "Stage 2"} Item ${index + 1}`,
    prompt,
    groundTruth: {
      path: buildGroundTruthPath(stageKey, index + 1)
    },
    candidates: candidateIds.map((candidateId) => ({
      id: candidateId,
      path: buildCandidatePath(stageKey, index + 1, candidateId)
    }))
  }));
}

const STAGE_1_PROMPT =
  "Comparative Study on the Application of Engine Order: rate each candidate from 0 to 100 against the Ground Truth.";
const STAGE_2_PROMPT =
  "Comparative Study on the Model Architecture: rate each candidate from 0 to 100 against the Ground Truth.";

export const STAGES = [
  {
    key: "stage1",
    title: "Stage 1",
    introTitle: "Stage 1: Application of Engine Order",
    introBody:
      "This stage is a comparative study on the application of engine order. Listen to the Ground Truth first, then rate every shuffled candidate from 0 to 100 using the full MUSHRA scale.",
    outroTitle: "Stage 1 completed",
    outroBody:
      "You have completed all 12 items in Stage 1. When you continue, Stage 2 will begin with a different comparison objective.",
    candidateCount: STAGE_1_CANDIDATE_IDS.length,
    candidateIds: STAGE_1_CANDIDATE_IDS,
    items: createTemplateItems("stage1", STAGE_1_PROMPT, STAGE_1_CANDIDATE_IDS)
  },
  {
    key: "stage2",
    title: "Stage 2",
    introTitle: "Stage 2: Model Architecture",
    introBody:
      "This stage is a comparative study on the model architecture. Again use the Ground Truth as the anchor and rate every shuffled candidate from 0 to 100.",
    outroTitle: "Stage 2 completed",
    outroBody:
      "You have completed all 12 items in Stage 2. Your ratings will now be submitted.",
    candidateCount: STAGE_2_CANDIDATE_IDS.length,
    candidateIds: STAGE_2_CANDIDATE_IDS,
    items: createTemplateItems("stage2", STAGE_2_PROMPT, STAGE_2_CANDIDATE_IDS)
  }
];

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
