-- First, insert the Morley Mon-Fri schedule
INSERT INTO branch_operating_schedule (branch_id, weekday, is_open, open_time, close_time)
VALUES 
  ('BR1768967806476', 0, false, NULL, NULL),
  ('BR1768967806476', 1, true, '09:00', '21:00'),
  ('BR1768967806476', 2, true, '09:00', '21:00'),
  ('BR1768967806476', 3, true, '09:00', '21:00'),
  ('BR1768967806476', 4, true, '09:00', '21:00'),
  ('BR1768967806476', 5, true, '09:00', '21:00'),
  ('BR1768967806476', 6, false, NULL, NULL)
ON CONFLICT (branch_id, weekday) DO UPDATE SET
  is_open = EXCLUDED.is_open,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time;

-- Update the Morley Term 1 2026 with correct week count
-- Calculation: 19 Jan - 10 Apr = 82 days total
-- Break: 7 Feb - 22 Feb = 16 days
-- Operating days = Mon-Fri (5 days/week)
-- Term days excluding break: 82 - 16 = 66 calendar days
-- But we count actual operating days: ~47 weekdays - ~11 break weekdays = ~36 weekdays
-- 36 weekdays / 5 days per week = ~10 weeks (rounded)
UPDATE term_calendars 
SET total_weeks = 10, updated_at = NOW()
WHERE id = 'dd062ecd-eddd-4ea3-a6d1-2ee3c0cb95f7';