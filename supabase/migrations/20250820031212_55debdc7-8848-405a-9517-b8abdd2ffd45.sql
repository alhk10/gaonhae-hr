-- ====================================================
-- ENABLE SALES MODULE FOR TESTING
-- Update feature flag to ON for Milestone 2 testing
-- ====================================================

-- Enable the sales module for testing
UPDATE public.system_settings 
SET setting_value = '{"enabled": true, "allowedRoles": ["superadmin"], "rolloutPhase": "development"}'
WHERE setting_key = 'salesModuleEnabled';