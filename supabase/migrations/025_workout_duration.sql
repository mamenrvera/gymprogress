-- GymProgress: Duración acumulativa de sesiones
-- Ejecutar VIGÉSIMO QUINTO (orden 25/25), después de 001-024.
-- Idempotente. No borra datos existentes.

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS accumulated_seconds integer DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS segment_started_at timestamptz;

-- RLS ya cubre workouts (policies existentes). No se añaden políticas nuevas.
