

## Plan: Create Enrollments and Scheduled Classes on Invoice Creation

### Problem
Currently, class enrollments and scheduled classes are only created when an invoice is paid (via PaySchoolFeesDialog or PayGradingDialog). When an invoice is created through the admin CreateInvoiceDialog, no enrollment or scheduled classes are generated, so students don't see their classes in the "My Classes" tab until payment.

### Changes

**File: `src/services/invoiceService.ts`** (single file change)

After the existing entitlement creation block (around line 423), add enrollment and scheduled class creation logic:

1. **Import** `createEnrollment` and `createScheduledClass` from `classEnrollmentService`
2. **After entitlements are created**, loop through inserted items that have `selected_class_slots` and `term_id` in their metadata
3. For each such item:
   - Look up the product to get the class type name
   - Call `createEnrollment` with student_id, term_id, branch_id, class_type, and invoice_item_id
   - Fetch timetable data for the selected slots
   - Call `createScheduledClass` for each slot with the enrollment_id
4. Wrap in try/catch so enrollment creation failure is non-fatal (invoice still valid)

This mirrors the exact same logic currently in `PaySchoolFeesDialog.tsx` (lines 632-666) but triggered at invoice creation time instead of payment time.

### Why only one file
The `createInvoice` function is the central point called by:
- `CreateInvoiceDialog` (admin invoice creation)
- `PaySchoolFeesDialog` (student payment flow)
- `PayGradingDialog` (grading payment flow)
- `classAttendanceService` (overage invoicing)
- `invoiceDiscountApprovalService` (approved discount invoices)

By adding enrollment logic here, all invoice creation paths automatically get enrollment support. The `PaySchoolFeesDialog` and `PayGradingDialog` will have duplicate enrollment calls, so we also need to make those flows skip their own enrollment creation since `createEnrollment` already deactivates previous enrollments (making it idempotent but wasteful).

### Additional changes needed

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**
- Remove Steps 4-5 (enrollment + scheduled class creation, lines 632-666) since `createInvoice` now handles it

**File: `src/components/dashboard/PayGradingDialog.tsx`**
- Remove the term enrollment + scheduled class creation block (lines 470-510) since `createInvoice` now handles it

### Files to modify
- **Edit**: `src/services/invoiceService.ts` — add enrollment + scheduled class creation after entitlements
- **Edit**: `src/components/dashboard/PaySchoolFeesDialog.tsx` — remove redundant enrollment creation
- **Edit**: `src/components/dashboard/PayGradingDialog.tsx` — remove redundant enrollment creation

