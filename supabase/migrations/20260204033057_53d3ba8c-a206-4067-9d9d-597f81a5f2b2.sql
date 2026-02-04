-- Add passport_no column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS passport_no text;