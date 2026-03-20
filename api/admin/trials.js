import { requireAdmin, requireMethod, sendError, sendJson } from "../../lib/http.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) {
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("get_admin_trial_stats");

    if (error) {
      throw error;
    }

    const trials = (data || []).map((row) => ({
      stageKey: row.stage_key,
      stageTitle: row.stage_title,
      itemId: row.item_id,
      itemTitle: row.item_title,
      candidateSlot: row.candidate_slot,
      candidateLabel: row.candidate_label,
      totalRatings: row.total_ratings,
      averageScore: row.average_score,
      hasAudio: row.has_audio
    }));

    sendJson(res, 200, {
      success: true,
      trials
    });
  } catch (error) {
    sendError(res, 500, "Failed to load per-trial statistics.", {
      details: error.message
    });
  }
}
