-- Add Miscellaneous claim type
INSERT INTO public.claim_types (name, description, limit_amount, co_pay, is_active)
VALUES ('Miscellaneous', 'General miscellaneous expenses', NULL, 0, true);