const state = {
  sessionId: null,
  stages: [],
  stageIndex: 0,
  itemIndex: 0,
  instructionsHtml: "",
  ratingsByItem: {}
};

const elements = {
  formScreen: document.getElementById("form-screen"),
  stageIntroScreen: document.getElementById("stage-intro-screen"),
  testScreen: document.getElementById("test-screen"),
  stageOutroScreen: document.getElementById("stage-outro-screen"),
  thankyouScreen: document.getElementById("thankyou-screen"),
  form: document.getElementById("participant-form"),
  formError: document.getElementById("form-error"),
  phaseLabel: document.getElementById("phase-label"),
  progress: document.getElementById("progress"),
  question: document.getElementById("question"),
  submitStatus: document.getElementById("submit-status"),
  candidateList: document.getElementById("candidate-list"),
  groundTruthPlayer: document.getElementById("ground-truth-player"),
  backBtn: document.getElementById("back-btn"),
  saveRatingsBtn: document.getElementById("save-ratings-btn"),
  quickGuideBtn: document.getElementById("quick-guide-btn"),
  stageIntroKicker: document.getElementById("stage-intro-kicker"),
  stageIntroTitle: document.getElementById("stage-intro-title"),
  stageIntroBody: document.getElementById("stage-intro-body"),
  stageIntroBtn: document.getElementById("stage-intro-btn"),
  stageOutroKicker: document.getElementById("stage-outro-kicker"),
  stageOutroTitle: document.getElementById("stage-outro-title"),
  stageOutroBody: document.getElementById("stage-outro-body"),
  stageOutroBtn: document.getElementById("stage-outro-btn"),
  overlay: document.getElementById("instructions-overlay"),
  overlayContent: document.getElementById("instructions-content")
};

function currentStage() {
  return state.stages[state.stageIndex];
}

function currentItem() {
  const stage = currentStage();
  return stage ? stage.items[state.itemIndex] : null;
}

function getItemStateKey(stageKey, itemId) {
  return `${stageKey}::${itemId}`;
}

function buildDefaultRatings(item) {
  return item.candidates.map((candidate) => ({
    candidateSlot: candidate.candidateSlot,
    candidateId: candidate.candidateId,
    candidateLabel: candidate.displayLabel,
    candidatePath: candidate.path || null,
    groundTruthPath: item.groundTruth.path || null,
    hasAudio: Boolean(candidate.hasAudio),
    score: 50
  }));
}

function getStoredRatings(stage, item) {
  const key = getItemStateKey(stage.key, item.id);
  if (!state.ratingsByItem[key]) {
    state.ratingsByItem[key] = buildDefaultRatings(item);
  }

  return state.ratingsByItem[key];
}

function storeRatingsForCurrentItem(ratings) {
  const stage = currentStage();
  const item = currentItem();
  if (!stage || !item) {
    return;
  }

  state.ratingsByItem[getItemStateKey(stage.key, item.id)] = ratings.map((rating) => ({
    ...rating
  }));
}

function readCurrentRatings() {
  const item = currentItem();
  if (!item) {
    return [];
  }

  return Array.from(document.querySelectorAll(".mushra-slider")).map((slider) => ({
    candidateSlot: Number.parseInt(slider.dataset.candidateSlot, 10),
    candidateId: slider.dataset.candidateId,
    candidateLabel: slider.dataset.candidateLabel,
    candidatePath: slider.dataset.candidatePath || null,
    groundTruthPath: item.groundTruth.path || null,
    hasAudio: slider.dataset.hasAudio === "true",
    score: Number.parseInt(slider.value, 10)
  }));
}

function cacheCurrentRatingsFromDom() {
  const sliders = document.querySelectorAll(".mushra-slider");
  if (sliders.length === 0) {
    return;
  }

  storeRatingsForCurrentItem(readCurrentRatings());
}

function hasPreviousItem() {
  if (state.itemIndex > 0) {
    return true;
  }

  return state.stageIndex > 0 && Boolean(state.stages[state.stageIndex - 1]?.items?.length);
}

function showError(message) {
  if (!elements.formScreen.classList.contains("hidden")) {
    elements.formError.textContent = message;
    elements.formError.classList.remove("hidden");
    return;
  }

  window.alert(message);
}

function clearError() {
  elements.formError.textContent = "";
  elements.formError.classList.add("hidden");
}

