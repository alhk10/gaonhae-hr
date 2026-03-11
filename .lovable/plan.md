

## Revised Plan: Thorough Data Cleanup on Invoice Deletion

### Problem
The current `deleteInvoice` function only **deactivates** enrollments, scheduled classes, and entitlements instead of deleting them. It also doesn't clean up:
- **Payments** linked to the invoice
- **Grading registrations** referencing invoice items
- **Class attendance** records referencing entitlements
- **Class slots** stored in invoice item metadata

This leaves orphaned data causing students to appear in timetables and receive grading popups.

### Changes — `src/services/invoiceService.ts` (`deleteInvoice` function)

Replace the current deactivation-based cleanup (lines 606-638) with hard deletes in the correct FK-safe order:

1. **Nullify `grading_registrations.invoice_item_id`** for all linked invoice items — prevents FK violation (NO ACTION constraint), removes grading association
2. **Get entitlement IDs** linked to invoice items (where `source_type = 'invoice_item'`)
3. **Nullify `class_attendance.entitlement_id`** for those entitlements — prevents FK violation when deleting entitlements
4. **Delete entitlements** linked to invoice items (hard delete, not deactivate)
5. **Delete `student_scheduled_classes`** for linked enrollments (hard delete, not status update)
6. **Delete `student_class_enrollments`** linked to invoice items (hard delete, not deactivate)
7. **Delete `payments`** linked to the invoice (explicit delete — don't rely on CASCADE since items are deleted first)
8. **Delete `invoice_items`** (already done)
9. **Delete `invoices`** (already done)

### Execution order summary

```text
grading_registrations.invoice_item_id → SET NULL  (unblock FK)
class_attendance.entitlement_id       → SET NULL  (unblock FK)
entitlements                          → DELETE    (was: deactivate)
student_scheduled_classes             → DELETE    (was: update status)
student_class_enrollments             → DELETE    (was: deactivate)
payments                              → DELETE    (explicit, before invoice)
invoice_items                         → DELETE    (existing)
invoices                              → DELETE    (existing)
```

### Scope
- **Modified**: `src/services/invoiceService.ts` — `deleteInvoice` function only
- No database migration needed (nullify before delete respects existing FK constraints)

