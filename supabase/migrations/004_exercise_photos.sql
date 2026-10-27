-- GymProgress: Añadir columna image_url a exercises y configurar Storage
-- Ejecutar CUARTO (orden 4/4), después de 001, 002 y 003
-- NOTA: El bucket exercise-photos ya existe (creado manualmente).
--       Esta migración es idempotente y no elimina el bucket ni sus archivos.

-- ============================================================
-- 1. AÑADIR COLUMNA image_url A exercises (idempotente)
-- ============================================================
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================
-- 2. CONFIGURAR BUCKET PRIVADO (no lo crea, solo actualiza propiedades)
-- ============================================================
-- Si el bucket ya existe, actualiza sus propiedades sin borrarlo ni sus archivos.
-- Si no existe, lo crea.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-photos',
  'exercise-photos',
  false,  -- PRIVADO (no público)
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- 3. POLÍTICAS RLS PARA storage.objects
-- ============================================================
-- Eliminar solo las políticas de este proyecto (idempotente)
DROP POLICY IF EXISTS "Users can upload own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own exercise photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exercise photos" ON storage.objects;

-- Política de subida (INSERT)
-- Solo el propietario puede subir fotos a su carpeta (user_id/exercise_id.ext)
CREATE POLICY "Users can upload own exercise photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de lectura (SELECT)
-- Solo el propietario puede leer sus fotos
CREATE POLICY "Users can view own exercise photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de actualización (UPDATE)
-- Necesaria para upsert: true en el upload
-- WITH CHECK valida que el nuevo path también pertenece al mismo usuario
CREATE POLICY "Users can update own exercise photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de eliminación (DELETE)
-- Solo el propietario puede eliminar sus fotos
CREATE POLICY "Users can delete own exercise photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================
-- 1. La columna image_url almacena la RUTA del archivo (ej: "user-id/exercise-id.jpg")
--    NO una URL pública ni una URL firmada temporal.
-- 2. El bucket es PRIVADO (public = false).
-- 3. Las URL firmadas se generan en el cliente con createSignedUrl() (expiran en 1 hora).
-- 4. Las políticas RLS garantizan que solo el propietario puede acceder a sus fotos.
-- 5. La estructura de carpetas es: exercise-photos/{user_id}/{exercise_id}.{ext}
-- 6. upsert: true en el upload requiere tanto INSERT como UPDATE policies.
-- 7. Si el bucket ya existe con propiedades incorrectas, ON CONFLICT DO UPDATE las corrige.
-- 8. Las políticas son idempotentes: se eliminan y recrean en cada ejecución.