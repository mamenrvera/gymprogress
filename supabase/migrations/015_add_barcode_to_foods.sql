-- GymProgress: Añadir código de barras a alimentos
-- Ejecutar DECIMOQUINTO (orden 15/15), después de 001-014.
-- Esta migración es idempotente.

ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS barcode text;

-- Índice para búsqueda rápida por código de barras (por usuario)
CREATE INDEX IF NOT EXISTS idx_foods_user_barcode
  ON public.foods(user_id, barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La columna barcode almacena el código de barras (EAN-13, EAN-8, UPC).
-- 2. No se modifican políticas RLS (foods sigue siendo privado por user_id).
-- 3. No se borran datos existentes.