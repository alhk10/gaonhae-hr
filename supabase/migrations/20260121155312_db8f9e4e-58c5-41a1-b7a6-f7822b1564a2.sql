-- Add new columns for age range and belt levels array
ALTER TABLE public.branch_timetables 
ADD COLUMN IF NOT EXISTS age_from INTEGER,
ADD COLUMN IF NOT EXISTS age_to INTEGER,
ADD COLUMN IF NOT EXISTS belt_levels TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.branch_timetables.age_from IS 'Minimum age for the class';
COMMENT ON COLUMN public.branch_timetables.age_to IS 'Maximum age for the class';
COMMENT ON COLUMN public.branch_timetables.belt_levels IS 'Array of belt levels allowed for this class';