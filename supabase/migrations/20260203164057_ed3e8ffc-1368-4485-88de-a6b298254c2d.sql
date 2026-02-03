-- Update existing belt values to new naming convention
-- First, update students table
UPDATE public.students SET current_belt = 'White' WHERE current_belt = 'White Tip';
UPDATE public.students SET current_belt = 'Black Tip' WHERE current_belt IN ('Brown Tip', 'Brown');
UPDATE public.students SET current_belt = '1st Poom' WHERE current_belt = 'Poom 1';
UPDATE public.students SET current_belt = '2nd Poom' WHERE current_belt = 'Poom 2';
UPDATE public.students SET current_belt = '3rd Poom' WHERE current_belt = 'Poom 3';
UPDATE public.students SET current_belt = '4th Poom' WHERE current_belt = 'Poom 4';
UPDATE public.students SET current_belt = '1st Dan' WHERE current_belt = 'Dan 1';
UPDATE public.students SET current_belt = '2nd Dan' WHERE current_belt = 'Dan 2';
UPDATE public.students SET current_belt = '3rd Dan' WHERE current_belt = 'Dan 3';
UPDATE public.students SET current_belt = '4th Dan' WHERE current_belt = 'Dan 4';
UPDATE public.students SET current_belt = '5th Dan' WHERE current_belt = 'Dan 5';

-- Update grading_registrations table
UPDATE public.grading_registrations SET current_belt = 'White' WHERE current_belt = 'White Tip';
UPDATE public.grading_registrations SET current_belt = 'Black Tip' WHERE current_belt IN ('Brown Tip', 'Brown');
UPDATE public.grading_registrations SET current_belt = '1st Poom' WHERE current_belt = 'Poom 1';
UPDATE public.grading_registrations SET current_belt = '2nd Poom' WHERE current_belt = 'Poom 2';
UPDATE public.grading_registrations SET current_belt = '3rd Poom' WHERE current_belt = 'Poom 3';
UPDATE public.grading_registrations SET current_belt = '4th Poom' WHERE current_belt = 'Poom 4';
UPDATE public.grading_registrations SET current_belt = '1st Dan' WHERE current_belt = 'Dan 1';
UPDATE public.grading_registrations SET current_belt = '2nd Dan' WHERE current_belt = 'Dan 2';
UPDATE public.grading_registrations SET current_belt = '3rd Dan' WHERE current_belt = 'Dan 3';
UPDATE public.grading_registrations SET current_belt = '4th Dan' WHERE current_belt = 'Dan 4';
UPDATE public.grading_registrations SET current_belt = '5th Dan' WHERE current_belt = 'Dan 5';

UPDATE public.grading_registrations SET target_belt = 'White' WHERE target_belt = 'White Tip';
UPDATE public.grading_registrations SET target_belt = 'Black Tip' WHERE target_belt IN ('Brown Tip', 'Brown');
UPDATE public.grading_registrations SET target_belt = '1st Poom' WHERE target_belt = 'Poom 1';
UPDATE public.grading_registrations SET target_belt = '2nd Poom' WHERE target_belt = 'Poom 2';
UPDATE public.grading_registrations SET target_belt = '3rd Poom' WHERE target_belt = 'Poom 3';
UPDATE public.grading_registrations SET target_belt = '4th Poom' WHERE target_belt = 'Poom 4';
UPDATE public.grading_registrations SET target_belt = '1st Dan' WHERE target_belt = 'Dan 1';
UPDATE public.grading_registrations SET target_belt = '2nd Dan' WHERE target_belt = 'Dan 2';
UPDATE public.grading_registrations SET target_belt = '3rd Dan' WHERE target_belt = 'Dan 3';
UPDATE public.grading_registrations SET target_belt = '4th Dan' WHERE target_belt = 'Dan 4';
UPDATE public.grading_registrations SET target_belt = '5th Dan' WHERE target_belt = 'Dan 5';

-- Update is_valid_belt_level function with correct belt order
CREATE OR REPLACE FUNCTION public.is_valid_belt_level(belt_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  valid_belts text[] := ARRAY[
    'Foundation 1', 'Foundation 2', 'Foundation 3',
    'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
    'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
    '1st Poom', '1st Dan', '2nd Poom', '2nd Dan',
    '3rd Poom', '3rd Dan', '4th Poom', '4th Dan', '5th Dan'
  ];
BEGIN
  IF belt_value IS NULL THEN
    RETURN true; -- NULL values are allowed
  END IF;
  RETURN belt_value = ANY(valid_belts);
END;
$function$;

-- Update is_valid_belt_level_array function to use the updated single-value function
CREATE OR REPLACE FUNCTION public.is_valid_belt_level_array(belt_values text[])
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$;