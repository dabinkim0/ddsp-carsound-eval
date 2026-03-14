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
    const { data, error } = await supabase.rpc("get_admin_summary");

    if (error) {
      throw error;
    }

    sendJson(res, 200, {
      success: true,
      ...data
    });
  } catch (error) {
    sendError(res, 500, "Failed to load admin summary.", {
      details: error.message
    });
  }
}
