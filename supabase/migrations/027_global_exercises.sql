-- GymProgress: Catálogo compartido de ejercicios globales (wger)
-- Ejecutar VIGÉSIMO SÉPTIMO, después de 001-026.
-- Idempotente. No borra datos existentes.

-- ============================================================
-- 1. COLUMNA is_global
-- ============================================================
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. user_id nullable (ejercicios globales no pertenecen a un usuario)
-- ============================================================
ALTER TABLE public.exercises
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- 3. RLS: actualizar política INSERT para impedir que un usuario
--    marque como global un ejercicio propio.
-- ============================================================
DROP POLICY IF EXISTS "exercises_insert_own" ON public.exercises;
CREATE POLICY "exercises_insert_own"
  ON public.exercises FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_global = false);

-- SELECT/UPDATE/DELETE policies existentes se mantienen:
--   - SELECT: todos los autenticados (exercises_select_all_authenticated)
--   - UPDATE/DELETE: solo admin (exercises_update_admin_only / exercises_delete_admin_only)
-- Los ejercicios globales solo se crean/actualizan mediante service role
-- (Edge Function / script administrativo), que omite RLS.

-- ============================================================
-- 4. Índice único externo (ya creado en 026; se asegura aquí)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS exercises_external_unique
  ON public.exercises (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name='exercises' AND column_name IN ('user_id','is_global');
-- SELECT policyname, cmd FROM pg_policies WHERE tablename='exercises';
