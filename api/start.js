import { createSessionTrials, getTrialCounts } from "../lib/trials.js";
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
    const { warmupTrials, mainTrials, clientWarmupTrials, clientMainTrials } = createSessionTrials();
    const counts = getTrialCounts();

    const { error: sessionError } = await supabase.from("sessions").insert({
      id: sessionId,
      participant_name: String(participant.name).trim(),
      participant_email: String(participant.email).trim(),
      age_group: String(participant.ageGroup).trim(),
      gender: String(participant.gender).trim(),
      audio_expertise: String(participant.audioExpertise).trim(),
      driving_experience: String(participant.drivingExperience).trim(),
      status: "started",
      total_main_trials: counts.main,
      total_warmup_trials: counts.warmup,
      started_at: now,
      user_agent: req.headers["user-agent"] || ""
    });

    if (sessionError) {
      throw sessionError;
    }

    const assignments = [...warmupTrials, ...mainTrials].map((trial) => ({
      session_id: sessionId,
      phase: trial.phase,
      trial_index: trial.trialIndex,
      position: trial.position,
      reference_path: trial.referencePath,
      sample_a_path: trial.sampleAPath,
      sample_b_path: trial.sampleBPath,
      sample_a_type: trial.sampleAType,
      sample_b_type: trial.sampleBType,
      is_warmup: trial.isWarmup,
      created_at: now
    }));

    const { error: assignmentError } = await supabase.from("assignments").insert(assignments);
    if (assignmentError) {
      throw assignmentError;
    }

    sendJson(res, 200, {
      success: true,
      sessionId,
      warmupTrials: clientWarmupTrials,
      mainTrials: clientMainTrials,
      counts
    });
  } catch (error) {
    sendError(res, 500, "Failed to start session.", {
      details: error.message
    });
  }
}
