-- GymProgress: Corregir definitivamente los permisos de fotografías de ejercicios
-- Problema: is_admin_user() usa comparación case-sensitive (=) que puede fallar
-- si el email en el JWT tiene diferente capitalización.
-- Solución: usar LOWER() para comparación case-insensitive.
-- Ejecutar DUODÉCIMO (orden 12/12), después de 001-011.
-- Esta migración es idempotente y auto-contenida.
-- NO afecta a otros buckets ni a políticas de otras tablas.

-- ============================================================
-- 1. ACTUALIZAR FUNCIÓN is_admin_user() (case-insensitive)
-- ============================================================
-- Identifica al administrador mediante el claim 'email' del JWT de Supabase Auth.
-- SECURITY DEFINER: se ejecuta con privilegios del propietario (no del llamante).
-- STABLE: no modifica datos, retorna el mismo resultado dentro de una query.
-- REVOKE/GRANT: solo usuarios autenticados pueden ejecutarla.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT LOWER(auth.jwt() ->> 'email') = 'mamenromerovera@gmail.com';
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- ============================================================
-- 2. VERIFICAR POLÍTICAS DE exercises (de 011)
-- ============================================================
-- Eliminar TODAS las políticas de public.exercises dinámicamente.
-- Esto garantiza que no quede "exercises_all_own" ni ninguna otra política residual.
-- Las políticas permisivas se combinan con OR en PostgreSQL RLS,
-- por lo que una política residual podría permitir operaciones no deseadas.
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

-- Recrear políticas con la función actualizada
-- SELECT: todos los usuarios autenticados pueden leer todos los ejercicios
CREATE POLICY "exercises_select_all_authenticated"
ON public.exercises FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: cualquier usuario autenticado puede crear ejercicios (propietario)
CREATE POLICY "exercises_insert_own"
ON public.exercises FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: SOLO el administrador puede modificar ejercicios existentes
CREATE POLICY "exercises_update_admin_only"
ON public.exercises FOR UPDATE
USING (public.is_admin_user());

-- DELETE: SOLO el administrador puede eliminar ejercicios
CREATE POLICY "exercises_delete_admin_only"
ON public.exercises FOR DELETE
USING (public.is_admin_user());

-- ============================================================
-- 3. ACTUALIZAR POLÍTICAS DE storage.objects (solo exercise-photos)
-- ============================================================
-- IMPORTANTE: Solo se eliminan políticas que referencian 'exercise-photos'.
-- Las políticas de otros buckets NO se tocan.

-- 3a. Eliminar por nombre conocido (políticas de migraciones 004-010)
DROP POLICY IF EXISTS "Users can upload own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete exercise photos" ON storage.objects;

-- 3b. Eliminar dinámicamente cualquier política residual que referencie exercise-photos
-- (cubre políticas con nombres diferentes creadas manualmente en el dashboard)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual, '') ILIKE '%exercise-photos%'
        OR COALESCE(with_check, '') ILIKE '%exercise-photos%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- 3c. Recrear políticas correctas (limitadas al bucket exercise-photos)

-- INSERT: el propietario puede subir fotos a su carpeta (user_id/exercise_id.ext)
CREATE POLICY "Users can upload own exercise photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: todos los usuarios autenticados pueden leer todas las fotos
CREATE POLICY "Authenticated users can view exercise photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-photos' AND
  auth.uid() IS NOT NULL
);

-- UPDATE: SOLO el administrador puede sustituir fotos existentes
-- USING: controla qué filas se pueden actualizar
-- WITH CHECK: valida los nuevos valores (ambos requieren admin)
CREATE POLICY "Admin can update exercise photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-photos' AND
  public.is_admin_user()
)
WITH CHECK (
  bucket_id = 'exercise-photos' AND
  public.is_admin_user()
);

-- DELETE: SOLO el administrador puede eliminar fotos existentes
CREATE POLICY "Admin can delete exercise photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-photos' AND
  public.is_admin_user()
);

-- ============================================================
-- 4. VERIFICACIÓN (ejecutar manualmente después de la migración)
-- ============================================================

-- Verificar función admin (debe devolver true para admin, false para otros)
-- SELECT public.is_admin_user();

-- Verificar políticas de exercises (debe haber exactamente 4)
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises'
-- ORDER BY policyname;

-- Verificar políticas de storage para exercise-photos
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
-- AND (qual ILIKE '%exercise-photos%' OR with_check ILIKE '%exercise-photos%')
-- ORDER BY policyname;

-- Verificar que la política antigua no existe
-- SELECT policyname FROM pg_policies WHERE tablename = 'exercises' AND policyname = 'exercises_all_own';
-- Debe devolver: 0 filas

-- Verificar RLS habilitado
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'exercises';
-- Debe devolver: true

-- Contar ejercicios
-- SELECT count(*) FROM public.exercises;

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La comparación de email es case-insensitive (LOWER).
-- 2. Las políticas de UPDATE y DELETE en storage son admin-only.
-- 3. Los usuarios normales pueden subir (INSERT) fotos a su carpeta.
-- 4. Todos los usuarios autenticados pueden leer (SELECT) todas las fotos.
-- 5. El bucket sigue siendo privado (public = false).
-- 6. Las URLs firmadas siguen funcionando.
-- 7. No se borran datos existentes.
-- 8. Las políticas de otros buckets no se modifican.
-- 9. El bloque DO de storage solo elimina políticas que referencian 'exercise-photos'.
-- 10. La función is_exercise_photo_path() de migración 006 queda sin usar pero es inofensiva.