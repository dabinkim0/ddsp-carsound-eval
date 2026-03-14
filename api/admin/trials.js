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

    sendJson(res, 200, {
      success: true,
      trials: data || []
    });
  } catch (error) {
    sendError(res, 500, "Failed to load per-trial statistics.", {
      details: error.message
    });
  }
}
