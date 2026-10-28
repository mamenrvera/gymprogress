-- GymProgress: Restringir edición de ejercicios al administrador
-- Solo mamenromerovera@gmail.com puede modificar nombre, descripción y datos del catálogo.
-- Ejecutar NOVENO (orden 9/9), después de 001-008.
-- Esta migración es idempotente y auto-contenida.

-- ============================================================
-- 1. ACTIVAR RLS EN exercises (idempotente)
-- ============================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES EN exercises
-- ============================================================
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
-- 4. POLÍTICA SELECT: todos los usuarios autenticados
-- ============================================================
CREATE POLICY "exercises_select_all_authenticated"
ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. POLÍTICA INSERT: usuarios autenticados (propietario)
-- ============================================================
-- Cualquier usuario autenticado puede crear ejercicios nuevos.
-- user_id se asigna automáticamente al creador.
CREATE POLICY "exercises_insert_own"
ON public.exercises FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. POLÍTICA UPDATE: SOLO el administrador
-- ============================================================
-- Solo mamenromerovera@gmail.com puede modificar nombre, descripción,
-- grupo muscular, equipo, notas y cualquier otro campo del catálogo.
-- Un usuario normal no puede cambiar user_id ni ningún otro campo.
CREATE POLICY "exercises_update_admin_only"
ON public.exercises FOR UPDATE
USING (public.is_admin_user());

-- ============================================================
-- 7. POLÍTICA DELETE: SOLO el administrador (de migración 008)
-- ============================================================
CREATE POLICY "exercises_delete_admin_only"
ON public.exercises FOR DELETE
USING (public.is_admin_user());

-- ============================================================
-- 8. VERIFICACIÓN
-- ============================================================
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'exercises';
-- Debe mostrar exactamente 4 políticas:
--   - exercises_select_all_authenticated (SELECT)
--   - exercises_insert_own (INSERT)
--   - exercises_update_admin_only (UPDATE)
--   - exercises_delete_admin_only (DELETE)

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. Un usuario normal puede CREAR ejercicios (INSERT) pero no MODIFICAR (UPDATE) ni ELIMINAR (DELETE).
-- 2. Solo el admin puede modificar nombre, descripción y datos del catálogo.
-- 3. Un usuario normal no puede cambiar user_id (UPDATE bloqueado por RLS).
-- 4. Las rutinas, entrenamientos, series y pesos personales no se modifican.