-- Add years_of_service_bonus_per_year column to slot_booking_pricing_config table
ALTER TABLE slot_booking_pricing_config 
ADD COLUMN years_of_service_bonus_per_year numeric NOT NULL DEFAULT 3.00;

-- Add comment explaining the field
COMMENT ON COLUMN slot_booking_pricing_config.years_of_service_bonus_per_year IS 'Additional payment per day for each year of service. Default is $3 per year.';