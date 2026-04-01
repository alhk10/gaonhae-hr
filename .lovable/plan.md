

## Plan: Fix Duplicate Student Number on Registration Approval

### Problem
The error "duplicate key value violates unique constraint 'students_student_number_key'" occurs because `generateStudentNumber()` queries students via the Supabase client, which is subject to RLS. The invoice-access user (`ysn.gaonhaetaekwondo@gmail.com`) may not see all students due to RLS restrictions, so it finds a lower max student number and generates a duplicate.

This is the same class of bug previously fixed for payment numbers.

### Solution
Move student number generation to a `SECURITY DEFINER` database function with advisory locking (same pattern as `generate_payment_number()`), then use it via a `BEFORE INSERT` trigger on the `students` table.

### Changes

#### 1. Database Migration — Create `generate_student_number()` function + trigger

```sql
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
```

#### 2. Code Change — `src/services/studentService.ts`
- Remove the client-side `generateStudentNumber()` function
- Remove the `student_number` field from the insert payload in `createStudent()`, letting the trigger handle it

### Result
Student number generation bypasses RLS, uses advisory locking to prevent race conditions, and works correctly for all user types including invoice-access employees.

