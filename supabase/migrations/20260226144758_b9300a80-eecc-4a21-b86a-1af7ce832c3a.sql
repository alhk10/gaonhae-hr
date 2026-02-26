-- Fix invoices FK to CASCADE on student delete
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_student_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Fix class_attendance FK to CASCADE on student delete
ALTER TABLE public.class_attendance
  DROP CONSTRAINT class_attendance_student_id_fkey;
ALTER TABLE public.class_attendance
  ADD CONSTRAINT class_attendance_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;