import { errorResponse, json, readJson, toInt } from "../_lib/http.js";

export async function onRequestPost(context) {
  const { env } = context;
  const body = await readJson(context.request);

  if (!body) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const sessionId = String(body.sessionId || "").trim();
  const phase = String(body.phase || "").trim();
  const trialIndex = String(body.trialIndex || "").trim();
  const selectedOption = String(body.selectedOption || "").trim().toUpperCase();
  const responseTimeMs = toInt(body.responseTimeMs);

  if (!sessionId || !phase || !trialIndex || !["A", "B"].includes(selectedOption)) {
    return errorResponse(400, "sessionId, phase, trialIndex, and selectedOption are required.");
  }

  const assignment = await env.DB.prepare(
    `
    SELECT *
    FROM assignments
    WHERE session_id = ? AND phase = ? AND trial_index = ?
    LIMIT 1
    `
  )
    .bind(sessionId, phase, trialIndex)
    .first();

  if (!assignment) {
    return errorResponse(404, "Assignment not found for this session.");
  }

  const selectedType = selectedOption === "A" ? assignment.sample_a_type : assignment.sample_b_type;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `
    INSERT OR REPLACE INTO responses (
      session_id,
      phase,
      trial_index,
      selected_option,
      selected_type,
      reference_path,
      sample_a_path,
      sample_b_path,
      sample_a_type,
      sample_b_type,
      is_warmup,
      response_time_ms,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      sessionId,
      phase,
      trialIndex,
      selectedOption,
      selectedType,
      assignment.reference_path,
      assignment.sample_a_path,
      assignment.sample_b_path,
      assignment.sample_a_type,
      assignment.sample_b_type,
      assignment.is_warmup,
      responseTimeMs > 0 ? responseTimeMs : null,
      now
    )
    .run();

  return json({
    success: true,
    selectedType
  });
}
