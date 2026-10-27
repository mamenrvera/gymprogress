-- GymProgress: Triggers, funciones auxiliares y creación automática de perfil
-- Ejecutar TERCERO (orden 3/3), después de 001 y 002

-- ============================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================
-- SECURITY DEFINER con search_path fijado
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_targets_updated_at
  BEFORE UPDATE ON targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_foods_updated_at
  BEFORE UPDATE ON foods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_sets_updated_at
  BEFORE UPDATE ON sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_body_weights_updated_at
  BEFORE UPDATE ON body_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCIÓN: Crear perfil y objetivos al registrarse (signup)
-- ============================================================
-- Idempotente: usa ON CONFLICT DO NOTHING para evitar errores si ya existe
-- SECURITY DEFINER con search_path fijado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil con valores por defecto (coinciden con seed.ts)
  -- ON CONFLICT DO NOTHING: si el usuario ya tiene perfil (ej. migración manual), no falla
  INSERT INTO public.profiles (id, name, initial_weight_kg, height_cm, goal)
  VALUES (
    NEW.id,
    '',
    63,
    163,
    'perder_grasa_ganar_musculo'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insertar objetivos nutricionales por defecto
  INSERT INTO public.targets (user_id, calories, protein, fat, carbs, carb_min, carb_max)
  VALUES (
    NEW.id,
    1400,
    125,
    40,
    90,
    85,
    95
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insertar preferencias de tema
  INSERT INTO public.user_preferences (user_id, theme)
  VALUES (NEW.id, 'dark')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger en auth.users (se ejecuta tras confirmar email o al crear usuario)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN AUXILIAR: Verificar ownership de workout (para validaciones extra)
-- ============================================================
-- SECURITY DEFINER con search_path fijado
-- Usa referencias de esquema explícitas (public.workouts)
CREATE OR REPLACE FUNCTION assert_workout_ownership(p_workout_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.workouts WHERE id = p_workout_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Workout no encontrado';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: el workout pertenece a otro usuario';
  END IF;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- VISTA: Resumen de workout con volumen y series (para consultas rápidas)
-- ============================================================
-- security_barrier = true garantiza que las políticas RLS de las tablas base
-- se apliquen ANTES de la vista. NO se crean políticas RLS directamente en la vista.
CREATE OR REPLACE VIEW workout_summary AS
SELECT
  w.id,
  w.user_id,
  w.date,
  w.name,
  w.status,
  w.started_at,
  w.finished_at,
  COUNT(DISTINCT we.id) AS exercise_count,
  COUNT(s.id) FILTER (WHERE s.completed AND NOT s.is_warmup) AS effective_sets,
  COUNT(s.id) FILTER (WHERE s.completed AND s.is_warmup) AS warmup_sets,
  COUNT(s.id) FILTER (WHERE NOT s.completed) AS pending_sets,
  COALESCE(SUM(s.weight_kg * s.reps) FILTER (WHERE s.completed AND NOT s.is_warmup), 0) AS volume,
  COALESCE(SUM(s.reps) FILTER (WHERE s.completed AND NOT s.is_warmup), 0) AS total_reps
FROM public.workouts w
LEFT JOIN public.workout_exercises we ON we.workout_id = w.id
LEFT JOIN public.sets s ON s.workout_id = w.id
GROUP BY w.id, w.user_id, w.date, w.name, w.status, w.started_at, w.finished_at;

-- RLS en la vista: security_barrier = true hereda protección de tablas base
ALTER VIEW workout_summary SET (security_barrier = true);
-- NO se crea política en la vista: security_barrier + RLS en tablas base es suficiente

-- ============================================================
-- VISTA: Resumen nutricional diario
-- ============================================================
CREATE OR REPLACE VIEW daily_nutrition_summary AS
SELECT
  e.user_id,
  e.date,
  SUM(e.calories_declared) AS calories,
  SUM(e.calories_estimated) AS calories_estimated,
  SUM(e.protein) AS protein,
  SUM(e.carbs) AS carbs,
  SUM(e.fat) AS fat,
  SUM(e.fiber) AS fiber,
  COUNT(*) AS entries_count
FROM public.entries e
GROUP BY e.user_id, e.date;

ALTER VIEW daily_nutrition_summary SET (security_barrier = true);
-- NO se crea política en la vista: security_barrier + RLS en entries es suficiente

-- ============================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO EN CONSULTAS COMUNES
-- ============================================================
-- Entrenamientos completados por usuario y fecha (para analytics)
CREATE INDEX idx_workouts_user_completed_date
  ON public.workouts(user_id, date)
  WHERE status = 'completed';

-- Sets efectivos por workout_exercise (para fuerza/volumen)
CREATE INDEX idx_sets_effective
  ON public.sets(workout_exercise_id, set_number)
  WHERE completed AND NOT is_warmup;

-- Ejercicios de workout por orden (para mostrar en UI)
-- Índice simple sin subquery (PostgreSQL no permite subqueries en índices parciales)
CREATE INDEX idx_workout_exercises_workout_order
  ON public.workout_exercises(workout_id, "order");