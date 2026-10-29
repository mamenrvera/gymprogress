-- GymProgress: Sesiones de cardio, carrera y deportes
-- Ejecutar DECIMOCUARTO (orden 14/14), después de 001-013.
-- Esta migración es idempotente.

-- ============================================================
-- 1. TABLA cardio_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cardio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  custom_name text,
  date date NOT NULL,
  started_at time,
  duration_min integer NOT NULL CHECK (duration_min > 0),
  intensity text NOT NULL DEFAULT 'moderada'
    CHECK (intensity IN ('suave','moderada','alta','muy_alta')),
  rpe smallint CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10)),
  distance_km numeric(8,3) CHECK (distance_km IS NULL OR distance_km >= 0),
  avg_speed_kmh numeric(6,2),
  max_speed_kmh numeric(6,2),
  avg_incline_pct numeric(5,2),
  max_incline_pct numeric(5,2),
  run_min integer CHECK (run_min IS NULL OR run_min >= 0),
  walk_min integer CHECK (walk_min IS NULL OR walk_min >= 0),
  warmup_min integer CHECK (warmup_min IS NULL OR warmup_min >= 0),
  cooldown_min integer CHECK (cooldown_min IS NULL OR cooldown_min >= 0),
  resistance numeric(6,2),
  cadence_rpm integer,
  elevation_gain_m numeric(7,1),
  surface text,
  modality text CHECK (modality IS NULL OR modality IN ('individual','dobles','clase','entrenamiento')),
  sets smallint,
  result text,
  calories integer CHECK (calories IS NULL OR calories >= 0),
  calories_source text CHECK (calories_source IS NULL OR calories_source IN ('auto','dispositivo','manual')),
  hr_avg smallint CHECK (hr_avg IS NULL OR hr_avg > 0),
  hr_max smallint CHECK (hr_max IS NULL OR hr_max > 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_date
  ON public.cardio_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_type
  ON public.cardio_sessions(user_id, activity_type);

-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cardio_sessions_all_own" ON public.cardio_sessions;
CREATE POLICY "cardio_sessions_all_own"
ON public.cardio_sessions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. TRIGGER updated_at (si existe la función)
-- ============================================================
-- Se omite si no existe la función update_updated_at_column.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS cardio_sessions_updated_at ON public.cardio_sessions;
    CREATE TRIGGER cardio_sessions_updated_at
      BEFORE UPDATE ON public.cardio_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. Cada usuario solo puede leer/escribir sus propias sesiones (RLS).
-- 2. Los índices aceleran consultas por usuario, fecha y tipo.
-- 3. No se modifican tablas de fuerza, rutinas ni datos personales.
-- 4. La columna activity_type es texto libre validado en el cliente;
--    los valores válidos se definen en src/lib/cardio.ts.