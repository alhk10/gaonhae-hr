

## Plan: Allow superadmin to override the "paid term invoice" requirement; route others through approval

### Current behavior

In `src/components/sales/InvoiceDialog.tsx` (line 989), the create-invoice flow hard-blocks any grading-only invoice when the student has no paid/verified term invoice for an active term at that branch. Toast: *"This student must have a paid term invoice before creating a grading invoice."* No override exists for anyone — including superadmin.

### Changes

#### 1. Superadmin gets a confirmation override (`src/components/sales/InvoiceDialog.tsx`)

When the prerequisite check fails AND `userrole === 'superadmin'`:

- Stop the hard `toast.error` block.
- Open a small confirmation `AlertDialog` (use existing `@/components/ui/alert-dialog`) with:
  - Title: **Override grading prerequisite?**
  - Body: *"{Student name} has no paid term invoice for the current term at {branch name}. As superadmin you can issue this grading invoice anyway. Proceed?"*
  - Buttons: **Cancel** / **Override and create**.
- On confirm: stash a one-shot `prerequisiteOverridden = true` flag and re-run `handleSubmit` skipping the prerequisite check.
- Record the override in the created invoice's `notes` (append `"[Superadmin override: grading prerequisite]"`) and in `metadata.prerequisite_overridden_by = user.email` on the grading line item, so it's auditable.

#### 2. Non-superadmins go through approval (reuse `invoice_discount_approvals`)

When the prerequisite check fails AND `userrole !== 'superadmin'`:

- Reuse the existing `submitDiscountApproval(...)` path (already wired into the Superadmin Dashboard → *Invoice Discount Approvals* section).
- Pass `approvalReason = "Grading invoice without paid term invoice"`.
- Toast: *"This student has no paid term invoice. Request submitted for superadmin approval."*
- Close dialog, reset form, fire `onInvoiceCreated?.()`.

#### 3. Surface the new reason in the approvals list (`src/components/dashboard/InvoiceDiscountApprovals.tsx`)

Add a third badge variant alongside the existing *Discount threshold* / *Exception product* badges:

- When `req.approval_reason.includes('paid term invoice')` → badge **Grading prerequisite** (blue, `bg-blue-100 text-blue-800`).

No other rendering changes needed — the dashboard already approves by re-creating the stored `invoice_data` via `approveDiscountApproval`, which simply calls `createInvoice` and bypasses the UI prerequisite check (since the check lives in the dialog, not the service).

#### 4. No DB migration

`invoice_discount_approvals` already stores arbitrary `invoice_data` jsonb and a free-text `approval_reason`. Reusing it avoids a new table and keeps all "needs superadmin sign-off before invoice creation" workflows in one place.

### Files affected

- `src/components/sales/InvoiceDialog.tsx` — add override confirmation dialog, branch logic by role, audit trail in notes/metadata.
- `src/components/dashboard/InvoiceDiscountApprovals.tsx` — add **Grading prerequisite** badge.

### Verification

1. **Superadmin, missing term invoice** → click *Create Invoice* with grading-only line → confirmation dialog appears → confirm → invoice created; notes contain `[Superadmin override: grading prerequisite]`.
2. **Superadmin, cancel override** → no invoice created, dialog stays open.
3. **Non-superadmin staff, missing term invoice** → toast says *Request submitted* → row appears in Superadmin Dashboard → *Invoice Discount Approvals* with the **Grading prerequisite** badge → superadmin clicks Approve → invoice is created with the original payload.
4. **Non-superadmin staff, missing term invoice, then superadmin rejects** → no invoice created.
5. **Anyone, term invoice already paid** → flow unchanged, no dialog and no approval row.
6. **Superadmin, override + discount > $250** → existing discount approval check still wins (discount approval submitted, not the override path) — overrides only the prerequisite, not other gates.

### Out of scope

- Changing how the prerequisite is detected (the existing query of `invoices.status in ('paid','verified')` against active terms is preserved).
- Adding a dedicated `grading_prerequisite_overrides` audit table — `invoices.notes` plus `invoice_discount_approvals` rows already cover it.
- Allowing override on combined invoices that contain a term item (those already pass the prerequisite check by design).

