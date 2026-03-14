import { createSessionTrials, getTrialCounts } from "../_lib/trials.js";
import { errorResponse, json, readJson } from "../_lib/http.js";

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

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await readJson(request);

  if (!body) {
    return errorResponse(400, "Invalid JSON body.");
  }

  const participant = body.participant;
  const validationError = validateParticipant(participant);
  if (validationError) {
    return errorResponse(400, validationError);
  }

  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { warmupTrials, mainTrials, clientWarmupTrials, clientMainTrials } = createSessionTrials();
  const counts = getTrialCounts();

  const statements = [
    env.DB.prepare(
      `
      INSERT INTO sessions (
        id,
        participant_name,
        participant_email,
        age_group,
        gender,
        audio_expertise,
        driving_experience,
        total_main_trials,
        total_warmup_trials,
        started_at,
        user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).bind(
      sessionId,
      String(participant.name).trim(),
      String(participant.email).trim(),
      String(participant.ageGroup).trim(),
      String(participant.gender).trim(),
      String(participant.audioExpertise).trim(),
      String(participant.drivingExperience).trim(),
      counts.main,
      counts.warmup,
      now,
      request.headers.get("user-agent") || ""
    )
  ];

  for (const trial of [...warmupTrials, ...mainTrials]) {
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO assignments (
          session_id,
          phase,
          trial_index,
          position,
          reference_path,
          sample_a_path,
          sample_b_path,
          sample_a_type,
          sample_b_type,
          is_warmup,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).bind(
        sessionId,
        trial.phase,
        trial.trialIndex,
        trial.position,
        trial.referencePath,
        trial.sampleAPath,
        trial.sampleBPath,
        trial.sampleAType,
        trial.sampleBType,
        trial.isWarmup ? 1 : 0,
        now
      )
    );
  }

  await env.DB.batch(statements);

  return json({
    success: true,
    sessionId,
    warmupTrials: clientWarmupTrials,
    mainTrials: clientMainTrials,
    counts
  });
}
