import { createStagePayload, getEvaluationCounts } from "../lib/evaluation-config.js";
import { getBody, requireMethod, sendError, sendJson } from "../lib/http.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

function validateParticipant(participant) {
  if (!participant || typeof participant !== "object") {
    return "Participant data is required.";
  }

  const requiredFields = [
    "name",
    "email",
    "ageGroup",
    "gender",
    "audioExpertise",
    "drivingExperience"
  ];

  for (const field of requiredFields) {
    if (!participant[field] || !String(participant[field]).trim()) {
      return `${field} is required.`;
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) {
    return;
  }

  const body = getBody(req);
  if (!body) {
    sendError(res, 400, "Invalid JSON body.");
    return;
  }

  const participant = body.participant;
  const validationError = validateParticipant(participant);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const stages = createStagePayload();
    const counts = getEvaluationCounts();

    const { error: sessionError } = await supabase.from("sessions").insert({
      id: sessionId,
      participant_name: String(participant.name).trim(),
      participant_email: String(participant.email).trim(),
      age_group: String(participant.ageGroup).trim(),
      gender: String(participant.gender).trim(),
      audio_expertise: String(participant.audioExpertise).trim(),
      driving_experience: String(participant.drivingExperience).trim(),
      status: "started",
      total_main_trials: counts.itemCount,
      total_warmup_trials: 0,
      started_at: now,
      user_agent: req.headers["user-agent"] || ""
    });

    if (sessionError) {
      throw sessionError;
    }

    sendJson(res, 200, {
      success: true,
      sessionId,
      stages,
      counts
    });
  } catch (error) {
    sendError(res, 500, "Failed to start session.", {
      details: error.message
    });
  }
}
