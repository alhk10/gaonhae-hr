-- Add lesson configuration columns to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_lesson boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lessons_per_week integer,
  ADD COLUMN IF NOT EXISTS lesson_days text[];

-- Add comment for documentation
COMMENT ON COLUMN public.products.is_lesson IS 'Marks product as a lesson/class type';
COMMENT ON COLUMN public.products.lessons_per_week IS 'Number of lessons per week (1-7)';
COMMENT ON COLUMN public.products.lesson_days IS 'Days of the week for lessons (e.g., Monday, Wednesday)';