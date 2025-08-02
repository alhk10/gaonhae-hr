-- Drop the existing check constraint that's causing the issue
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_type_check;

-- Add a new check constraint that includes "Miscellaneous"
ALTER TABLE public.claims ADD CONSTRAINT claims_type_check 
CHECK (type IN ('Travel', 'Meal', 'Medical', 'Accommodation', 'Transport', 'Others', 'Equipment', 'Training', 'Miscellaneous'));