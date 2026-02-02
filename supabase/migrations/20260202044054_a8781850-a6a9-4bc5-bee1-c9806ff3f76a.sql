-- Add whatsapp column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.students.whatsapp IS 'Student WhatsApp number for messaging';