
-- Purge all student-related data (child tables first)

-- 1. Student direct child tables
DELETE FROM public.student_auth;
DELETE FROM public.student_branch_chats;
DELETE FROM public.student_change_logs;
DELETE FROM public.student_class_enrollments;
DELETE FROM public.student_emergency_contacts;
DELETE FROM public.student_grading_history;
DELETE FROM public.student_medical_notes;
DELETE FROM public.student_notification_subscriptions;
DELETE FROM public.student_scheduled_classes;
DELETE FROM public.student_update_requests;

-- 2. Invoice child tables
DELETE FROM public.invoice_change_logs;
DELETE FROM public.invoice_items;
DELETE FROM public.invoice_deletion_requests;
DELETE FROM public.payment_deletion_requests;
DELETE FROM public.payments;

-- 3. Tables referencing students
DELETE FROM public.invoices;
DELETE FROM public.class_attendance;
DELETE FROM public.grading_deletion_requests;
DELETE FROM public.grading_registrations;
DELETE FROM public.entitlements;

-- 4. Parent table last
DELETE FROM public.students;
