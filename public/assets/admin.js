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
  metricProposedRate: document.getElementById("metric-proposed-rate"),
  metricMainResponses: document.getElementById("metric-main-responses"),
  metricLast24Hours: document.getElementById("metric-last-24h"),
  baselineBar: document.getElementById("baseline-bar"),
  proposedBar: document.getElementById("proposed-bar"),
  baselineLabel: document.getElementById("baseline-label"),
  proposedLabel: document.getElementById("proposed-label"),
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

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

async function loadJson(path) {
  const response = await fetch(path, {
    headers: {
      authorization: `Bearer ${getToken()}`
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Failed to load dashboard data.");
  }

  return payload;
}

function renderList(target, rows) {
  target.innerHTML = rows
    .map((row) => `<li><span>${row.label}</span><strong>${row.count}</strong></li>`)
    .join("");
}

function renderSummary(payload) {
  const { summary, demographics, recentSessions } = payload;

  elements.metricStarted.textContent = summary.sessionsStarted;
  elements.metricCompleted.textContent = summary.sessionsCompleted;
  elements.metricCompletionRate.textContent = formatPercent(summary.completionRate);
  elements.metricProposedRate.textContent = formatPercent(summary.proposedRate);
  elements.metricMainResponses.textContent = summary.mainResponses;
  elements.metricLast24Hours.textContent = summary.startedLast24Hours;

  const totalPreference = summary.proposedSelections + summary.baselineSelections;
  const baselineWidth = totalPreference > 0 ? (summary.baselineSelections / totalPreference) * 100 : 50;
  const proposedWidth = totalPreference > 0 ? (summary.proposedSelections / totalPreference) * 100 : 50;

  elements.baselineBar.style.width = `${baselineWidth}%`;
  elements.proposedBar.style.width = `${proposedWidth}%`;
  elements.baselineBar.textContent = totalPreference > 0 ? `${baselineWidth.toFixed(1)}%` : "0%";
  elements.proposedBar.textContent = totalPreference > 0 ? `${proposedWidth.toFixed(1)}%` : "0%";
  elements.baselineLabel.textContent = `Baseline ${summary.baselineSelections}`;
  elements.proposedLabel.textContent = `Proposed ${summary.proposedSelections}`;

  renderList(elements.ageGroups, demographics.ageGroups);
  renderList(elements.genders, demographics.genders);
  renderList(elements.audioExpertise, demographics.audioExpertise);
  renderList(elements.drivingExperience, demographics.drivingExperience);

  elements.recentSessions.innerHTML = recentSessions
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
    .join("");
}

function renderTrials(payload) {
  elements.trialStats.innerHTML = payload.trials
    .map(
      (trial) => `
        <tr>
          <td>${trial.trialIndex}</td>
          <td>${trial.total}</td>
          <td>${trial.proposed}</td>
          <td>${trial.baseline}</td>
          <td>${formatPercent(trial.proposedRate)}</td>
          <td>${trial.avgResponseTimeMs ? `${(trial.avgResponseTimeMs / 1000).toFixed(1)}s` : "-"}</td>
        </tr>
      `
    )
    .join("");
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
