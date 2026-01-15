-- Increase numeric precision for budget item costs to support larger amounts

DO $$
BEGIN
  -- unit_cost
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_items'
      AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE public.budget_items
      ALTER COLUMN unit_cost TYPE numeric(15,2)
      USING unit_cost::numeric(15,2);
  END IF;

  -- total_cost
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_items'
      AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE public.budget_items
      ALTER COLUMN total_cost TYPE numeric(15,2)
      USING total_cost::numeric(15,2);
  END IF;
END $$;
