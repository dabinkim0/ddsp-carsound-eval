import { json, requireAdmin, toInt } from "../../_lib/http.js";

function mapCountRows(rows) {
  return rows.map((row) => ({
    label: row.label,
    count: toInt(row.count)
  }));
}

export async function onRequestGet(context) {
  const authError = requireAdmin(context.request, context.env);
  if (authError) {
    return authError;
  }

  const { env } = context;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const results = await env.DB.batch([
    env.DB.prepare(
      `
      SELECT
        COUNT(*) AS started,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM sessions
      `
    ),
    env.DB.prepare(
      `
      SELECT
        COUNT(*) AS total_responses,
        SUM(CASE WHEN is_warmup = 0 THEN 1 ELSE 0 END) AS main_responses,
        SUM(CASE WHEN is_warmup = 1 THEN 1 ELSE 0 END) AS warmup_responses
      FROM responses
      `
    ),
    env.DB.prepare(
      `
      SELECT
        selected_type AS label,
        COUNT(*) AS count
      FROM responses
      WHERE is_warmup = 0
      GROUP BY selected_type
      `
    ),
    env.DB.prepare("SELECT COUNT(*) AS count FROM sessions WHERE started_at >= ?").bind(dayAgo),
    env.DB.prepare(
      `
      SELECT age_group AS label, COUNT(*) AS count
      FROM sessions
      GROUP BY age_group
      ORDER BY age_group
      `
    ),
    env.DB.prepare(
      `
      SELECT gender AS label, COUNT(*) AS count
      FROM sessions
      GROUP BY gender
      ORDER BY gender
      `
    ),
    env.DB.prepare(
      `
      SELECT audio_expertise AS label, COUNT(*) AS count
      FROM sessions
      GROUP BY audio_expertise
      ORDER BY audio_expertise
      `
    ),
    env.DB.prepare(
      `
      SELECT driving_experience AS label, COUNT(*) AS count
      FROM sessions
      GROUP BY driving_experience
      ORDER BY driving_experience
      `
    ),
    env.DB.prepare(
      `
      SELECT
        s.id,
        s.participant_name,
        s.participant_email,
        s.status,
        s.started_at,
        s.completed_at,
        COUNT(r.trial_index) AS responses
      FROM sessions s
      LEFT JOIN responses r
        ON s.id = r.session_id AND r.is_warmup = 0
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT 12
      `
    )
  ]);

  const sessionRow = results[0].results[0] || {};
  const responseRow = results[1].results[0] || {};
  const preferenceRows = results[2].results || [];
  const recentRow = results[3].results[0] || {};
  const preferenceCounts = Object.fromEntries(
    preferenceRows.map((row) => [row.label, toInt(row.count)])
  );

  const proposed = preferenceCounts.proposed || 0;
  const baseline = preferenceCounts.baseline || 0;
  const mainResponses = toInt(responseRow.main_responses);
  const started = toInt(sessionRow.started);
  const completed = toInt(sessionRow.completed);

  return json({
    success: true,
    summary: {
      sessionsStarted: started,
      sessionsCompleted: completed,
      completionRate: started > 0 ? completed / started : 0,
      responsesRecorded: toInt(responseRow.total_responses),
      mainResponses,
      warmupResponses: toInt(responseRow.warmup_responses),
      startedLast24Hours: toInt(recentRow.count),
      proposedSelections: proposed,
      baselineSelections: baseline,
      proposedRate: mainResponses > 0 ? proposed / mainResponses : 0
    },
    demographics: {
      ageGroups: mapCountRows(results[4].results || []),
      genders: mapCountRows(results[5].results || []),
      audioExpertise: mapCountRows(results[6].results || []),
      drivingExperience: mapCountRows(results[7].results || [])
    },
    recentSessions: (results[8].results || []).map((row) => ({
      id: row.id,
      participantName: row.participant_name,
      participantEmail: row.participant_email,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      responses: toInt(row.responses)
    }))
  });
}
