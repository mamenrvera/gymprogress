-- Diagnóstico de ejercicios wger (ejecutar en SQL Editor, solo lectura)

-- 1. Conteo global vs personal
SELECT
  is_global,
  external_source,
  count(*) AS total
FROM public.exercises
GROUP BY is_global, external_source
ORDER BY is_global DESC, external_source;

-- 2. Globales de wger
SELECT count(*) AS wger_globales
FROM public.exercises
WHERE is_global = true AND external_source = 'wger';

-- 3. Personales con external_source wger (si los hay)
SELECT count(*) AS wger_personales
FROM public.exercises
WHERE is_global = false AND external_source = 'wger';

-- 4. Referencias en rutinas
SELECT count(*) AS rutinas_ref_wger
FROM public.routine_exercises re
JOIN public.exercises e ON e.id = re.exercise_id
WHERE e.external_source = 'wger' AND e.is_global = true;

-- 5. Referencias en entrenamientos
SELECT count(*) AS workouts_ref_wger
FROM public.workout_exercises we
JOIN public.exercises e ON e.id = we.exercise_id
WHERE e.external_source = 'wger' AND e.is_global = true;

-- 6. Nombres afectados (para verificar que se conservan)
SELECT e.id, e.name, e.muscle_group
FROM public.exercises e
WHERE e.external_source = 'wger' AND e.is_global = true
ORDER BY e.name
LIMIT 20;
"