-- Add missing columns to students table for enhanced student management
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS nric_passport text,
ADD COLUMN IF NOT EXISTS preferred_name text,
ADD COLUMN IF NOT EXISTS previous_experience text,
ADD COLUMN IF NOT EXISTS training_goals text,
ADD COLUMN IF NOT EXISTS medical_conditions text,
ADD COLUMN IF NOT EXISTS dietary_restrictions text;

-- Update the trigger to ensure updated_at is maintained
CREATE OR REPLACE FUNCTION public.update_updated_at_column_students()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for students table if it doesn't exist
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_students();