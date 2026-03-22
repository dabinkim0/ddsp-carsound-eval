const TOKEN_KEY = "ddsp-carsound-admin-token";
const REFRESH_INTERVAL_MS = 30_000;

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
  testAItemAverages: document.getElementById("test-a-item-averages"),
  testBItemAverages: document.getElementById("test-b-item-averages"),
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

function buildItemAverageGroups(trials) {
  const stages = new Map();

  for (const trial of trials) {
    if (!stages.has(trial.stageKey)) {
      stages.set(trial.stageKey, {
        stageTitle: trial.stageTitle,
        items: new Map()
      });
    }

    const stage = stages.get(trial.stageKey);
    if (!stage.items.has(trial.itemId)) {
      stage.items.set(trial.itemId, {
        itemTitle: trial.itemTitle,
        totalRatings: 0,
        scoreSum: 0
      });
    }

    const item = stage.items.get(trial.itemId);
    const totalRatings = Number(trial.totalRatings) || 0;
    const averageScore = Number(trial.averageScore) || 0;

    item.totalRatings += totalRatings;
    item.scoreSum += averageScore * totalRatings;
  }

  return new Map(
    Array.from(stages.entries()).map(([stageKey, stage]) => [
      stageKey,
      Array.from(stage.items.values()).map((item) => ({
        itemTitle: item.itemTitle.replace(`${stage.stageTitle} `, ""),
        averageScore: item.totalRatings ? item.scoreSum / item.totalRatings : null
      }))
    ])
  );
}

function renderItemAverages(target, items) {
  if (!items.length) {
    target.innerHTML = '<li><span>No ratings yet</span><strong>-</strong></li>';
    return;
  }

  target.innerHTML = items
    .map(
      (item) => `
        <li>
          <span>${item.itemTitle}</span>
          <strong>${formatScore(item.averageScore)}</strong>
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
  const itemAverageGroups = buildItemAverageGroups(trials);

  renderItemAverages(elements.testAItemAverages, itemAverageGroups.get("stage1") || []);
  renderItemAverages(elements.testBItemAverages, itemAverageGroups.get("stage2") || []);

  elements.trialStats.innerHTML = trials.length
    ? trials
        .map(
          (trial) => `
            <tr>
              <td>${trial.stageTitle}</td>
              <td>${trial.itemTitle}</td>
              <td>${trial.candidateId}</td>
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
