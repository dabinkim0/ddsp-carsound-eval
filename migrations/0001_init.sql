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

CREATE TABLE IF NOT EXISTS public.assignments (
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  trial_index TEXT NOT NULL,
  position INTEGER NOT NULL,
  reference_path TEXT NOT NULL,
  sample_a_path TEXT NOT NULL,
  sample_b_path TEXT NOT NULL,
  sample_a_type TEXT NOT NULL,
  sample_b_type TEXT NOT NULL,
  is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, phase, trial_index)
);

CREATE TABLE IF NOT EXISTS public.responses (
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  trial_index TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  selected_type TEXT NOT NULL,
  reference_path TEXT NOT NULL,
  sample_a_path TEXT NOT NULL,
  sample_b_path TEXT NOT NULL,
  sample_a_type TEXT NOT NULL,
  sample_b_type TEXT NOT NULL,
  is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, phase, trial_index)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_session_phase ON public.assignments(session_id, phase);
CREATE INDEX IF NOT EXISTS idx_responses_session_phase ON public.responses(session_id, phase);
CREATE INDEX IF NOT EXISTS idx_responses_trial ON public.responses(trial_index, is_warmup);
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
      COUNT(*)::INT AS total_responses,
      COALESCE(SUM(CASE WHEN is_warmup = FALSE THEN 1 ELSE 0 END), 0)::INT AS main_responses,
      COALESCE(SUM(CASE WHEN is_warmup = TRUE THEN 1 ELSE 0 END), 0)::INT AS warmup_responses
    FROM public.responses
  ),
  preference_counts AS (
    SELECT
      COALESCE(SUM(CASE WHEN selected_type = 'proposed' AND is_warmup = FALSE THEN 1 ELSE 0 END), 0)::INT AS proposed,
      COALESCE(SUM(CASE WHEN selected_type = 'baseline' AND is_warmup = FALSE THEN 1 ELSE 0 END), 0)::INT AS baseline
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
        COUNT(r.trial_index)::INT AS responses
      FROM public.sessions s
      LEFT JOIN public.responses r
        ON s.id = r.session_id AND r.is_warmup = FALSE
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT 12
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
      'responsesRecorded', response_stats.total_responses,
      'mainResponses', response_stats.main_responses,
      'warmupResponses', response_stats.warmup_responses,
      'startedLast24Hours', recent_count.started_last_24h,
      'proposedSelections', preference_counts.proposed,
      'baselineSelections', preference_counts.baseline,
      'proposedRate', CASE
        WHEN response_stats.main_responses > 0 THEN preference_counts.proposed::NUMERIC / response_stats.main_responses
        ELSE 0
      END
    ),
    'demographics', JSONB_BUILD_OBJECT(
      'ageGroups', age_groups.value,
      'genders', genders.value,
      'audioExpertise', audio_levels.value,
      'drivingExperience', driving_levels.value
    ),
    'recentSessions', recent_sessions.value
  )
  FROM session_stats, response_stats, preference_counts, recent_count, age_groups, genders, audio_levels, driving_levels, recent_sessions;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_trial_stats()
RETURNS TABLE (
  trial_index TEXT,
  total BIGINT,
  proposed BIGINT,
  baseline BIGINT,
  proposed_rate DOUBLE PRECISION,
  avg_response_time_ms INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    trial_index,
    COUNT(*) AS total,
    SUM(CASE WHEN selected_type = 'proposed' THEN 1 ELSE 0 END)::BIGINT AS proposed,
    SUM(CASE WHEN selected_type = 'baseline' THEN 1 ELSE 0 END)::BIGINT AS baseline,
    CASE
      WHEN COUNT(*) > 0 THEN
        SUM(CASE WHEN selected_type = 'proposed' THEN 1 ELSE 0 END)::DOUBLE PRECISION / COUNT(*)
      ELSE 0
    END AS proposed_rate,
    ROUND(AVG(response_time_ms))::INTEGER AS avg_response_time_ms
  FROM public.responses
  WHERE is_warmup = FALSE
  GROUP BY trial_index
  ORDER BY trial_index::INTEGER;
$$;
