-- GymProgress: Políticas RLS (Row Level Security)
-- Todas las tablas personales deben tener RLS habilitado
-- Las políticas usan auth.uid() para garantizar aislamiento total entre usuarios
-- Ejecutar SEGUNDO (orden 2/3), después de 001_initial_schema.sql

-- ============================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCIÓN AUXILIAR: ID DE USUARIO ACTUAL
-- ============================================================
-- SECURITY DEFINER con search_path fijado para evitar search path injection
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- ============================================================
-- PROFILES
-- ============================================================
-- Un usuario solo puede ver/crear/actualizar su propio perfil
-- NO se añade política DELETE: los perfiles se borran via auth.admin.deleteUser
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = current_user_id());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = current_user_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = current_user_id());

-- ============================================================
-- TARGETS (objetivos nutricionales)
-- ============================================================
CREATE POLICY "targets_all_own" ON targets
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- FOODS (biblioteca de alimentos)
-- ============================================================
CREATE POLICY "foods_all_own" ON foods
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- ENTRIES (registros de comidas)
-- ============================================================
CREATE POLICY "entries_all_own" ON entries
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- EXERCISES (biblioteca de ejercicios)
-- ============================================================
CREATE POLICY "exercises_all_own" ON exercises
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- WORKOUTS (sesiones de entrenamiento)
-- ============================================================
CREATE POLICY "workouts_all_own" ON workouts
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- WORKOUT_EXERCISES (ejercicios dentro de sesiones)
-- CRÍTICO: Validar que el workout pertenece al usuario
-- ============================================================
CREATE POLICY "workout_exercises_select_own" ON workout_exercises
  FOR SELECT USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "workout_exercises_insert_own" ON workout_exercises
  FOR INSERT WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "workout_exercises_update_own" ON workout_exercises
  FOR UPDATE USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "workout_exercises_delete_own" ON workout_exercises
  FOR DELETE USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

-- ============================================================
-- SETS (series)
-- CRÍTICO: Validar que el workout pertenece al usuario
-- ============================================================
CREATE POLICY "sets_select_own" ON sets
  FOR SELECT USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "sets_insert_own" ON sets
  FOR INSERT WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "sets_update_own" ON sets
  FOR UPDATE USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

CREATE POLICY "sets_delete_own" ON sets
  FOR DELETE USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = current_user_id()
    )
  );

-- ============================================================
-- BODY_WEIGHTS (pesajes)
-- ============================================================
CREATE POLICY "body_weights_all_own" ON body_weights
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ============================================================
-- USER_PREFERENCES (tema, etc.)
-- ============================================================
CREATE POLICY "user_preferences_all_own" ON user_preferences
  FOR ALL USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());