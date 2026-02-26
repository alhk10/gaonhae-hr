

## Purge All Student Data

Same operation as before — delete all records from 21 student-related tables in dependency order.

### Implementation

Create a single migration file with `DELETE FROM` statements for all tables in this order:

1. Child tables first: `student_auth`, `student_branch_chats`, `student_change_logs`, `student_class_enrollments`, `student_emergency_contacts`, `student_grading_history`, `student_medical_notes`, `student_notification_subscriptions`, `student_scheduled_classes`, `student_update_requests`
2. Invoice/payment children: `invoice_change_logs`, `invoice_items`, `invoice_deletion_requests`, `payment_deletion_requests`, `payments`
3. Remaining dependents: `invoices`, `class_attendance`, `grading_deletion_requests`, `grading_registrations`, `entitlements`
4. Parent table last: `students`

This will remove all 161 student records and their associated data. No code changes required.

