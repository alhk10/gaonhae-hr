-- Fix Competition branch slot configuration to have 0 slots for all days
-- Insert weekly slot configuration for Competition branch using the correct branch ID

INSERT INTO public.weekly_slot_config (
  branch_id,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday
) VALUES (
  'BR1756089935418',
  0,
  0,
  0,
  0,
  0,
  0,
  0
);