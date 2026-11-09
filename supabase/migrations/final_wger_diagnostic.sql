-- Diagnóstico definitivo de wger (solo lectura)

-- 1. Todas las FK que apuntan a public.exercises
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'exercises'
  AND ccu.table_schema = 'public'
ORDER BY tc.table_name;

-- 2. Conteo por origen
SELECT is_global, external_source, count(*) AS total
FROM public.exercises
GROUP BY is_global, external_source
ORDER BY is_global DESC, external_source;

-- 3. Globales de wger
SELECT count(*) AS wger_globales
FROM public.exercises
WHERE is_global = true AND external_source = 'wger';

-- 4. Personales con external_source wger
SELECT count(*) AS wger_personales
FROM public.exercises
WHERE is_global = false AND external_source = 'wger';

-- 5. Referencias en rutinas (se pondrán a null, nombres conservados)
SELECT count(*) AS rutinas_ref_wger
FROM public.routine_exercises re
JOIN public.exercises e ON e.id = re.exercise_id
WHERE e.external_source = 'wger' AND e.is_global = true;

-- 6. Referencias en entrenamientos (se pondrán a null, nombres conservados)
SELECT count(*) AS workouts_ref_wger
FROM public.workout_exercises we
JOIN public.exercises e ON e.id = we.exercise_id
WHERE e.external_source = 'wger' AND e.is_global = true;

-- 7. exercise_muscles de wger (se borran en cascada)
SELECT count(*) AS muscles_wger
FROM public.exercise_muscles em
JOIN public.exercises e ON e.id = em.exercise_id
WHERE e.external_source = 'wger' AND e.is_global = true;

-- 8. Ejercicios personales y RepDB (no deben tocarse)
SELECT count(*) AS personales FROM public.exercises WHERE is_global = false;
SELECT count(*) AS repdb FROM public.exercises WHERE external_source = 'repdb';
"