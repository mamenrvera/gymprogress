-- GymProgress: Añadir clasificaciones nutricionales a las entradas de comida
-- Ejecutar VIGÉSIMO (orden 20/20), después de 001-019.
-- Esta migración es idempotente.

ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS nutri_score text
  CHECK (nutri_score IS NULL OR nutri_score IN ('A','B','C','D','E'));
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS nova_group smallint
  CHECK (nova_group IS NULL OR nova_group IN (1,2,3,4));

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. nutri_score y nova_group se almacenan como snapshot del alimento
--    en el momento del registro, igual que los valores nutricionales.
-- 2. No se borran datos existentes.
-- 3. Las políticas RLS de entries (entries_all_own) no se modifican.