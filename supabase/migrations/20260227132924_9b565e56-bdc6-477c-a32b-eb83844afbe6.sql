INSERT INTO public.notification_templates (template_key, title, body, enabled)
VALUES 
  ('new_notice', 'New Notice: {subject}', 'A new notice has been posted: {subject}', true),
  ('outstanding_fees_reminder', 'Outstanding Fees Reminder', 'You have outstanding fees of {amount}. Please make payment at your earliest convenience.', true),
  ('grading_test_reminder', 'Ready for Grading Test', '{student_name} is ready for grading test on {grading_date} at {branch}. Belt: {current_belt} → {target_belt}', true)
ON CONFLICT (template_key) DO NOTHING;