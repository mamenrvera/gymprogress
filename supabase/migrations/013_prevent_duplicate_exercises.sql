-- GymProgress: Impedir ejercicios duplicados en el catálogo compartido
-- Ejecutar DECIMOTERCERO (orden 13/13), después de 001-012.
-- Esta migración es idempotente en caso de NO haber duplicados.
--
-- IMPORTANTE: Si ya existen ejercicios duplicados, la migración SE DETIENE
-- con un mensaje que los lista. NO se borran ni combinan ejercicios.
-- Resuelve los duplicados manualmente y vuelve a ejecutar la migración.

-- ============================================================
-- 1. COLUMNA NORMALIZADA (nombre sin mayúsculas ni espacios sobrantes)
-- ============================================================
-- Columna generada: se calcula automáticamente en cada INSERT/UPDATE.
-- lower() y btrim() son funciones IMMUTABLE (válidas para GENERATED).
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS name_normalized text
  GENERATED ALWAYS AS (lower(btrim(name))) STORED;

-- ============================================================
-- 2. COMPROBAR DUPLICADOS EXISTENTES (sin borrar ni combinar)
-- ============================================================
-- Si hay duplicados, la migración falla CON explicación y listado,
-- para que se resuelvan manualmente antes de volver a ejecutarla.
DO $$
DECLARE
  dup_count int;
  dup_list text;
BEGIN
  SELECT count(*), string_agg(line, E'\n')
    INTO dup_count, dup_list
  FROM (
    SELECT format(
             '  - Nombre «%s» (normalizado «%s») aparece %s veces. IDs: %s',
             min(name), name_normalized, count(*), string_agg(id::text, ', ')
           ) AS line
    FROM public.exercises
    GROUP BY name_normalized
    HAVING count(*) > 1
    ORDER BY min(name)
  ) AS duplicates;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Migración 013 abortada: existen % grupo(s) de ejercicios duplicados en el catálogo. No se han borrado ni combinado datos. Resuelve los duplicados manualmente y vuelve a ejecutar esta migración. Detalles: %', dup_count, dup_list;
  END IF;
END $$;

-- ============================================================
-- 3. RESTRICCIÓN UNIQUE SOBRE EL NOMBRE NORMALIZADO
-- ============================================================
-- Protección a nivel de base de datos: incluso si dos usuarios intentan
-- crear el mismo ejercicio simultáneamente, uno de los INSERT fallará
-- con error 23505 (unique violation), que la aplicación traduce al mensaje
-- «Este ejercicio ya existe en el catálogo de GymProgress.»
CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_normalized_unique
  ON public.exercises (name_normalized);

-- ============================================================
-- 4. VERIFICACIÓN (ejecutar manualmente después de la migración)
-- ============================================================

-- Ver la columna generada y sus valores:
-- SELECT id, name, name_normalized FROM public.exercises ORDER BY name;

-- Buscar duplicados restantes (debe devolver 0 filas):
-- SELECT name_normalized, count(*) FROM public.exercises
-- GROUP BY name_normalized HAVING count(*) > 1;

-- Verificar que el índice único existe:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'exercises';

-- Probar la restricción manualmente (debe fallar la segunda inserción):
-- INSERT INTO public.exercises (user_id, name, muscle_group) VALUES (auth.uid(), 'Prueba Dup', 'pecho');
-- INSERT INTO public.exercises (user_id, name, muscle_group) VALUES (auth.uid(), '  prueba DUP ', 'pecho');
-- Error esperado: duplicate key value violates unique constraint "exercises_name_normalized_unique"
-- Limpieza tras la prueba:
-- DELETE FROM public.exercises WHERE name_normalized = 'prueba dup';

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. La columna name_normalized se calcula automáticamente: no hay que
--    enviarla desde la aplicación ni mantenerla manualmente.
-- 2. btrim() elimina espacios al principio y al final; lower() ignora
--    mayúsculas/minúsculas. «Peso muerto», «peso muerto» y « Peso muerto »
--    producen el mismo valor normalizado.
-- 3. La restricción UNIQUE actúa también sobre UPDATE: si el administrador
--    intenta renombrar un ejercicio con el nombre de otro, falla con 23505.
-- 4. No se modifican políticas RLS, fotografías, rutinas, entrenamientos,
--    series ni pesos. Las rutinas referencian exercises por id, no por nombre.
-- 5. Si la migración falla por duplicados existentes, el bloque DO lanza
--    una excepción con el listado completo. Toda la migración se revierte
--    (transacción), por lo que la base de datos queda intacta.
-- 6. La detección de duplicados en la aplicación (saveExercise) actúa como
--    primera capa; esta restricción es la protección final ante condiciones
--    de carrera (dos usuarios creando a la vez).