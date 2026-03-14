PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  audio_expertise TEXT NOT NULL,
  driving_experience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  total_main_trials INTEGER NOT NULL,
  total_warmup_trials INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  session_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  trial_index TEXT NOT NULL,
  position INTEGER NOT NULL,
  reference_path TEXT NOT NULL,
  sample_a_path TEXT NOT NULL,
  sample_b_path TEXT NOT NULL,
  sample_a_type TEXT NOT NULL,
  sample_b_type TEXT NOT NULL,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, phase, trial_index),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS responses (
  session_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  trial_index TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  selected_type TEXT NOT NULL,
  reference_path TEXT NOT NULL,
  sample_a_path TEXT NOT NULL,
  sample_b_path TEXT NOT NULL,
  sample_a_type TEXT NOT NULL,
  sample_b_type TEXT NOT NULL,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, phase, trial_index),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_assignments_session_phase ON assignments(session_id, phase);
CREATE INDEX IF NOT EXISTS idx_responses_session_phase ON responses(session_id, phase);
CREATE INDEX IF NOT EXISTS idx_responses_trial ON responses(trial_index, is_warmup);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
