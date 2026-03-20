import { getBody, requireMethod, sendError, sendJson, toInt } from "../lib/http.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

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
  const stageKey = String(body.stageKey || "").trim();
  const stageTitle = String(body.stageTitle || "").trim();
  const itemId = String(body.itemId || "").trim();
  const itemTitle = String(body.itemTitle || "").trim();
  const itemPosition = toInt(body.itemPosition);
  const ratings = Array.isArray(body.ratings) ? body.ratings : [];

  if (!sessionId || !stageKey || !itemId || ratings.length === 0) {
    sendError(res, 400, "sessionId, stageKey, itemId, and ratings are required.");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const responseRows = ratings.map((rating) => ({
      session_id: sessionId,
      stage_key: stageKey,
      stage_title: stageTitle || stageKey,
      item_id: itemId,
      item_title: itemTitle || itemId,
      item_position: itemPosition > 0 ? itemPosition : 1,
      candidate_slot: toInt(rating.candidateSlot),
      candidate_id: String(rating.candidateId || "").trim(),
      candidate_label: String(rating.candidateLabel || "").trim(),
      ground_truth_path: rating.groundTruthPath || null,
      candidate_path: rating.candidatePath || null,
      has_audio: Boolean(rating.hasAudio),
      score: Math.max(0, Math.min(100, toInt(rating.score))),
      created_at: now
    }));

    const { error } = await supabase.from("responses").upsert(responseRows, {
      onConflict: "session_id,item_id,candidate_slot"
    });

    if (error) {
      throw error;
    }

    sendJson(res, 200, {
      success: true
    });
  } catch (error) {
    sendError(res, 500, "Failed to save the stage ratings.", {
      details: error.message
    });
  }
}
