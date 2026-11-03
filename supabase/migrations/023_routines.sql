-- GymProgress: Rutinas personalizadas y programación
-- Ejecutar VIGÉSIMO TERCERO (orden 23/23), después de 001-022.
-- Idempotente. No borra datos existentes.

-- ============================================================
-- RUTINAS (plantillas por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  muscle_group text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- EJERCICIOS DE RUTINA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  muscle_group text,
  order_index integer NOT NULL DEFAULT 0,
  sets_count integer NOT NULL DEFAULT 3,
  reps_target integer NOT NULL DEFAULT 10,
  weight_kg numeric(6,2),
  rest_seconds integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PROGRAMACIONES DE RUTINA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  schedule_type text NOT NULL CHECK (schedule_type IN ('date', 'weekly')),
  specific_date date,
  weekdays integer[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- RELACIÓN SESIÓN-RUTINA
-- ============================================================
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_schedules ENABLE ROW LEVEL SECURITY;

-- Routines: owner only
DROP POLICY IF EXISTS "routines_select_own" ON public.routines;
CREATE POLICY "routines_select_own" ON public.routines FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines_insert_own" ON public.routines;
CREATE POLICY "routines_insert_own" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines_update_own" ON public.routines;
CREATE POLICY "routines_update_own" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routines_delete_own" ON public.routines;
CREATE POLICY "routines_delete_own" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- Routine exercises: owner only
DROP POLICY IF EXISTS "routine_exercises_select_own" ON public.routine_exercises;
CREATE POLICY "routine_exercises_select_own" ON public.routine_exercises FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_exercises_insert_own" ON public.routine_exercises;
CREATE POLICY "routine_exercises_insert_own" ON public.routine_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_exercises_update_own" ON public.routine_exercises;
CREATE POLICY "routine_exercises_update_own" ON public.routine_exercises FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_exercises_delete_own" ON public.routine_exercises;
CREATE POLICY "routine_exercises_delete_own" ON public.routine_exercises FOR DELETE USING (auth.uid() = user_id);

-- Routine schedules: owner only
DROP POLICY IF EXISTS "routine_schedules_select_own" ON public.routine_schedules;
CREATE POLICY "routine_schedules_select_own" ON public.routine_schedules FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_schedules_insert_own" ON public.routine_schedules;
CREATE POLICY "routine_schedules_insert_own" ON public.routine_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_schedules_update_own" ON public.routine_schedules;
CREATE POLICY "routine_schedules_update_own" ON public.routine_schedules FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_schedules_delete_own" ON public.routine_schedules;
CREATE POLICY "routine_schedules_delete_own" ON public.routine_schedules FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_routine_schedules_updated_at
  BEFORE UPDATE ON public.routine_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();