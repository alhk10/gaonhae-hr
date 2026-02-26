

## Purge All Student Data

Delete all records from student-related tables in the correct dependency order (child tables first).

### Tables to purge (in order)

1. `student_auth`
2. `student_branch_chats`
3. `student_change_logs`
4. `student_class_enrollments`
5. `student_emergency_contacts`
6. `student_grading_history`
7. `student_medical_notes`
8. `student_notification_subscriptions`
9. `student_scheduled_classes`
10. `student_update_requests`
11. `invoice_change_logs`
12. `invoice_items`
13. `invoice_deletion_requests`
14. `payment_deletion_requests`
15. `payments`
16. `invoices`
17. `class_attendance`
18. `grading_deletion_requests`
19. `grading_registrations`
20. `entitlements`
21. `students`

### Implementation

Execute `DELETE FROM` for each table via the Supabase insert tool. No code changes needed — data-only operation.

