-- Fix clock-in issues for Wang Pot Chien and Ryan Goh by clearing stale clock status records
DELETE FROM public.clock_status 
WHERE employee_id IN ('EMP1751006728858', 'EMP1751006984631') 
  AND date < '2025-08-14';

-- Fix Jurong West slot overbooking issue by updating Friday capacity from 1 to 3 slots
UPDATE public.weekly_slot_config 
SET friday = 3, updated_at = now()
WHERE branch_id = 'jurong-west';

-- Verify the changes
SELECT 'Clock status cleared for' as action, count(*) as records_affected 
FROM public.clock_status 
WHERE employee_id IN ('EMP1751006728858', 'EMP1751006984631');

SELECT 'Jurong West Friday slots updated to' as action, friday as new_capacity 
FROM public.weekly_slot_config 
WHERE branch_id = 'jurong-west';