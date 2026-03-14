import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "CarSound_exps",
  "Subjective Eval",
  "results"
);

const DEFAULT_OUTPUT_FILE = path.resolve(__dirname, "..", "legacy_results_import.sql");

function parseArgs(argv) {
  const options = {
    inputDir: DEFAULT_INPUT_DIR,
    outputFile: DEFAULT_OUTPUT_FILE
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input-dir" && argv[i + 1]) {
      options.inputDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--output" && argv[i + 1]) {
      options.outputFile = path.resolve(argv[i + 1]);
      i += 1;
    }
  }

  return options;
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "NULL";
  }
  return String(Math.trunc(Number(value)));
}

function normalizeIndex(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).padStart(3, "0");
}

function deriveTimestamp(data, fallback) {
  return data.serverReceivedAt || data.createdAt || fallback;
}

function deriveStartedAt(results, fallback) {
  const first = results.find((item) => item.timestamp)?.timestamp;
  return first || fallback;
}

function buildStatements(filePath, data) {
  const basename = path.basename(filePath, ".json");
  const sessionId = basename.replace(/^result_/, "legacy_");
  const results = Array.isArray(data.results) ? data.results : [];
  const completedAt = deriveTimestamp(data, new Date().toISOString());
  const startedAt = deriveStartedAt(results, completedAt);
  const participant = data.user || {};
  const totalMainTrials = Number.isInteger(data.totalTrials) ? data.totalTrials : results.length;

  const statements = [];

  statements.push(
    `INSERT OR REPLACE INTO sessions (
      id,
      participant_name,
      participant_email,
      age_group,
      gender,
      audio_expertise,
      driving_experience,
      status,
      total_main_trials,
      total_warmup_trials,
      started_at,
      completed_at,
      user_agent
    ) VALUES (
      ${sqlString(sessionId)},
      ${sqlString(participant.name || "")},
      ${sqlString(participant.email || "")},
      ${sqlString(participant.ageGroup || "")},
      ${sqlString(participant.gender || "")},
      ${sqlString(participant.audioExpertise || "")},
      ${sqlString(participant.drivingExperience || "")},
      'completed',
      ${sqlInteger(totalMainTrials)},
      0,
      ${sqlString(startedAt)},
      ${sqlString(completedAt)},
      ${sqlString(data.userAgent || "")}
    );`
  );

  for (const item of results) {
    const trialIndex = normalizeIndex(item.index);
    if (!trialIndex) {
      continue;
    }

    const timestamp = item.timestamp || completedAt;
    const selectedOption = String(item.selected || "").toUpperCase();
    const selectedType = item.selectedType || (selectedOption === "A" ? item.aType : item.bType) || "";

    statements.push(
      `INSERT OR REPLACE INTO assignments (
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
      ) VALUES (
        ${sqlString(sessionId)},
        'main',
        ${sqlString(trialIndex)},
        ${sqlInteger(item.trialNumber)},
        ${sqlString(item.reference || "")},
        ${sqlString(item.sampleA || "")},
        ${sqlString(item.sampleB || "")},
        ${sqlString(item.aType || "")},
        ${sqlString(item.bType || "")},
        0,
        ${sqlString(timestamp)}
      );`
    );

    statements.push(
      `INSERT OR REPLACE INTO responses (
        session_id,
        phase,
        trial_index,
        selected_option,
        selected_type,
        reference_path,
        sample_a_path,
        sample_b_path,
        sample_a_type,
        sample_b_type,
        is_warmup,
        response_time_ms,
        created_at
      ) VALUES (
        ${sqlString(sessionId)},
        'main',
        ${sqlString(trialIndex)},
        ${sqlString(selectedOption)},
        ${sqlString(selectedType)},
        ${sqlString(item.reference || "")},
        ${sqlString(item.sampleA || "")},
        ${sqlString(item.sampleB || "")},
        ${sqlString(item.aType || "")},
        ${sqlString(item.bType || "")},
        0,
        NULL,
        ${sqlString(timestamp)}
      );`
    );
  }

  return statements;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.inputDir)) {
    throw new Error(`Input directory not found: ${options.inputDir}`);
  }

  const files = fs
    .readdirSync(options.inputDir)
    .filter((name) => name.startsWith("result_") && name.endsWith(".json"))
    .sort();

  const statements = ["BEGIN TRANSACTION;"];

  for (const fileName of files) {
    const filePath = path.join(options.inputDir, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    statements.push(...buildStatements(filePath, data));
  }

  statements.push("COMMIT;");
  fs.writeFileSync(options.outputFile, `${statements.join("\n")}\n`, "utf8");

  console.log(`Wrote ${files.length} legacy result files to ${options.outputFile}`);
}

main();
