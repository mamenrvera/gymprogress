-- GymProgress: Series de rutinas (per-serie)
-- Ejecutar VIGÉSIMO CUARTO (orden 24/24), después de 001-023.
-- Idempotente. No borra datos existentes.

CREATE TABLE IF NOT EXISTS public.routine_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id uuid NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight_kg numeric(6,2),
  reps integer,
  rir integer,
  is_warmup boolean DEFAULT false,
  rest_seconds integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "routine_sets_select_own" ON public.routine_sets;
CREATE POLICY "routine_sets_select_own" ON public.routine_sets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_sets_insert_own" ON public.routine_sets;
CREATE POLICY "routine_sets_insert_own" ON public.routine_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_sets_update_own" ON public.routine_sets;
CREATE POLICY "routine_sets_update_own" ON public.routine_sets FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "routine_sets_delete_own" ON public.routine_sets;
CREATE POLICY "routine_sets_delete_own" ON public.routine_sets FOR DELETE USING (auth.uid() = user_id);