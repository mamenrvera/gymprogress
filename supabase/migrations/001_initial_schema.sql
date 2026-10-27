-- GymProgress: Esquema inicial compatible con datos existentes
-- IDs: UUID v4 (compatible con crypto.randomUUID actual)
-- Fechas: date (YYYY-MM-DD) para fechas locales, timestamptz para timestamps
-- Ejecutar PRIMERO (orden 1/3)

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- para gen_random_uuid()

-- ============================================================
-- PERFILES DE USUARIO (extiende auth.users)
-- ============================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  initial_weight_kg numeric(5,2) DEFAULT 63,
  height_cm integer DEFAULT 163,
  goal text DEFAULT 'perder_grasa_ganar_musculo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- OBJETIVOS NUTRICIONALES (1:1 con profiles)
-- ============================================================
CREATE TABLE targets (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  calories integer DEFAULT 1400,
  protein integer DEFAULT 125,
  fat integer DEFAULT 40,
  carbs integer DEFAULT 90,
  carb_min integer DEFAULT 85,
  carb_max integer DEFAULT 95,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ALIMENTOS (biblioteca personal)
-- ============================================================
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  category text,
  calories_per_100 integer NOT NULL,
  protein_per_100 numeric(5,2) NOT NULL,
  carbs_per_100 numeric(5,2) NOT NULL,
  fat_per_100 numeric(5,2) NOT NULL,
  fiber_per_100 numeric(5,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_foods_user ON foods(user_id);
CREATE INDEX idx_foods_user_name ON foods(user_id, name);

-- ============================================================
-- REGISTROS DE COMIDAS (entries)
-- ============================================================
CREATE TABLE entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal text NOT NULL CHECK (meal IN ('desayuno','almuerzo','comida','merienda','cena','snack')),
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  brand text,
  grams numeric(8,2) NOT NULL CHECK (grams > 0),
  calories_declared numeric(8,2) NOT NULL,
  calories_estimated numeric(8,2) NOT NULL,
  protein numeric(8,2) NOT NULL,
  carbs numeric(8,2) NOT NULL,
  fat numeric(8,2) NOT NULL,
  fiber numeric(8,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_entries_user_date ON entries(user_id, date);
CREATE INDEX idx_entries_user_meal ON entries(user_id, date, meal);
CREATE INDEX idx_entries_user_food ON entries(user_id, food_id);

-- ============================================================
-- EJERCICIOS (biblioteca personal)
-- ============================================================
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text NOT NULL,
  equipment text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_exercises_user ON exercises(user_id);
CREATE INDEX idx_exercises_user_name ON exercises(user_id, name);

-- ============================================================
-- ENTRENAMIENTOS (workouts / sesiones)
-- ============================================================
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed')),
  notes text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);

-- ============================================================
-- EJERCICIOS DE ENTRENAMIENTO (workout_exercises)
-- ============================================================
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);

-- ============================================================
-- SERIES (sets)
-- ============================================================
CREATE TABLE sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  workout_exercise_id uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight_kg numeric(6,2) NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  rir integer,
  is_warmup boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_sets_workout ON sets(workout_id);
CREATE INDEX idx_sets_workout_exercise ON sets(workout_exercise_id);

-- ============================================================
-- PESO CORPORAL (body_weights)
-- ============================================================
CREATE TABLE body_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_body_weights_user_date ON body_weights(user_id, date);

-- ============================================================
-- AJUSTES DE TEMA (para sincronizar tema entre dispositivos)
-- ============================================================
CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  updated_at timestamptz DEFAULT now()
);