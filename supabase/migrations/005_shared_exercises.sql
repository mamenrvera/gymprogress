-- GymProgress: Catálogo compartido de ejercicios
-- Ejecutar QUINTO (orden 5/5), después de 001, 002, 003 y 004

-- ============================================================
-- 1. CAMBIAR POLÍTICAS RLS DE exercises
-- ============================================================
-- Eliminar la política que restringe la lectura al propietario
DROP POLICY IF EXISTS "exercises_all_own" ON exercises;

-- Nueva política: todos los usuarios autenticados pueden LEER todos los ejercicios
CREATE POLICY "exercises_select_all_authenticated" ON exercises
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: solo el propietario puede crear ejercicios
CREATE POLICY "exercises_insert_own" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: solo el propietario puede modificar sus ejercicios
CREATE POLICY "exercises_update_own" ON exercises
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: solo el propietario puede eliminar sus ejercicios
CREATE POLICY "exercises_delete_own" ON exercises
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 2. CAMBIAR POLÍTICAS RLS DE storage.objects PARA exercise-photos
-- ============================================================
-- Eliminar la política de lectura restrictiva
DROP POLICY IF EXISTS "Users can view own exercise photos" ON storage.objects;

-- Nueva política: todos los usuarios autenticados pueden LEER todas las fotos
CREATE POLICY "Authenticated users can view exercise photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-photos' AND
  auth.uid() IS NOT NULL
);

-- Las políticas de INSERT, UPDATE y DELETE se mantienen restrictivas:
-- Solo el propietario (user_id en la ruta) puede subir, modificar o eliminar.
-- (Ya definidas en 004_exercise_photos.sql, no se modifican aquí)

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================
-- 1. Los ejercicios son ahora un catálogo compartido: cualquier usuario
--    autenticado puede leer todos los ejercicios.
-- 2. Solo el creador (user_id) puede modificar o eliminar un ejercicio.
-- 3. Las fotos son legibles por todos los usuarios autenticados.
-- 4. Solo el propietario de la foto puede subirla, modificarla o eliminarla.
-- 5. Las rutinas, entrenamientos, series y pesos corporales siguen siendo
--    privados (RLS por user_id).
-- 6. La columna image_url almacena la ruta (no URL). Las URLs firmadas
--    se generan en el cliente.