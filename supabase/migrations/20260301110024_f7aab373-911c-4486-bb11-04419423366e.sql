ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS delete_on date;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS link text;