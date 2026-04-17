UPDATE public.branch_timetables
SET belt_levels = (
  SELECT ARRAY_AGG(
    CASE b
      WHEN 'Dan 1' THEN '1st Dan' WHEN 'Dan 2' THEN '2nd Dan'
      WHEN 'Dan 3' THEN '3rd Dan' WHEN 'Dan 4' THEN '4th Dan'
      WHEN 'Dan 5' THEN '5th Dan'
      WHEN 'Poom 1' THEN '1st Poom' WHEN 'Poom 2' THEN '2nd Poom'
      WHEN 'Poom 3' THEN '3rd Poom' WHEN 'Poom 4' THEN '4th Poom'
      ELSE b
    END
  )
  FROM unnest(belt_levels) AS b
)
WHERE belt_levels && ARRAY['Dan 1','Dan 2','Dan 3','Dan 4','Dan 5','Poom 1','Poom 2','Poom 3','Poom 4'];

UPDATE public.grading_slots
SET belt_levels = (
  SELECT ARRAY_AGG(
    CASE b
      WHEN 'Dan 1' THEN '1st Dan' WHEN 'Dan 2' THEN '2nd Dan'
      WHEN 'Dan 3' THEN '3rd Dan' WHEN 'Dan 4' THEN '4th Dan'
      WHEN 'Dan 5' THEN '5th Dan'
      WHEN 'Poom 1' THEN '1st Poom' WHEN 'Poom 2' THEN '2nd Poom'
      WHEN 'Poom 3' THEN '3rd Poom' WHEN 'Poom 4' THEN '4th Poom'
      ELSE b
    END
  )
  FROM unnest(belt_levels) AS b
)
WHERE belt_levels && ARRAY['Dan 1','Dan 2','Dan 3','Dan 4','Dan 5','Poom 1','Poom 2','Poom 3','Poom 4'];