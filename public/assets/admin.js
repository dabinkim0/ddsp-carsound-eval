const TOKEN_KEY = "ddsp-carsound-admin-token";
const REFRESH_INTERVAL_MS = 30_000;

const CANDIDATE_LABELS = {
  stage1: {
    reference_test: "Reference Test",
    c2_direct: "C2 Direct",
    c1_direct: "C1 Direct",
    c2_encoder: "C2 Encoder",
    c1_encoder: "C1 Encoder"
  },
  stage2: {
    reference_test: "Reference Test",
    c1_direct_rpm: "C1 Direct RPM",
    c1_encoder_rpm: "C1 Encoder RPM",
    c1_direct_rpm_pedal_gear: "C1 Direct RPM + Pedal + Gear",
    c1_encoder_rpm_pedal_gear: "C1 Encoder RPM + Pedal + Gear",
    c1_direct_full: "C1 Direct Full",
    c1_encoder_full: "C1 Encoder Full"
  }
};

const CANDIDATE_ORDER = {
  stage1: ["reference_test", "c2_direct", "c1_direct", "c2_encoder", "c1_encoder"],
  stage2: [
    "reference_test",
    "c1_direct_rpm",
    "c1_encoder_rpm",
    "c1_direct_rpm_pedal_gear",
    "c1_encoder_rpm_pedal_gear",
    "c1_direct_full",
    "c1_encoder_full"
  ]
};

const elements = {
  tokenInput: document.getElementById("admin-token"),
  loadButton: document.getElementById("load-dashboard-btn"),
  clearButton: document.getElementById("clear-token-btn"),
  status: document.getElementById("admin-status"),
  dashboard: document.getElementById("admin-dashboard"),
  metricStarted: document.getElementById("metric-started"),
  metricCompleted: document.getElementById("metric-completed"),
  metricCompletionRate: document.getElementById("metric-completion-rate"),
  metricAverageScore: document.getElementById("metric-average-score"),
  metricRatingsRecorded: document.getElementById("metric-ratings-recorded"),
  metricLast24Hours: document.getElementById("metric-last-24h"),
  stageAverages: document.getElementById("stage-averages"),
  testACandidateAverages: document.getElementById("test-a-candidate-averages"),
  testBCandidateAverages: document.getElementById("test-b-candidate-averages"),
  ageGroups: document.getElementById("age-groups"),
  genders: document.getElementById("genders"),
  audioExpertise: document.getElementById("audio-expertise"),
  drivingExperience: document.getElementById("driving-experience"),
  recentSessions: document.getElementById("recent-sessions"),
  trialStats: document.getElementById("trial-stats")
};

