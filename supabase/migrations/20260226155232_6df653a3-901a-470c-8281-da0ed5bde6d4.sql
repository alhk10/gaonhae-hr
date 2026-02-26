-- Purge all student-related data in dependency order

-- 1. Child tables
DELETE FROM student_auth;
DELETE FROM student_change_logs;
DELETE FROM student_class_enrollments;
DELETE FROM student_emergency_contacts;
DELETE FROM student_grading_history;
DELETE FROM student_medical_notes;
DELETE FROM student_notification_subscriptions;
DELETE FROM student_scheduled_classes;
DELETE FROM student_update_requests;

-- 2. Invoice/payment children
DELETE FROM invoice_change_logs;
DELETE FROM invoice_items;
DELETE FROM invoice_deletion_requests;
DELETE FROM payment_deletion_requests;
DELETE FROM payments;

-- 3. Remaining dependents
DELETE FROM invoices;
DELETE FROM class_attendance;
DELETE FROM grading_deletion_requests;
DELETE FROM grading_registrations;
DELETE FROM entitlements;

-- 4. Parent table
DELETE FROM students;