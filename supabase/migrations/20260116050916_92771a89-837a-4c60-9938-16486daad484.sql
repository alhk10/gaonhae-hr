-- Drop the existing constraint and add updated one with partner claim types
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_type_check;

ALTER TABLE public.claims ADD CONSTRAINT claims_type_check CHECK (type = ANY (ARRAY[
  'Travel'::text, 
  'Meal'::text, 
  'Medical'::text, 
  'Accommodation'::text, 
  'Transport'::text, 
  'Others'::text, 
  'Equipment'::text, 
  'Training'::text, 
  'Miscellaneous'::text,
  'Office Stationeries'::text,
  'Training Equipment'::text,
  'Other Business Expense'::text
]));