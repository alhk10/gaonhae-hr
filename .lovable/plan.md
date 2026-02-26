

## Purge All Student Data

Delete all records from student-related tables in the correct order (child tables first to respect foreign keys).

### Tables to purge (in order)

1. `student_auth` — portal login mappings
2. `student_branch_chats`
3. `student_change_logs`
4. `student_class_enrollments`
5. `student_emergency_contacts`
6. `student_grading_history`
7. `student_medical_notes`
8. `student_notification_subscriptions`
9. `student_scheduled_classes`
10. `student_update_requests`
11. `invoice_change_logs` — child of invoices
12. `invoice_items` — child of invoices
13. `invoice_deletion_requests` — references invoices
14. `payments` — references invoices
15. `payment_deletion_requests` — references payments
16. `invoices` — references students
17. `class_attendance` — references students
18. `grading_registrations` — may reference students
19. `grading_deletion_requests` — references students
20. `students` — parent table, deleted last

### Implementation

Run `DELETE FROM` statements via the Supabase insert tool for each table above. With CASCADE FKs now in place, deleting from `students` would cascade to `invoices` and `class_attendance`, but we'll explicitly clear child tables first for safety and clarity.

No code changes needed — this is a data-only operation.

