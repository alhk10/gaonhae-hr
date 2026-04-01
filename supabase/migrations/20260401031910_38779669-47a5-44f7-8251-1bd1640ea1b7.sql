
CREATE OR REPLACE FUNCTION public.generate_student_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_prefix text := 'STU' || to_char(now(), 'YY');
  next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('student-number-' || year_prefix));

  SELECT COALESCE(
    MAX(NULLIF(substring(student_number from length(year_prefix)+1), '')::integer),
    0
  ) + 1
  INTO next_number
  FROM public.students
  WHERE student_number LIKE year_prefix || '%';

  RETURN year_prefix || lpad(next_number::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_student_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.student_number IS NULL OR btrim(NEW.student_number) = '' THEN
    NEW.student_number := public.generate_student_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_student_number ON public.students;
CREATE TRIGGER trg_assign_student_number
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_student_number();
