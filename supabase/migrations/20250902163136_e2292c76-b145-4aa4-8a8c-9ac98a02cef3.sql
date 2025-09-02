-- Fix Competition branch slot configuration to have 0 slots for all days
-- Insert weekly slot configuration for Competition branch with all days set to 0 slots

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
  'competition',
  0,
  0,
  0,
  0,
  0,
  0,
  0
) ON CONFLICT (branch_id) DO UPDATE SET
  monday = 0,
  tuesday = 0,
  wednesday = 0,
  thursday = 0,
  friday = 0,
  saturday = 0,
  sunday = 0,
  updated_at = now();