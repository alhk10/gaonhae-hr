-- Change age_from and age_to columns to NUMERIC to support decimal values
ALTER TABLE public.branch_timetables 
ALTER COLUMN age_from TYPE NUMERIC(4,1),
ALTER COLUMN age_to TYPE NUMERIC(4,1);

COMMENT ON COLUMN public.branch_timetables.age_from IS 'Minimum age for the class (supports 0.5 increments)';
COMMENT ON COLUMN public.branch_timetables.age_to IS 'Maximum age for the class (supports 0.5 increments)';