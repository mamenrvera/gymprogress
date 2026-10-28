-- GymProgress: Restringir modificación de fotos al administrador
-- Solo mamenromerovera@gmail.com puede sustituir o eliminar fotos existentes.
-- Cualquier usuario puede subir una foto inicial al crear un ejercicio.
-- Ejecutar DÉCIMO (orden 10/10), después de 001-009.
-- Esta migración es idempotente y auto-contenida.

-- ============================================================
-- 1. FUNCIÓN HELPER: verificar si el usuario actual es admin
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
-- 2. ACTUALIZAR POLÍTICAS DE storage.objects PARA exercise-photos
-- ============================================================
-- Eliminar políticas de modificación anteriores (idempotente)
DROP POLICY IF EXISTS "Users can update own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete exercise photos" ON storage.objects;

-- Política INSERT: el propietario puede subir fotos a su carpeta
-- (Se mantiene de 004; se recrea para idempotencia)
DROP POLICY IF EXISTS "Users can upload own exercise photos" ON storage.objects;
CREATE POLICY "Users can upload own exercise photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política SELECT: todos los usuarios autenticados pueden leer
-- (De 005/006; se recrea para idempotencia)
DROP POLICY IF EXISTS "Authenticated users can view exercise photos" ON storage.objects;
CREATE POLICY "Authenticated users can view exercise photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-photos' AND
  auth.uid() IS NOT NULL
);

-- Política UPDATE: SOLO el administrador puede sustituir fotos existentes
-- Esto impide que un usuario normal sobrescriba un archivo existente
-- mediante una subida con upsert, aunque conozca la ruta.
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

-- Política DELETE: SOLO el administrador puede eliminar fotos existentes
CREATE POLICY "Admin can delete exercise photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-photos' AND
  public.is_admin_user()
);

-- ============================================================
-- 3. VERIFICACIÓN
-- ============================================================
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- AND policyname LIKE '%exercise%';
-- Debe mostrar:
--   - Users can upload own exercise photos (INSERT) - propietario
--   - Authenticated users can view exercise photos (SELECT) - todos
--   - Admin can update exercise photos (UPDATE) - solo admin
--   - Admin can delete exercise photos (DELETE) - solo admin

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. INSERT: cualquier usuario puede subir fotos a su carpeta (user_id/...).
--    Esto permite crear ejercicios con foto inicial.
-- 2. UPDATE: solo admin puede sustituir fotos existentes (upsert).
--    Un usuario normal no puede sobrescribir un archivo existente.
-- 3. DELETE: solo admin puede eliminar fotos existentes.
-- 4. SELECT: todos los usuarios autenticados pueden ver las fotos.
-- 5. El bucket sigue siendo privado (public = false).
-- 6. Las URLs firmadas siguen funcionando para fotos existentes.