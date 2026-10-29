-- GymProgress: Puntuación de calidad por comida
-- Ejecutar DECIMOCTAVO (orden 18/18), después de 001-017.
-- Esta migración es idempotente.

ALTER TABLE public.meal_blocks
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score numeric(3,1),
  ADD COLUMN IF NOT EXISTS quality_version integer;

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. finished_at: instante de finalización de la comida.
-- 2. quality_score: puntuación 1-10 calculada al finalizar.
-- 3. quality_version: versión del algoritmo usada (para recalcular si cambia).
-- 4. No se borran datos existentes. Los bloques sin finalizar quedan con NULL.