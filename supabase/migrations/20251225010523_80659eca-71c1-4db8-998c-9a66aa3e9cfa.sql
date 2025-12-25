-- Add milestone bonus columns to slot_booking_pricing_config
ALTER TABLE public.slot_booking_pricing_config 
ADD COLUMN IF NOT EXISTS milestone_5_slots_bonus numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS milestone_10_slots_bonus numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS milestone_16_slots_bonus numeric DEFAULT 100;