let refreshHandle = null;

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(1);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function encodeToken(token) {
  const bytes = new TextEncoder().encode(token);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

async function loadJson(path) {
  const token = getToken();
  const response = await fetch(path, {
    headers: {
      "x-admin-token-b64": encodeToken(token)
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to load dashboard data.");
  }

  return payload;
}

function renderList(target, rows) {
  if (!rows.length) {
    target.innerHTML = '<li><span>No data yet</span><strong>-</strong></li>';
    return;
  }

  target.innerHTML = rows
    .map((row) => `<li><span>${row.label}</span><strong>${row.count}</strong></li>`)
    .join("");
}

function getCandidateLabel(stageKey, candidateId) {
  return CANDIDATE_LABELS[stageKey]?.[candidateId] || candidateId;
}

function getCandidateOrder(stageKey, candidateId) {
  const order = CANDIDATE_ORDER[stageKey] || [];
  const index = order.indexOf(candidateId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function buildCandidateAverageGroups(trials) {
  const stages = new Map();

  for (const trial of trials) {
    if (!stages.has(trial.stageKey)) {
      stages.set(trial.stageKey, {
        stageTitle: trial.stageTitle,
        candidates: new Map()
      });
    }

    const stage = stages.get(trial.stageKey);
    if (!stage.candidates.has(trial.candidateId)) {
      stage.candidates.set(trial.candidateId, {
        candidateId: trial.candidateId,
        candidateLabel: getCandidateLabel(trial.stageKey, trial.candidateId),
        totalRatings: 0,
        scoreSum: 0
      });
    }

    const candidate = stage.candidates.get(trial.candidateId);
    const totalRatings = Number(trial.totalRatings) || 0;
    const averageScore = Number(trial.averageScore) || 0;

    candidate.totalRatings += totalRatings;
    candidate.scoreSum += averageScore * totalRatings;
  }

  return new Map(
    Array.from(stages.entries()).map(([stageKey, stage]) => [
      stageKey,
      Array.from(stage.candidates.values())
        .map((candidate) => ({
          candidateId: candidate.candidateId,
          candidateLabel: candidate.candidateLabel,
          averageScore: candidate.totalRatings ? candidate.scoreSum / candidate.totalRatings : null
        }))
        .sort(
          (left, right) =>
            getCandidateOrder(stageKey, left.candidateId) - getCandidateOrder(stageKey, right.candidateId)
        )
    ])
  );
}

function renderCandidateAverages(target, candidates) {
  if (!candidates.length) {
    target.innerHTML = '<li><span>No ratings yet</span><strong>-</strong></li>';
    return;
  }

  target.innerHTML = candidates
    .map(
      (candidate) => `
        <li>
          <span>${candidate.candidateLabel}</span>
          <strong>${formatScore(candidate.averageScore)}</strong>
        </li>
      `
    )
    .join("");
}

function renderSummary(payload) {
  const {
    summary = {},
    demographics = {},
    recentSessions = [],
    stageAverages = []
  } = payload;
  const ageGroups = demographics.ageGroups || [];
  const genders = demographics.genders || [];
  const audioExpertise = demographics.audioExpertise || [];
  const drivingExperience = demographics.drivingExperience || [];

  elements.metricStarted.textContent = summary.sessionsStarted ?? 0;
  elements.metricCompleted.textContent = summary.sessionsCompleted ?? 0;
  elements.metricCompletionRate.textContent = formatPercent(summary.completionRate ?? 0);
  elements.metricAverageScore.textContent = formatScore(summary.averageScore);
  elements.metricRatingsRecorded.textContent = summary.ratingsRecorded ?? 0;
  elements.metricLast24Hours.textContent = summary.startedLast24Hours ?? 0;

  elements.stageAverages.innerHTML = stageAverages.length
    ? stageAverages
        .map(
          (stage) => `
            <li>
              <span>${stage.stageTitle}</span>
              <strong>${formatScore(stage.averageScore)} / 100</strong>
            </li>
          `
        )
        .join("")
    : '<li><span>No ratings yet</span><strong>-</strong></li>';

  renderList(elements.ageGroups, ageGroups);
  renderList(elements.genders, genders);
  renderList(elements.audioExpertise, audioExpertise);
  renderList(elements.drivingExperience, drivingExperience);

  elements.recentSessions.innerHTML = recentSessions.length
    ? recentSessions
        .map(
          (session) => `
            <tr>
              <td>${session.participantName}</td>
              <td>${session.participantEmail}</td>
              <td>${session.status}</td>
              <td>${session.responses}</td>
              <td>${formatDate(session.startedAt)}</td>
              <td>${formatDate(session.completedAt)}</td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td colspan="6">No sessions yet.</td>
        </tr>
      `;
}

function renderTrials(payload) {
  const trials = payload.trials || [];
  const candidateAverageGroups = buildCandidateAverageGroups(trials);

  renderCandidateAverages(elements.testACandidateAverages, candidateAverageGroups.get("stage1") || []);
  renderCandidateAverages(elements.testBCandidateAverages, candidateAverageGroups.get("stage2") || []);

  elements.trialStats.innerHTML = trials.length
    ? trials
        .map(
          (trial) => `
            <tr>
              <td>${trial.stageTitle}</td>
              <td>${trial.itemTitle}</td>
              <td>${getCandidateLabel(trial.stageKey, trial.candidateId)}</td>
              <td>${trial.totalRatings}</td>
              <td>${formatScore(trial.averageScore)}</td>
              <td>${trial.hasAudio ? "Yes" : "No"}</td>
            </tr>
          `
        )
        .join("")
    : `
        <tr>
          <td colspan="6">No ratings yet.</td>
        </tr>
      `;
}

async function refreshDashboard() {
  const [summary, trials] = await Promise.all([
    loadJson("/api/admin/summary"),
    loadJson("/api/admin/trials")
  ]);

  renderSummary(summary);
  renderTrials(trials);
  elements.dashboard.classList.remove("hidden");
  setStatus(`Last updated: ${new Date().toLocaleTimeString()}`);
}

function startRefreshLoop() {
  if (refreshHandle) {
    clearInterval(refreshHandle);
  }

  refreshHandle = setInterval(() => {
    refreshDashboard().catch((error) => {
      setStatus(error.message, true);
    });
  }, REFRESH_INTERVAL_MS);
}

elements.loadButton.addEventListener("click", () => {
  const token = elements.tokenInput.value.trim();
  if (!token) {
    setStatus("Admin token is required.", true);
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  refreshDashboard()
    .then(() => {
      startRefreshLoop();
    })
    .catch((error) => {
      setStatus(error.message, true);
    });
});

elements.clearButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  elements.tokenInput.value = "";
  elements.dashboard.classList.add("hidden");
  setStatus("Stored token cleared.");
});

const savedToken = getToken();
if (savedToken) {
  elements.tokenInput.value = savedToken;
  refreshDashboard()
    .then(() => {
      startRefreshLoop();
    })
    .catch((error) => {
      setStatus(error.message, true);
    });
}
