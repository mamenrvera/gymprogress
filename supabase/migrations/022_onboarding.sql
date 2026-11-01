-- GymProgress: Onboarding nutricional
-- Ejecutar VIGÉSIMO SEGUNDO (orden 22/22), después de 001-021.
-- Idempotente. No borra datos existentes.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sex text CHECK (sex IS NULL OR sex IN ('male','female','unknown'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS steps_per_day integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strength_days_per_week integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strength_session_minutes integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strength_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cardio_activities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_origin text CHECK (target_origin IS NULL OR target_origin IN ('manual','recommended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_version integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS configured_at timestamptz;
