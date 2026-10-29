-- GymProgress: Privacidad de alimentos y deduplicación por código de barras
-- Ejecutar DECIMOSEXTO (orden 16/16), después de 001-015.
-- Esta migración es idempotente en caso de NO haber duplicados.

-- ============================================================
-- 1. VERIFICAR QUE foods TIENE user_id (ya existe desde 001)
-- ============================================================
-- La tabla foods ya tiene user_id NOT NULL REFERENCES profiles(id).
-- La política RLS "foods_all_own" ya restringe por user_id (de 002).
-- Esta migración NO modifica esas políticas.

-- ============================================================
-- 2. AÑADIR COLUMNA barcode SI NO EXISTE (de 015)
-- ============================================================
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS barcode text;

-- ============================================================
-- 3. COMPROBAR DUPLICADOS EXISTENTES (mismo usuario + mismo barcode)
-- ============================================================
DO $$
DECLARE
  dup_count int;
  dup_list text;
BEGIN
  SELECT count(*), string_agg(line, E'\n')
    INTO dup_count, dup_list
  FROM (
    SELECT format(
             '  - Usuario %s: barcode «%s» aparece %s veces. IDs: %s',
             user_id, barcode, count(*), string_agg(id::text, ', ')
           ) AS line
    FROM public.foods
    WHERE barcode IS NOT NULL
    GROUP BY user_id, barcode
    HAVING count(*) > 1
    ORDER BY user_id, barcode
  ) AS duplicates;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Migración 016 abortada: existen % grupo(s) de alimentos duplicados (mismo usuario + mismo código de barras). No se han borrado ni combinado datos. Resuelve los duplicados manualmente y vuelve a ejecutar la migración. Detalles: %', dup_count, dup_list;
  END IF;
END $$;

-- ============================================================
-- 4. RESTRICCIÓN UNIQUE: (user_id, barcode) cuando barcode no es null
-- ============================================================
-- Permite que el mismo código de barras exista para diferentes usuarios
-- (cada usuario tiene su propia biblioteca), pero evita duplicados
-- para el mismo usuario.
CREATE UNIQUE INDEX IF NOT EXISTS foods_user_barcode_unique
  ON public.foods (user_id, barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- 5. VERIFICACIÓN (ejecutar manualmente después de la migración)
-- ============================================================

-- Verificar que RLS está habilitado en foods
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'foods';
-- Debe devolver: true

-- Verificar políticas de foods
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'foods';
-- Debe mostrar: foods_all_own (FOR ALL, user_id = current_user_id())

-- Verificar que no hay duplicados
-- SELECT user_id, barcode, count(*) FROM foods
-- WHERE barcode IS NOT NULL
-- GROUP BY user_id, barcode HAVING count(*) > 1;
-- Debe devolver: 0 filas

-- Verificar que el índice único existe
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'foods'
-- AND indexname = 'foods_user_barcode_unique';

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La política RLS "foods_all_own" (de 002) garantiza que cada usuario
--    solo puede consultar, insertar, modificar y eliminar sus propios alimentos.
-- 2. La restricción UNIQUE (user_id, barcode) evita duplicados para el mismo
--    usuario, pero permite que diferentes usuarios tengan el mismo producto.
-- 3. No se modifican políticas de otras tablas.
-- 4. No se borran datos existentes.
-- 5. Los alimentos manuales (sin barcode) no se ven afectados por la restricción.