-- Create table for slot booking pricing configuration
CREATE TABLE IF NOT EXISTS public.slot_booking_pricing_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Base rates
  weekday_base_rate numeric NOT NULL DEFAULT 70,
  weekend_base_rate numeric NOT NULL DEFAULT 85,
  
  -- Dan level bonuses
  dan_first_bonus numeric NOT NULL DEFAULT 5,
  dan_second_bonus numeric NOT NULL DEFAULT 10,
  dan_third_above_bonus numeric NOT NULL DEFAULT 15,
  
  -- Qualification bonuses
  stf_coach_induction_bonus numeric NOT NULL DEFAULT 1,
  stf_poomsae_coach_level1_bonus numeric NOT NULL DEFAULT 3,
  stf_poomsae_coach_level2_bonus numeric NOT NULL DEFAULT 5,
  stf_poomsae_coach_level3_bonus numeric NOT NULL DEFAULT 7,
  sg_coach_level1_bonus numeric NOT NULL DEFAULT 5,
  sg_coach_level2_bonus numeric NOT NULL DEFAULT 7,
  stf_poomsae_referee_bonus numeric NOT NULL DEFAULT 3,
  stf_kyorugi_referee_bonus numeric NOT NULL DEFAULT 3,
  
  -- Metadata
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  
  CONSTRAINT one_active_config_check CHECK (is_active = true)
);

-- Create index for active config lookup
CREATE INDEX idx_slot_pricing_active ON public.slot_booking_pricing_config(is_active, effective_from DESC) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.slot_booking_pricing_config ENABLE ROW LEVEL SECURITY;

-- Policy for viewing pricing config (everyone can view)
CREATE POLICY "Anyone can view active pricing config"
ON public.slot_booking_pricing_config
FOR SELECT
USING (is_active = true);

-- Policy for managing pricing config (superadmin only)
CREATE POLICY "Superadmin can manage pricing config"
ON public.slot_booking_pricing_config
FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Create trigger for updated_at
CREATE TRIGGER update_slot_pricing_config_updated_at
BEFORE UPDATE ON public.slot_booking_pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.slot_booking_pricing_config (
  weekday_base_rate,
  weekend_base_rate,
  dan_first_bonus,
  dan_second_bonus,
  dan_third_above_bonus,
  stf_coach_induction_bonus,
  stf_poomsae_coach_level1_bonus,
  stf_poomsae_coach_level2_bonus,
  stf_poomsae_coach_level3_bonus,
  sg_coach_level1_bonus,
  sg_coach_level2_bonus,
  stf_poomsae_referee_bonus,
  stf_kyorugi_referee_bonus,
  is_active,
  created_by
) VALUES (
  70, 85, 5, 10, 15, 1, 3, 5, 7, 5, 7, 3, 3, true, 'system'
);