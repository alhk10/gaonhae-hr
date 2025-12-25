-- Add slot timing configuration for each day of the week
ALTER TABLE public.slot_booking_pricing_config
ADD COLUMN IF NOT EXISTS monday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS monday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS tuesday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS tuesday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS wednesday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS wednesday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS thursday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS thursday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS friday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS friday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS saturday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS saturday_end_time time DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS sunday_start_time time DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS sunday_end_time time DEFAULT '21:00';