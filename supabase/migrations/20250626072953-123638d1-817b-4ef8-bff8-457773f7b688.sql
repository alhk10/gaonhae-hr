
-- Add location columns to the attendance table
ALTER TABLE public.attendance 
ADD COLUMN location TEXT,
ADD COLUMN clock_in_location TEXT,
ADD COLUMN clock_out_location TEXT;
