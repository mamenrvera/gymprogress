-- GymProgress: Bloques de comidas creados manualmente por el usuario
-- Ejecutar DECIMOSÉPTIMO (orden 17/17), después de 001-016.
-- Esta migración es idempotente y compatible con entradas existentes.

-- ============================================================
-- 1. TABLA meal_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('desayuno','almuerzo','comida','merienda','cena','snack')),
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_blocks_user_date
  ON public.meal_blocks(user_id, date);

-- ============================================================
-- 2. AÑADIR meal_block_id A entries (nullable para compatibilidad)
-- ============================================================
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS meal_block_id uuid REFERENCES public.meal_blocks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_meal_block
  ON public.entries(meal_block_id);

-- ============================================================
-- 3. RLS para meal_blocks (privado por usuario)
-- ============================================================
ALTER TABLE public.meal_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_blocks_all_own" ON public.meal_blocks;
CREATE POLICY "meal_blocks_all_own"
ON public.meal_blocks FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. BACKFILL: crear bloques para entradas existentes
-- ============================================================
-- Para cada combinación (user_id, date, meal) con entradas sin bloque,
-- crear un meal_block y asignarlo a esas entradas.
DO $$
DECLARE
  rec record;
  new_block_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id, date, meal
    FROM public.entries
    WHERE meal_block_id IS NULL
  LOOP
    INSERT INTO public.meal_blocks (user_id, date, meal_type)
    VALUES (rec.user_id, rec.date, rec.meal)
    RETURNING id INTO new_block_id;

    UPDATE public.entries
    SET meal_block_id = new_block_id
    WHERE user_id = rec.user_id
      AND date = rec.date
      AND meal = rec.meal
      AND meal_block_id IS NULL;
  END LOOP;
END $$;

-- ============================================================
-- 5. TRIGGER updated_at (si existe la función)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS meal_blocks_updated_at ON public.meal_blocks;
    CREATE TRIGGER meal_blocks_updated_at
      BEFORE UPDATE ON public.meal_blocks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- NOTAS
-- ============================================================
-- 1. Las entradas existentes se asocian a bloques creados automáticamente.
-- 2. No se borran ni modifican datos de comidas existentes.
-- 3. Las rutinas, entrenamientos y datos personales no se tocan.
-- 4. meal_block_id es nullable para compatibilidad con entradas antiguas.