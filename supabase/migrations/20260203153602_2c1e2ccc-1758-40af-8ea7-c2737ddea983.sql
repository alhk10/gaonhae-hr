-- Convert hyphenated belt values to proper format with spaces
-- This migration updates all tables that store belt level values

-- Helper function to convert a single belt value
CREATE OR REPLACE FUNCTION convert_belt_format(belt_value text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF belt_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert common hyphenated patterns to proper format
  RETURN CASE
    WHEN lower(belt_value) = 'foundation-1' THEN 'Foundation 1'
    WHEN lower(belt_value) = 'foundation-2' THEN 'Foundation 2'
    WHEN lower(belt_value) = 'foundation-3' THEN 'Foundation 3'
    WHEN lower(belt_value) = 'yellow-tip' THEN 'Yellow Tip'
    WHEN lower(belt_value) = 'green-tip' THEN 'Green Tip'
    WHEN lower(belt_value) = 'blue-tip' THEN 'Blue Tip'
    WHEN lower(belt_value) = 'red-tip' THEN 'Red Tip'
    WHEN lower(belt_value) = 'black-tip' THEN 'Black Tip'
    WHEN lower(belt_value) = 'dan-1' THEN 'Dan 1'
    WHEN lower(belt_value) = 'dan-2' THEN 'Dan 2'
    WHEN lower(belt_value) = 'dan-3' THEN 'Dan 3'
    WHEN lower(belt_value) = 'dan-4' THEN 'Dan 4'
    WHEN lower(belt_value) = 'dan-5' THEN 'Dan 5'
    WHEN lower(belt_value) = 'poom-1' THEN 'Poom 1'
    WHEN lower(belt_value) = 'poom-2' THEN 'Poom 2'
    WHEN lower(belt_value) = 'poom-3' THEN 'Poom 3'
    WHEN lower(belt_value) = 'poom-4' THEN 'Poom 4'
    -- Already properly formatted or simple belt names
    ELSE initcap(replace(belt_value, '-', ' '))
  END;
END;
$$;

-- Update students table
UPDATE public.students 
SET current_belt = convert_belt_format(current_belt)
WHERE current_belt LIKE '%-%';

-- Update grading_registrations table
UPDATE public.grading_registrations 
SET 
  current_belt = convert_belt_format(current_belt),
  target_belt = convert_belt_format(target_belt)
WHERE current_belt LIKE '%-%' OR target_belt LIKE '%-%';

-- Update grading_slots belt_levels array
UPDATE public.grading_slots 
SET belt_levels = (
  SELECT array_agg(convert_belt_format(belt))
  FROM unnest(belt_levels) AS belt
)
WHERE EXISTS (
  SELECT 1 FROM unnest(belt_levels) AS belt WHERE belt LIKE '%-%'
);

-- Update branch_timetables belt_levels array
UPDATE public.branch_timetables 
SET belt_levels = (
  SELECT array_agg(convert_belt_format(belt))
  FROM unnest(belt_levels) AS belt
)
WHERE belt_levels IS NOT NULL AND EXISTS (
  SELECT 1 FROM unnest(belt_levels) AS belt WHERE belt LIKE '%-%'
);

-- Update branch_timetables belt range columns
UPDATE public.branch_timetables 
SET 
  belt_range_min = convert_belt_format(belt_range_min),
  belt_range_max = convert_belt_format(belt_range_max)
WHERE belt_range_min LIKE '%-%' OR belt_range_max LIKE '%-%';

-- Update entitlements belt_level_scope
UPDATE public.entitlements 
SET belt_level_scope = convert_belt_format(belt_level_scope)
WHERE belt_level_scope LIKE '%-%';

-- Update products allowed_belt_levels array
UPDATE public.products 
SET allowed_belt_levels = (
  SELECT array_agg(convert_belt_format(belt))
  FROM unnest(allowed_belt_levels) AS belt
)
WHERE allowed_belt_levels IS NOT NULL AND EXISTS (
  SELECT 1 FROM unnest(allowed_belt_levels) AS belt WHERE belt LIKE '%-%'
);

-- Update products min/max belt levels
UPDATE public.products 
SET 
  min_belt_level = convert_belt_format(min_belt_level),
  max_belt_level = convert_belt_format(max_belt_level)
WHERE min_belt_level LIKE '%-%' OR max_belt_level LIKE '%-%';

-- Drop the helper function after use
DROP FUNCTION IF EXISTS convert_belt_format(text);