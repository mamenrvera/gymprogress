-- GymProgress: Garantizar catálogo compartido de ejercicios
-- Ejecutar UNDÉCIMO (orden 11/11), después de 001-010.
-- Esta migración es idempotente y auto-contenida.
-- Resuelve: los ejercicios creados por una cuenta no son visibles para otras.
-- Causa: la política RLS "exercises_all_own" (FOR ALL, user_id = current_user_id())
--        de la migración 002 sigue activa y filtra SELECT por propietario.

-- ============================================================
-- 1. ACTIVAR RLS EN exercises (idempotente)
-- ============================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES EN exercises
-- ============================================================
-- Se eliminan dinámicamente TODAS las políticas para garantizar
-- que no quede "exercises_all_own" ni ninguna otra política residual.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercises'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exercises', r.policyname);
  END LOOP;
END $$;

-- ============================================================
-- 3. FUNCIÓN HELPER: verificar si el usuario actual es admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'mamenromerovera@gmail.com';
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- ============================================================
-- 4. POLÍTICA SELECT: TODOS los usuarios autenticados
-- ============================================================
-- Esta es la política clave: permite que cualquier usuario autenticado
-- lea TODOS los ejercicios del catálogo compartido.
CREATE POLICY "exercises_select_all_authenticated"
ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. POLÍTICA INSERT: usuarios autenticados (propietario)
-- ============================================================
CREATE POLICY "exercises_insert_own"
ON public.exercises FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. POLÍTICA UPDATE: SOLO el administrador
-- ============================================================
CREATE POLICY "exercises_update_admin_only"
ON public.exercises FOR UPDATE
USING (public.is_admin_user());

-- ============================================================
-- 7. POLÍTICA DELETE: SOLO el administrador
-- ============================================================
CREATE POLICY "exercises_delete_admin_only"
ON public.exercises FOR DELETE
USING (public.is_admin_user());

-- ============================================================
-- 8. VERIFICACIÓN (ejecutar manualmente después de la migración)
-- ============================================================
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'exercises';
-- Debe mostrar exactamente 4 políticas:
--   - exercises_select_all_authenticated (SELECT) → auth.uid() IS NOT NULL
--   - exercises_insert_own (INSERT) → user_id = auth.uid()
--   - exercises_update_admin_only (UPDATE) → is_admin_user()
--   - exercises_delete_admin_only (DELETE) → is_admin_user()
--
-- Verificar RLS habilitado:
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'exercises'; → true

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La política SELECT es la clave del catálogo compartido.
--    Sin ella, solo el creador puede ver sus ejercicios.
-- 2. La política INSERT permite a cualquier usuario crear ejercicios.
-- 3. UPDATE y DELETE solo para admin (mamenromerovera@gmail.com).
-- 4. Las rutinas, entrenamientos, series y pesos NO se modifican.
-- 5. Las fotos de ejercicios NO se modifican.