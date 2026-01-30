-- Add allowed_belt_levels column to products table for multi-select belt level filtering
ALTER TABLE products 
ADD COLUMN allowed_belt_levels TEXT[];