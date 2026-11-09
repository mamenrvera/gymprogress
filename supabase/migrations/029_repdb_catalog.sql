-- GymProgress: Catálogo RepDB (701 ejercicios) + músculos relacionales
-- Ejecutar VIGÉSIMO NOVENO, después de 001-028.
-- Idempotente. No borra datos existentes.

-- ============================================================
-- 1. Nuevas columnas en exercises para datos de RepDB
-- ============================================================
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS instructions text[],
  ADD COLUMN IF NOT EXISTS tips text[],
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS force_type text,
  ADD COLUMN IF NOT EXISTS mechanic text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS goals text[],
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS met numeric,
  ADD COLUMN IF NOT EXISTS is_unilateral boolean,
  ADD COLUMN IF NOT EXISTS is_bodyweight boolean,
  ADD COLUMN IF NOT EXISTS variation_group text,
  ADD COLUMN IF NOT EXISTS image_peak_url text;

-- ============================================================
-- 2. Tabla relacional de músculos por ejercicio
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_muscles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle_slug text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, muscle_slug)
);

CREATE INDEX IF NOT EXISTS exercise_muscles_exercise_idx ON public.exercise_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS exercise_muscles_slug_idx ON public.exercise_muscles(muscle_slug);

-- ============================================================
-- 3. RLS para exercise_muscles
-- ============================================================
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_muscles_select_all" ON public.exercise_muscles;
CREATE POLICY "exercise_muscles_select_all"
  ON public.exercise_muscles FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "exercise_muscles_insert_admin_or_owner" ON public.exercise_muscles;
CREATE POLICY "exercise_muscles_insert_admin_or_owner"
  ON public.exercise_muscles FOR INSERT
  WITH CHECK (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exercise_muscles_update_admin" ON public.exercise_muscles;
CREATE POLICY "exercise_muscles_update_admin"
  ON public.exercise_muscles FOR UPDATE
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "exercise_muscles_delete_admin" ON public.exercise_muscles;
CREATE POLICY "exercise_muscles_delete_admin"
  ON public.exercise_muscles FOR DELETE
  USING (public.is_admin_user());

-- ============================================================
-- 4. Verificación
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name='exercises' AND column_name IN ('description','instructions','category','body_part','image_peak_url');
-- SELECT count(*) FROM public.exercise_muscles;
"