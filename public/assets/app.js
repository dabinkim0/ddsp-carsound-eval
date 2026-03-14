const state = {
  sessionId: null,
  warmupTrials: [],
  mainTrials: [],
  phase: "warmup",
  currentIndex: 0,
  questionStartedAt: 0
};

const elements = {
  formScreen: document.getElementById("form-screen"),
  testScreen: document.getElementById("test-screen"),
  warmupEndScreen: document.getElementById("warmup-end-screen"),
  thankyouScreen: document.getElementById("thankyou-screen"),
  form: document.getElementById("participant-form"),
  formError: document.getElementById("form-error"),
  phaseLabel: document.getElementById("phase-label"),
  progress: document.getElementById("progress"),
  question: document.getElementById("question"),
  submitStatus: document.getElementById("submit-status"),
  audioRef: document.getElementById("audio-ref"),
  audioA: document.getElementById("audio-a"),
  audioB: document.getElementById("audio-b"),
  btnA: document.getElementById("btn-a"),
  btnB: document.getElementById("btn-b"),
  warmupProceed: document.getElementById("warmup-proceed-btn"),
  overlay: document.getElementById("instructions-overlay"),
  overlayContent: document.getElementById("instructions-content")
};

function activeTrials() {
  return state.phase === "warmup" ? state.warmupTrials : state.mainTrials;
}

function currentTrial() {
  return activeTrials()[state.currentIndex];
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

async function loadInstructions() {
  const response = await fetch("/abx_instructions.html", { cache: "no-store" });
  const html = response.ok
    ? await response.text()
    : `
      <div class="abx-intro">
        <h2>Quick guide</h2>
        <p>Please listen to the reference, then compare sample A and sample B.</p>
        <button id="instructions-accept" class="button button-primary" type="button">Start</button>
      </div>
    `;

  elements.overlayContent.innerHTML = html;
  let button = elements.overlayContent.querySelector("#abx-intro-start");
  if (!button) {
    button = document.createElement("button");
    button.id = "instructions-accept";
    button.className = "button button-primary";
    button.type = "button";
    button.textContent = "Start";
    button.style.marginTop = "18px";
    elements.overlayContent.appendChild(button);
  }

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

function renderTrial() {
  const trials = activeTrials();
  const trial = currentTrial();

  if (!trial || state.currentIndex >= trials.length) {
    if (state.phase === "warmup") {
      elements.testScreen.classList.add("hidden");
      elements.warmupEndScreen.classList.remove("hidden");
    } else {
      completeSession();
    }
    return;
  }

  elements.phaseLabel.textContent = state.phase === "warmup" ? "Warm-up" : "Main evaluation";
  elements.progress.textContent = state.phase === "warmup"
    ? `Warm-up ${state.currentIndex + 1} of ${trials.length}`
    : `Trial ${state.currentIndex + 1} of ${trials.length}`;
  elements.question.textContent = "Which sample is closer to the reference?";
  elements.audioRef.src = trial.reference;
  elements.audioA.src = trial.sampleA;
  elements.audioB.src = trial.sampleB;
  elements.btnA.disabled = false;
  elements.btnB.disabled = false;
  state.questionStartedAt = performance.now();
}

async function submitChoice(selectedOption) {
  const trial = currentTrial();
  if (!trial) {
    return;
  }

  elements.btnA.disabled = true;
  elements.btnB.disabled = true;

  const responseTimeMs = Math.round(performance.now() - state.questionStartedAt);

  const response = await fetch("/api/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: state.sessionId,
      phase: state.phase,
      trialIndex: trial.index,
      selectedOption,
      responseTimeMs
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to save the response.");
  }

  state.currentIndex += 1;
  renderTrial();
}

async function completeSession() {
  elements.testScreen.classList.add("hidden");
  elements.warmupEndScreen.classList.add("hidden");
  elements.thankyouScreen.classList.remove("hidden");
  elements.submitStatus.textContent = "Submitting results...";

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

  elements.submitStatus.textContent = "Your responses were recorded successfully. You may close this tab.";
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
  state.warmupTrials = payload.warmupTrials || [];
  state.mainTrials = payload.mainTrials || [];
  state.phase = state.warmupTrials.length > 0 ? "warmup" : "main";
  state.currentIndex = 0;

  elements.formScreen.classList.add("hidden");
  await loadInstructions();
  elements.testScreen.classList.remove("hidden");
  renderTrial();
}

elements.form.addEventListener("submit", (event) => {
  startSession(event).catch((error) => {
    showError(error.message);
  });
});

elements.btnA.addEventListener("click", () => {
  submitChoice("A").catch((error) => {
    showError(error.message);
  });
});

elements.btnB.addEventListener("click", () => {
  submitChoice("B").catch((error) => {
    showError(error.message);
  });
});

elements.warmupProceed.addEventListener("click", () => {
  state.phase = "main";
  state.currentIndex = 0;
  elements.warmupEndScreen.classList.add("hidden");
  elements.testScreen.classList.remove("hidden");
  renderTrial();
});
