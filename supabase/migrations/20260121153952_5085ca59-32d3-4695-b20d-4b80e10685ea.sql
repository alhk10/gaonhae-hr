-- Add age_group column to branch_timetables if not exists
ALTER TABLE public.branch_timetables 
ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.branch_timetables.age_group IS 'Age group for the class: Kids (4-6), Junior (7-12), Teen (13-17), Adult (18+), All Ages';