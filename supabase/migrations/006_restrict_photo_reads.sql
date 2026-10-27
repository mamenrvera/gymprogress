-- GymProgress: Restringir lectura de fotos a fotos asociadas a ejercicios
-- Ejecutar SEXTO (orden 6/6), después de 001, 002, 003, 004 y 005
-- Esta migración reemplaza la política de lectura abierta de 005 por una
-- política más restrictiva que solo permite leer fotos asociadas a ejercicios.

-- ============================================================
-- 1. FUNCIÓN SECURITY DEFINER: verificar si una ruta es foto de ejercicio
-- ============================================================
-- Comprueba si el path dado corresponde a image_url de algún ejercicio.
-- SECURITY DEFINER permite consultar la tabla exercises sin estar sujeta
-- a RLS, garantizando que la verificación sea siempre precisa.
CREATE OR REPLACE FUNCTION is_exercise_photo_path(photo_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM exercises WHERE image_url = photo_path
  );
END;
$$;

-- Revocar acceso a roles no autenticados
REVOKE EXECUTE ON FUNCTION is_exercise_photo_path(text) FROM anon, public;
-- Conceder acceso solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION is_exercise_photo_path(text) TO authenticated;

-- ============================================================
-- 2. ÍNDICE para acelerar la verificación
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exercises_image_url
  ON exercises(image_url) WHERE image_url IS NOT NULL;

-- ============================================================
-- 3. ACTUALIZAR POLÍTICA SELECT EN storage.objects
-- ============================================================
-- Eliminar todas las políticas de lectura anteriores (idempotente)
DROP POLICY IF EXISTS "Users can view own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view exercise photos" ON storage.objects;

-- Nueva política: 
--   - El propietario siempre puede leer sus propios archivos (necesario
--     para la previsualización durante la subida, antes de guardar).
--   - Otros usuarios autenticados solo pueden leer archivos cuyo path
--     corresponda a image_url de un ejercicio del catálogo compartido.
CREATE POLICY "Authenticated users can view exercise photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-photos' AND
  auth.uid() IS NOT NULL AND
  (
    -- Propietario: puede leer sus propios archivos siempre
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Otros: solo si el path está asociado a un ejercicio
    is_exercise_photo_path(name)
  )
);

-- ============================================================
-- 4. POLÍTICAS DE ESCRITURA SE MANTIENEN RESTRICTIVAS
-- ============================================================
-- INSERT, UPDATE y DELETE no se modifican: solo el propietario
-- (carpeta {user_id}/...) puede subir, modificar o eliminar.
-- (Definidas en 004_exercise_photos.sql, vigentes.)

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La función is_exercise_photo_path usa SECURITY DEFINER para
--    consultar exercises sin depender de RLS, garantizando precisión.
-- 2. El índice parcial idx_exercises_image_url acelera la búsqueda.
-- 3. La política combina verificación de propiedad (carpeta) con
--    verificación de asociación (image_url), sin abrir acceso indiscriminado.
-- 4. Los archivos huérfanos (no referenciados por ningún ejercicio) solo
--    son legibles por su propietario.
-- 5. Las URL firmadas generadas por createSignedUrl() siguen funcionando
--    para paths válidos; para paths inválidos devuelven null.
-- 6. Las políticas de INSERT/UPDATE/DELETE siguen restringidas al propietario.