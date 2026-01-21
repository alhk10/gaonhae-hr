-- Add country and currency fields to branches table
ALTER TABLE public.branches 
ADD COLUMN country text DEFAULT 'Singapore',
ADD COLUMN currency text DEFAULT 'SGD';