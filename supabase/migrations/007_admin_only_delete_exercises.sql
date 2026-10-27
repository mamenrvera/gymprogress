-- GymProgress: Restringir eliminación de ejercicios al administrador
-- Ejecutar SÉPTIMO (orden 7/7), después de 001-006
-- Solo la cuenta mamenromerovera@gmail.com puede eliminar ejercicios del catálogo.

-- ============================================================
-- 1. FUNCIÓN HELPER: verificar si el usuario actual es admin
-- ============================================================
-- Usa auth.jwt() para comprobar el correo del usuario autenticado.
-- SECURITY DEFINER garantiza que la función se ejecute con los
-- privilegios del propietario, sin depender de RLS.
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'mamenromerovera@gmail.com';
$$;

-- Revocar acceso a roles no autenticados
REVOKE EXECUTE ON FUNCTION is_admin_user() FROM anon, public;
-- Conceder acceso solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- ============================================================
-- 2. ACTUALIZAR POLÍTICA DELETE EN exercises
-- ============================================================
-- Eliminar la política anterior que permitía al propietario borrar
DROP POLICY IF EXISTS "exercises_delete_own" ON exercises;

-- Nueva política: solo el administrador puede eliminar ejercicios
CREATE POLICY "exercises_delete_admin_only" ON exercises
  FOR DELETE USING (is_admin_user());

-- ============================================================
-- 3. VERIFICAR QUE LAS DEMÁS POLÍTICAS SIGUEN INTACTAS
-- ============================================================
-- SELECT: todos los usuarios autenticados (sin cambios)
-- INSERT: solo el propietario (sin cambios)
-- UPDATE: solo el propietario (sin cambios)
-- DELETE: solo el administrador (nueva)

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La función is_admin_user() consulta auth.jwt() ->> 'email'.
--    El JWT está firmado por Supabase y no puede ser manipulado.
-- 2. Si el usuario no está autenticado, auth.jwt() devuelve null
--    y la función devuelve false (no puede borrar).
-- 3. Las políticas de lectura compartida NO se modifican.
-- 4. Las políticas de almacenamiento de fotos NO se modifican.
-- 5. Los datos personales (rutinas, entrenamientos, series, pesos)
--    siguen protegidos por RLS por user_id (sin cambios).
-- 6. El propietario de un ejercicio ya no puede borrarlo si no es admin.