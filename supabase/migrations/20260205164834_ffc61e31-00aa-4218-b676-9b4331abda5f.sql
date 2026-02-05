-- Uppercase certificate_name and display_name for existing students
UPDATE public.students SET 
  certificate_name = UPPER(certificate_name),
  display_name = UPPER(display_name)
WHERE certificate_name IS NOT NULL OR display_name IS NOT NULL;