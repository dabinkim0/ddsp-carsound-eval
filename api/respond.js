import { getBody, requireMethod, sendError, sendJson, toInt } from "../lib/http.js";
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
  const phase = String(body.phase || "").trim();
  const trialIndex = String(body.trialIndex || "").trim();
  const selectedOption = String(body.selectedOption || "").trim().toUpperCase();
  const responseTimeMs = toInt(body.responseTimeMs);

  if (!sessionId || !phase || !trialIndex || !["A", "B"].includes(selectedOption)) {
    sendError(res, 400, "sessionId, phase, trialIndex, and selectedOption are required.");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const assignment = await requireMaybeSingle(
      supabase
        .from("assignments")
        .select("*")
        .eq("session_id", sessionId)
        .eq("phase", phase)
        .eq("trial_index", trialIndex)
    );

    if (!assignment) {
      sendError(res, 404, "Assignment not found for this session.");
      return;
    }

    const selectedType = selectedOption === "A" ? assignment.sample_a_type : assignment.sample_b_type;
    const { error } = await supabase.from("responses").upsert(
      {
        session_id: sessionId,
        phase,
        trial_index: trialIndex,
        selected_option: selectedOption,
        selected_type: selectedType,
        reference_path: assignment.reference_path,
        sample_a_path: assignment.sample_a_path,
        sample_b_path: assignment.sample_b_path,
        sample_a_type: assignment.sample_a_type,
        sample_b_type: assignment.sample_b_type,
        is_warmup: assignment.is_warmup,
        response_time_ms: responseTimeMs > 0 ? responseTimeMs : null,
        created_at: new Date().toISOString()
      },
      {
        onConflict: "session_id,phase,trial_index"
      }
    );

    if (error) {
      throw error;
    }

    sendJson(res, 200, {
      success: true,
      selectedType
    });
  } catch (error) {
    sendError(res, 500, "Failed to save the response.", {
      details: error.message
    });
  }
}
