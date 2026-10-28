-- GymProgress: Protección definitiva del catálogo de ejercicios
-- Solo mamenromerovera@gmail.com puede eliminar ejercicios.
-- Ejecutar OCTAVO (orden 8/8), después de 001-007.
-- Esta migración es idempotente y auto-contenida: funciona independientemente
-- de si las migraciones 005 y 007 se aplicaron previamente.

-- ============================================================
-- 1. ACTIVAR RLS EN exercises (idempotente)
-- ============================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES EN exercises
-- ============================================================
-- Se eliminan dinámicamente TODAS las políticas de la tabla para
-- garantizar que no quede ninguna política permisiva adicional.
-- Las políticas permisivas se combinan con OR en PostgreSQL RLS,
-- por lo que una política residual podría permitir borrados no deseados.
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
-- Usa auth.jwt() para comprobar el correo del usuario autenticado.
-- SECURITY DEFINER + search_path fijo para evitar injection.
-- STABLE porque no modifica datos.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'mamenromerovera@gmail.com';
$$;

-- Revocar acceso a roles no autenticados
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, public;
-- Conceder acceso solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- ============================================================
-- 4. POLÍTICA SELECT: todos los usuarios autenticados
-- ============================================================
CREATE POLICY "exercises_select_all_authenticated"
ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. POLÍTICA INSERT: solo el propietario
-- ============================================================
CREATE POLICY "exercises_insert_own"
ON public.exercises FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. POLÍTICA UPDATE: solo el propietario
-- ============================================================
CREATE POLICY "exercises_update_own"
ON public.exercises FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================
-- 7. POLÍTICA DELETE: SOLO el administrador
-- ============================================================
-- Esta es la ÚNICA política de borrado. No hay otras políticas
-- permisivas que puedan combinar con OR y permitir borrados no autorizados.
CREATE POLICY "exercises_delete_admin_only"
ON public.exercises FOR DELETE
USING (public.is_admin_user());

-- ============================================================
-- 8. VERIFICACIÓN FINAL
-- ============================================================
-- Después de ejecutar esta migración, verificar con:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'exercises';
-- Debe mostrar exactamente 4 políticas:
--   - exercises_select_all_authenticated (SELECT)
--   - exercises_insert_own (INSERT)
--   - exercises_update_own (UPDATE)
--   - exercises_delete_admin_only (DELETE)
-- Y RLS debe estar habilitado: 
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'exercises';

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La función is_admin_user() consulta auth.jwt() ->> 'email'.
--    El JWT está firmado por Supabase y no puede ser manipulado por el cliente.
--    Para email/password auth, el claim 'email' siempre está presente.
-- 2. Si el usuario no está autenticado, auth.jwt() devuelve null
--    y la función devuelve false (no puede borrar).
-- 3. Las políticas de SELECT, INSERT y UPDATE mantienen el catálogo compartido.
-- 4. Las políticas de storage (fotos) NO se modifican.
-- 5. Los datos personales (rutinas, entrenamientos, series, pesos)
--    siguen protegidos por RLS por user_id (sin cambios).
-- 6. El propietario de un ejercicio ya no puede borrarlo si no es admin.
-- 7. No se utiliza service_role en el cliente.
-- 8. La autorización se verifica en el servidor mediante RLS.