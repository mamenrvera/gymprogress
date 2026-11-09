-- GymProgress: Identificador externo para ejercicios importados (wger)
-- Ejecutar VIGÉSIMO SEXTO, después de 001-025.
-- Idempotente. No borra datos existentes.

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS external_source text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS external_id text;

-- Evitar duplicados de la misma fuente externa.
CREATE UNIQUE INDEX IF NOT EXISTS exercises_external_unique
  ON public.exercises (external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- No se modifican políticas RLS. Los ejercicios importados se guardan con user_id del importador
-- y siguen el catálogo compartido (RLS de lectura para todos los autenticados).
