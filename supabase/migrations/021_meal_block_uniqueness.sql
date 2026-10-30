-- GymProgress: Unicidad de bloques de comida por usuario, fecha y tipo
-- Ejecutar VIGÉSIMO PRIMERO (orden 21/21), después de 001-020.
-- Esta migración es idempotente y NO borra ni combina datos existentes.
--
-- Objetivo: impedir que se creen dos bloques del mismo tipo de comida
-- (desayuno, almuerzo, comida, merienda, cena) para el mismo usuario y día.
-- Los bloques de tipo 'snack' se excluyen (pueden repetirse).
--
-- IMPORTANTE: si ya existen duplicados históricos, la creación del índice
-- fallará. En ese caso, revisa y limpia los duplicados manualmente antes
-- de ejecutar esta migración, o sáltala (la validación del cliente sigue
-- activa). No se eliminan datos automáticamente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'meal_blocks_unique_per_type'
  ) THEN
    -- Solo crear si no hay duplicados existentes
    IF NOT EXISTS (
      SELECT user_id, date, meal_type
      FROM public.meal_blocks
      WHERE meal_type <> 'snack'
      GROUP BY user_id, date, meal_type
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX meal_blocks_unique_per_type
        ON public.meal_blocks (user_id, date, meal_type)
        WHERE meal_type <> 'snack';
    ELSE
      RAISE NOTICE 'Se detectaron bloques duplicados. No se creó el índice. Limpia los duplicados manualmente.';
    END IF;
  END IF;
END $$;
