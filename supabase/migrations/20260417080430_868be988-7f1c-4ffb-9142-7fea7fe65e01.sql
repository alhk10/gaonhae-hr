CREATE OR REPLACE FUNCTION public.is_valid_belt_level(belt_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  valid_belts text[] := ARRAY[
    'Foundation',
    'Foundation 1', 'Foundation 2', 'Foundation 3',
    'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
    'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
    '1st Poom', '1st Dan', '2nd Poom', '2nd Dan',
    '3rd Poom', '3rd Dan', '4th Poom', '4th Dan', '5th Dan'
  ];
BEGIN
  IF belt_value IS NULL THEN
    RETURN true;
  END IF;
  RETURN belt_value = ANY(valid_belts);
END;
$function$;