CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  audio_expertise TEXT NOT NULL,
  driving_experience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  total_main_trials INTEGER NOT NULL,
  total_warmup_trials INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS public.responses (
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  stage_title TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_position INTEGER NOT NULL,
  candidate_slot INTEGER NOT NULL,
  candidate_id TEXT NOT NULL,
  candidate_label TEXT NOT NULL,
  ground_truth_path TEXT,
  candidate_path TEXT,
  has_audio BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, item_id, candidate_slot)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_stage ON public.responses(stage_key, item_id);
CREATE INDEX IF NOT EXISTS idx_responses_item_position ON public.responses(item_position);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON public.responses(created_at DESC);

CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH session_stats AS (
    SELECT
      COUNT(*)::INT AS started,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)::INT AS completed
    FROM public.sessions
  ),
  response_stats AS (
    SELECT
      COUNT(*)::INT AS ratings_recorded,
      COALESCE(AVG(score), 0)::NUMERIC AS average_score
    FROM public.responses
  ),
  recent_count AS (
    SELECT COUNT(*)::INT AS started_last_24h
    FROM public.sessions
    WHERE started_at >= NOW() - INTERVAL '24 hours'
  ),
  age_groups AS (
    SELECT COALESCE(
      JSONB_AGG(JSONB_BUILD_OBJECT('label', age_group, 'count', count) ORDER BY age_group),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT age_group, COUNT(*)::INT AS count
      FROM public.sessions
      GROUP BY age_group
      ORDER BY age_group
    ) rows
  ),
  genders AS (
    SELECT COALESCE(
      JSONB_AGG(JSONB_BUILD_OBJECT('label', gender, 'count', count) ORDER BY gender),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT gender, COUNT(*)::INT AS count
      FROM public.sessions
      GROUP BY gender
      ORDER BY gender
    ) rows
  ),
  audio_levels AS (
    SELECT COALESCE(
      JSONB_AGG(JSONB_BUILD_OBJECT('label', audio_expertise, 'count', count) ORDER BY audio_expertise),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT audio_expertise, COUNT(*)::INT AS count
      FROM public.sessions
      GROUP BY audio_expertise
      ORDER BY audio_expertise
    ) rows
  ),
  driving_levels AS (
    SELECT COALESCE(
      JSONB_AGG(JSONB_BUILD_OBJECT('label', driving_experience, 'count', count) ORDER BY driving_experience),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT driving_experience, COUNT(*)::INT AS count
      FROM public.sessions
      GROUP BY driving_experience
      ORDER BY driving_experience
    ) rows
  ),
  recent_sessions AS (
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', id,
          'participantName', participant_name,
          'participantEmail', participant_email,
          'status', status,
          'startedAt', started_at,
          'completedAt', completed_at,
          'responses', responses
        )
        ORDER BY started_at DESC
      ),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT
        s.id,
        s.participant_name,
        s.participant_email,
        s.status,
        s.started_at,
        s.completed_at,
        COUNT(r.candidate_slot)::INT AS responses
      FROM public.sessions s
      LEFT JOIN public.responses r
        ON s.id = r.session_id
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT 12
    ) rows
  ),
  stage_averages AS (
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'stageKey', stage_key,
          'stageTitle', stage_title,
          'averageScore', average_score
        )
        ORDER BY stage_key
      ),
      '[]'::JSONB
    ) AS value
    FROM (
      SELECT
        stage_key,
        stage_title,
        ROUND(AVG(score)::NUMERIC, 2) AS average_score
      FROM public.responses
      GROUP BY stage_key, stage_title
      ORDER BY stage_key
    ) rows
  )
  SELECT JSONB_BUILD_OBJECT(
    'summary', JSONB_BUILD_OBJECT(
      'sessionsStarted', session_stats.started,
      'sessionsCompleted', session_stats.completed,
      'completionRate', CASE
        WHEN session_stats.started > 0 THEN session_stats.completed::NUMERIC / session_stats.started
        ELSE 0
      END,
      'ratingsRecorded', response_stats.ratings_recorded,
      'averageScore', response_stats.average_score,
      'startedLast24Hours', recent_count.started_last_24h,
      'stageCount', (
        SELECT COUNT(DISTINCT stage_key)::INT
        FROM public.responses
      )
    ),
    'demographics', JSONB_BUILD_OBJECT(
      'ageGroups', age_groups.value,
      'genders', genders.value,
      'audioExpertise', audio_levels.value,
      'drivingExperience', driving_levels.value
    ),
    'recentSessions', recent_sessions.value,
    'stageAverages', stage_averages.value
  )
  FROM session_stats, response_stats, recent_count, age_groups, genders, audio_levels, driving_levels, recent_sessions, stage_averages;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_trial_stats()
RETURNS TABLE (
  stage_key TEXT,
  stage_title TEXT,
  item_id TEXT,
  item_title TEXT,
  candidate_id TEXT,
  total_ratings BIGINT,
  average_score NUMERIC,
  has_audio BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH grouped AS (
    SELECT
      stage_key,
      stage_title,
      item_id,
      item_title,
      MIN(item_position) AS item_position,
      candidate_id,
      COUNT(*) AS total_ratings,
      ROUND(AVG(score)::NUMERIC, 2) AS average_score,
      BOOL_OR(has_audio) AS has_audio
    FROM public.responses
    GROUP BY stage_key, stage_title, item_id, item_title, candidate_id
  )
  SELECT
    stage_key,
    stage_title,
    item_id,
    item_title,
    candidate_id,
    total_ratings,
    average_score,
    has_audio
  FROM grouped
  ORDER BY stage_key, item_position, candidate_id;
$$;
