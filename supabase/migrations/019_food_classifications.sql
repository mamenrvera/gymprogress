-- GymProgress: Clasificaciones nutricionales oficiales para alimentos
-- Ejecutar DECIMONOVENO (orden 19/19), después de 001-018.
-- Esta migración es idempotente.

ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS nutri_score text
  CHECK (nutri_score IS NULL OR nutri_score IN ('A','B','C','D','E'));
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS nova_group smallint
  CHECK (nova_group IS NULL OR nova_group IN (1,2,3,4));
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS classification_source text
  CHECK (classification_source IS NULL OR classification_source IN ('label','openfoodfacts','manual','calculated'));
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS classification_date timestamptz;

-- Añadir sugars, saturated fat y salt a la tabla (si no existen)
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS sugars_per_100 numeric(5,2);
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS saturated_fat_per_100 numeric(5,2);
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS salt_per_100 numeric(5,2);

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. nutri_score: Nutri-Score oficial (A-E) del fabricante o de Open Food Facts.
-- 2. nova_group: Grupo NOVA (1-4) del fabricante o de Open Food Facts.
-- 3. classification_source: origen del dato (label, openfoodfacts, manual, calculated).
-- 4. classification_date: fecha de obtención de la clasificación.
-- 5. sugars_per_100, saturated_fat_per_100, salt_per_100: valores nutricionales adicionales.
-- 6. No se borran datos existentes.
-- 7. Las políticas RLS de foods (foods_all_own) no se modifican.