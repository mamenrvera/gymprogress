-- GymProgress: Restricción UNIQUE sobre external_source + external_id
-- Necesaria para que PostgREST (upsert on_conflict) funcione correctamente.
-- Ejecutar VIGÉSIMO OCTAVO, después de 001-027.
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_external_unique'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    -- Eliminar el índice parcial previo si existe (para evitar duplicidad)
    DROP INDEX IF EXISTS public.exercises_external_unique;
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_external_unique UNIQUE (external_source, external_id);
  END IF;
END $$;