function scrollPanelIntoView(panel) {
  if (!panel) {
    return;
  }

  window.requestAnimationFrame(() => {
    panel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function serializeParticipant() {
  const gender = document.querySelector('input[name="gender"]:checked');
  const audioExpertise = document.querySelector('input[name="audio_expertise"]:checked');
  const drivingExperience = document.querySelector('input[name="driving_experience"]:checked');

  return {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    ageGroup: document.getElementById("age").value,
    gender: gender ? gender.value : "",
    audioExpertise: audioExpertise ? audioExpertise.value : "",
    drivingExperience: drivingExperience ? drivingExperience.value : ""
  };
}

function renderAudioBlock(audioDescriptor, label) {
  if (!audioDescriptor?.hasAudio || !audioDescriptor?.path) {
    return `
      <div class="audio-placeholder audio-shell audio-shell-disabled" aria-disabled="true">
        <div class="audio-shell-controls">
          <span class="audio-shell-button">Play</span>
          <div class="audio-shell-track">
            <span class="audio-shell-progress"></span>
          </div>
          <span class="audio-shell-time">--:-- / --:--</span>
        </div>
        <p class="audio-placeholder-label">${label}</p>
        <p class="audio-placeholder-copy">Audio will be attached later.</p>
      </div>
    `;
  }

  return `
    <audio controls preload="none" src="${audioDescriptor.path}"></audio>
  `;
}

function getFallbackInstructionsHtml() {
  return `
    <div class="abx-intro">
      <h2>Quick guide</h2>
      <p>Listen to the Reference, then rate every candidate from 0 to 100 based on similarity.</p>
    </div>
  `;
}

async function ensureInstructionsHtml() {
  if (state.instructionsHtml) {
    return state.instructionsHtml;
  }

  const response = await fetch("/abx_instructions.html", { cache: "no-store" });
  state.instructionsHtml = response.ok ? await response.text() : getFallbackInstructionsHtml();
  return state.instructionsHtml;
}

async function openInstructionsOverlay(actionLabel = "Close") {
  const html = await ensureInstructionsHtml();
  elements.overlayContent.innerHTML = html;

  let button = elements.overlayContent.querySelector("#abx-intro-start");
  if (!button) {
    button = document.createElement("button");
    button.id = "abx-intro-start";
    button.className = "button button-primary";
    button.type = "button";
    button.style.marginTop = "18px";
    elements.overlayContent.appendChild(button);
  }

  button.textContent = actionLabel;
  elements.overlay.classList.remove("hidden");

  await new Promise((resolve) => {
    button.addEventListener(
      "click",
      () => {
        elements.overlay.classList.add("hidden");
        elements.overlayContent.innerHTML = "";
        resolve();
      },
      { once: true }
    );
  });
}

async function loadInstructions() {
  await openInstructionsOverlay("Start");
}

function showStageIntro() {
  const stage = currentStage();
  if (!stage) {
    completeSession();
    return;
  }

  elements.testScreen.classList.add("hidden");
  elements.stageOutroScreen.classList.add("hidden");
  elements.stageIntroKicker.textContent = stage.title;
  elements.stageIntroTitle.textContent = stage.introTitle;
  elements.stageIntroBody.textContent = stage.introBody;
  elements.stageIntroScreen.classList.remove("hidden");
  scrollPanelIntoView(elements.stageIntroScreen);
}

function showStageOutro() {
  const stage = currentStage();
  if (!stage) {
    completeSession();
    return;
  }

  elements.testScreen.classList.add("hidden");
  elements.stageIntroScreen.classList.add("hidden");
  elements.stageOutroKicker.textContent = stage.title;
  elements.stageOutroTitle.textContent = stage.outroTitle;
  elements.stageOutroBody.textContent = stage.outroBody;
  elements.stageOutroScreen.classList.remove("hidden");
  scrollPanelIntoView(elements.stageOutroScreen);
}

function renderItem() {
  const stage = currentStage();
  const item = currentItem();

  if (!stage || !item) {
    showStageOutro();
    return;
  }

  elements.phaseLabel.textContent = stage.title;
  elements.progress.textContent = `${stage.title} item ${item.position} of ${stage.items.length}`;
  elements.question.textContent = item.prompt;
  elements.groundTruthPlayer.innerHTML = renderAudioBlock(item.groundTruth, "Reference");
  elements.backBtn.disabled = !hasPreviousItem();

  const ratingsBySlot = new Map(
    getStoredRatings(stage, item).map((rating) => [rating.candidateSlot, rating.score])
  );

  elements.candidateList.innerHTML = item.candidates
    .map(
      (candidate) => {
        const sliderValue = ratingsBySlot.get(candidate.candidateSlot) ?? 50;

        return `
        <article class="audio-card candidate-card" data-candidate-slot="${candidate.candidateSlot}">
          <div class="candidate-card-head">
            <div>
              <p class="audio-title">${candidate.displayLabel}</p>
            </div>
            <div class="slider-value" id="slider-value-${candidate.candidateSlot}">${sliderValue}</div>
          </div>
          <div class="candidate-player">
            ${renderAudioBlock(candidate, candidate.displayLabel)}
          </div>
          <label class="slider-block">
            <input
              class="mushra-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value="${sliderValue}"
              data-candidate-id="${candidate.candidateId}"
              data-candidate-slot="${candidate.candidateSlot}"
              data-candidate-label="${candidate.displayLabel}"
              data-candidate-path="${candidate.path || ""}"
              data-has-audio="${candidate.hasAudio ? "true" : "false"}"
            >
            <div class="slider-scale">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </label>
        </article>
      `;
      }
    )
    .join("");

  for (const slider of document.querySelectorAll(".mushra-slider")) {
    slider.addEventListener("input", (event) => {
      const target = event.currentTarget;
      const slot = target.dataset.candidateSlot;
      const valueNode = document.getElementById(`slider-value-${slot}`);
      if (valueNode) {
        valueNode.textContent = target.value;
      }

      cacheCurrentRatingsFromDom();
    });
  }

  elements.stageIntroScreen.classList.add("hidden");
  elements.stageOutroScreen.classList.add("hidden");
  elements.testScreen.classList.remove("hidden");
  scrollPanelIntoView(elements.testScreen);
}

async function submitCurrentItem() {
  const stage = currentStage();
  const item = currentItem();
  if (!stage || !item) {
    return;
  }

  const ratings = readCurrentRatings();
  storeRatingsForCurrentItem(ratings);

  elements.backBtn.disabled = true;
  elements.saveRatingsBtn.disabled = true;

  try {
    const response = await fetch("/api/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionId,
        stageKey: stage.key,
        stageTitle: stage.title,
        itemId: item.id,
        itemTitle: item.title,
        itemPosition: item.position,
        ratings
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      if (payload?.details) {
        console.error("Failed to save item ratings:", payload.details);
      }
      throw new Error(payload?.message || "Failed to save.");
    }

    if (state.itemIndex < stage.items.length - 1) {
      state.itemIndex += 1;
      renderItem();
      return;
    }

    showStageOutro();
  } finally {
    elements.backBtn.disabled = !hasPreviousItem();
    elements.saveRatingsBtn.disabled = false;
  }
}

function goToPreviousItem() {
  if (!hasPreviousItem()) {
    return;
  }

  cacheCurrentRatingsFromDom();

  if (state.itemIndex > 0) {
    state.itemIndex -= 1;
    renderItem();
    return;
  }

  state.stageIndex -= 1;
  state.itemIndex = currentStage().items.length - 1;
  renderItem();
}

async function completeSession() {
  const successMessage =
    "Your responses have been successfully recorded. Thank you for your participation. You may close this tab.";

  elements.testScreen.classList.add("hidden");
  elements.stageIntroScreen.classList.add("hidden");
  elements.stageOutroScreen.classList.add("hidden");
  elements.thankyouScreen.classList.remove("hidden");
  elements.submitStatus.textContent = successMessage;
  scrollPanelIntoView(elements.thankyouScreen);

  const response = await fetch("/api/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: state.sessionId })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    elements.submitStatus.textContent = payload?.message || "Results could not be finalized.";
    return;
  }

  elements.submitStatus.textContent = successMessage;
}

async function startSession(event) {
  event.preventDefault();
  clearError();

  const participant = serializeParticipant();
  const response = await fetch("/api/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ participant })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    showError(payload?.message || "Failed to start the evaluation.");
    return;
  }

  state.sessionId = payload.sessionId;
  state.stages = payload.stages || [];
  state.stageIndex = 0;
  state.itemIndex = 0;
  state.ratingsByItem = {};

  elements.formScreen.classList.add("hidden");
  await loadInstructions();
  showStageIntro();
}

elements.form.addEventListener("submit", (event) => {
  startSession(event).catch((error) => {
    showError(error.message);
  });
});

elements.saveRatingsBtn.addEventListener("click", () => {
  submitCurrentItem().catch((error) => {
    showError(error.message);
  });
});

elements.backBtn.addEventListener("click", () => {
  goToPreviousItem();
});

elements.quickGuideBtn.addEventListener("click", () => {
  openInstructionsOverlay("Close").catch((error) => {
    showError(error.message);
  });
});

elements.stageIntroBtn.addEventListener("click", () => {
  state.itemIndex = 0;
  renderItem();
});

elements.stageOutroBtn.addEventListener("click", () => {
  if (state.stageIndex < state.stages.length - 1) {
    state.stageIndex += 1;
    state.itemIndex = 0;
    showStageIntro();
    return;
  }

  completeSession().catch((error) => {
    showError(error.message);
  });
});
