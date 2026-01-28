-- Add a title field to budgets to store a human-readable budget request name
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS title text;

-- Optional: backfill existing rows with a placeholder (commented out)
-- UPDATE public.budgets SET title = CONCAT('Budget ', budget_number) WHERE title IS NULL;
