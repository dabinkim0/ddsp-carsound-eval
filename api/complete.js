import { getBody, requireMethod, sendError, sendJson } from "../lib/http.js";
import { getSupabaseAdmin, requireMaybeSingle } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) {
    return;
  }

  const body = getBody(req);
  if (!body) {
    sendError(res, 400, "Invalid JSON body.");
    return;
  }

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    sendError(res, 400, "sessionId is required.");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const session = await requireMaybeSingle(
      supabase.from("sessions").select("id").eq("id", sessionId)
    );

    if (!session) {
      sendError(res, 404, "Session not found.");
      return;
    }

    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        completed_at: completedAt
      })
      .eq("id", sessionId);

    if (error) {
      throw error;
    }

    sendJson(res, 200, {
      success: true,
      completedAt
    });
  } catch (error) {
    sendError(res, 500, "Failed to complete the session.", {
      details: error.message
    });
  }
}
