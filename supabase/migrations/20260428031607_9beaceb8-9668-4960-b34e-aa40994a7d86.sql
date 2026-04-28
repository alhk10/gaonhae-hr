-- Repair Earl John Lucero II's grading registration: snapshot belt was wrong (White), actual belt is Foundation
UPDATE public.grading_registrations
SET current_belt = 'Foundation',
    target_belt = 'Foundation 1'
WHERE id = '8150b5bb-da60-49dd-80bd-f1cf378d4b4c';