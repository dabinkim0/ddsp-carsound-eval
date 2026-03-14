import { errorResponse, json, readJson } from "../_lib/http.js";

export async function onRequestPost(context) {
  const { env } = context;
  const body = await readJson(context.request);

  if (!body) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return errorResponse(400, "sessionId is required.");
  }

  const session = await env.DB.prepare("SELECT id, started_at FROM sessions WHERE id = ? LIMIT 1")
    .bind(sessionId)
    .first();

  if (!session) {
    return errorResponse(404, "Session not found.");
  }

  const completedAt = new Date().toISOString();

  await env.DB.prepare(
    `
    UPDATE sessions
    SET status = 'completed',
        completed_at = ?
    WHERE id = ?
    `
  )
    .bind(completedAt, sessionId)
    .run();

  return json({
    success: true,
    completedAt
  });
}
