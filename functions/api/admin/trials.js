import { json, requireAdmin, toInt } from "../../_lib/http.js";

export async function onRequestGet(context) {
  const authError = requireAdmin(context.request, context.env);
  if (authError) {
    return authError;
  }

  const rows = await context.env.DB.prepare(
    `
    SELECT
      trial_index,
      COUNT(*) AS total,
      SUM(CASE WHEN selected_type = 'proposed' THEN 1 ELSE 0 END) AS proposed,
      SUM(CASE WHEN selected_type = 'baseline' THEN 1 ELSE 0 END) AS baseline,
      AVG(response_time_ms) AS avg_response_time_ms
    FROM responses
    WHERE is_warmup = 0
    GROUP BY trial_index
    ORDER BY CAST(trial_index AS INTEGER)
    `
  ).all();

  const trials = (rows.results || []).map((row) => {
    const total = toInt(row.total);
    const proposed = toInt(row.proposed);
    const baseline = toInt(row.baseline);
    const avgResponseTimeMs = row.avg_response_time_ms ? Math.round(Number(row.avg_response_time_ms)) : null;

    return {
      trialIndex: row.trial_index,
      total,
      proposed,
      baseline,
      proposedRate: total > 0 ? proposed / total : 0,
      avgResponseTimeMs
    };
  });

  return json({
    success: true,
    trials
  });
}
