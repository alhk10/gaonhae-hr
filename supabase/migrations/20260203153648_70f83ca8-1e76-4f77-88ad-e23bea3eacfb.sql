-- Create a function to validate belt levels against the allowed list
CREATE OR REPLACE FUNCTION public.is_valid_belt_level(belt_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  valid_belts text[] := ARRAY[
    'Foundation 1', 'Foundation 2', 'Foundation 3',
    'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
    'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
    'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
    'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
  ];
BEGIN
  IF belt_value IS NULL THEN
    RETURN true; -- NULL values are allowed
  END IF;
  RETURN belt_value = ANY(valid_belts);
END;
$$;

-- Create a function to validate belt level arrays
CREATE OR REPLACE FUNCTION public.is_valid_belt_level_array(belt_values text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  belt text;
BEGIN
  IF belt_values IS NULL THEN
    RETURN true; -- NULL arrays are allowed
  END IF;
  
  FOREACH belt IN ARRAY belt_values
  LOOP
    IF NOT public.is_valid_belt_level(belt) THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- Add CHECK constraint to students table
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_valid_belt_level;

ALTER TABLE public.students 
ADD CONSTRAINT students_valid_belt_level 
CHECK (public.is_valid_belt_level(current_belt));

-- Add CHECK constraints to grading_registrations table
ALTER TABLE public.grading_registrations 
DROP CONSTRAINT IF EXISTS grading_registrations_valid_current_belt;

ALTER TABLE public.grading_registrations 
DROP CONSTRAINT IF EXISTS grading_registrations_valid_target_belt;

ALTER TABLE public.grading_registrations 
ADD CONSTRAINT grading_registrations_valid_current_belt 
CHECK (public.is_valid_belt_level(current_belt));

ALTER TABLE public.grading_registrations 
ADD CONSTRAINT grading_registrations_valid_target_belt 
CHECK (public.is_valid_belt_level(target_belt));

-- Add CHECK constraint to grading_slots belt_levels array
ALTER TABLE public.grading_slots 
DROP CONSTRAINT IF EXISTS grading_slots_valid_belt_levels;

ALTER TABLE public.grading_slots 
ADD CONSTRAINT grading_slots_valid_belt_levels 
CHECK (public.is_valid_belt_level_array(belt_levels));

-- Add CHECK constraints to branch_timetables
ALTER TABLE public.branch_timetables 
DROP CONSTRAINT IF EXISTS branch_timetables_valid_belt_levels;

ALTER TABLE public.branch_timetables 
DROP CONSTRAINT IF EXISTS branch_timetables_valid_belt_range_min;

ALTER TABLE public.branch_timetables 
DROP CONSTRAINT IF EXISTS branch_timetables_valid_belt_range_max;

ALTER TABLE public.branch_timetables 
ADD CONSTRAINT branch_timetables_valid_belt_levels 
CHECK (public.is_valid_belt_level_array(belt_levels));

ALTER TABLE public.branch_timetables 
ADD CONSTRAINT branch_timetables_valid_belt_range_min 
CHECK (public.is_valid_belt_level(belt_range_min));

ALTER TABLE public.branch_timetables 
ADD CONSTRAINT branch_timetables_valid_belt_range_max 
CHECK (public.is_valid_belt_level(belt_range_max));

-- Add CHECK constraint to entitlements
ALTER TABLE public.entitlements 
DROP CONSTRAINT IF EXISTS entitlements_valid_belt_level_scope;

ALTER TABLE public.entitlements 
ADD CONSTRAINT entitlements_valid_belt_level_scope 
CHECK (public.is_valid_belt_level(belt_level_scope));

-- Add CHECK constraints to products
ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_valid_allowed_belt_levels;

ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_valid_min_belt_level;

ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_valid_max_belt_level;

ALTER TABLE public.products 
ADD CONSTRAINT products_valid_allowed_belt_levels 
CHECK (public.is_valid_belt_level_array(allowed_belt_levels));

ALTER TABLE public.products 
ADD CONSTRAINT products_valid_min_belt_level 
CHECK (public.is_valid_belt_level(min_belt_level));

ALTER TABLE public.products 
ADD CONSTRAINT products_valid_max_belt_level 
CHECK (public.is_valid_belt_level(max_belt_level));

-- Add comments for documentation
COMMENT ON FUNCTION public.is_valid_belt_level(text) IS 'Validates that a belt level string matches the allowed belt level values';
COMMENT ON FUNCTION public.is_valid_belt_level_array(text[]) IS 'Validates that all belt levels in an array match the allowed belt level values';