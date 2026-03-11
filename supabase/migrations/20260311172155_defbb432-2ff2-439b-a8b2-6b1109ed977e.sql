-- Create active enrollments for Abby's current invoice items that have class slots but no enrollment
-- Item 1: Foundation to Red 1x Weekday (5a9939f0) - term 213b8946
INSERT INTO student_class_enrollments (student_id, term_id, branch_id, class_type, tier_name, total_price, invoice_item_id, status)
SELECT 
  'f1ce9b67-83d6-4acd-8df4-67cb258ffa67',
  '213b8946-f95e-43bc-bf7c-3e8edd49bd47',
  'yishun',
  COALESCE(bt.class_type, 'Kids'),
  'Foundation to Red 1x Weekday',
  0,
  '5a9939f0-ee28-43c3-827c-11bd29a927cf',
  'active'
FROM branch_timetables bt
WHERE bt.id = '081a7022-c6c4-40f0-8833-1a1ecff25267'
LIMIT 1;

-- Item 2: Foundation to Red 2x Weekday (66eb6a6a) - same term
INSERT INTO student_class_enrollments (student_id, term_id, branch_id, class_type, tier_name, total_price, invoice_item_id, status)
SELECT 
  'f1ce9b67-83d6-4acd-8df4-67cb258ffa67',
  '213b8946-f95e-43bc-bf7c-3e8edd49bd47',
  'yishun',
  COALESCE(bt.class_type, 'Kids'),
  'Foundation to Red 2x Weekday',
  0,
  '66eb6a6a-64ec-4432-a826-947f92051bd2',
  'active'
FROM branch_timetables bt
WHERE bt.id = '081a7022-c6c4-40f0-8833-1a1ecff25267'
LIMIT 1;