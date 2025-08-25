-- Remove total_slots column from branches table
ALTER TABLE branches DROP COLUMN IF EXISTS total_slots;