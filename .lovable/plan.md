

## Plan: Enforce Term Invoice Payment Before Grading Payment

### Problem
Students can currently pay for grading without having paid their current term invoice. The requirement is: the current term invoice must be paid (status `paid` or `verified`) before grading payment is allowed. Exception: when a grading invoice is created together with a term payment (the "Also pay for next term?" opt-in in PayGradingDialog already handles this).

### Approach

#### 1. Student Dashboard — Block grading if term invoice unpaid (`StudentDashboard.tsx`)

- Add a new query `currentTermInvoicePaid` that checks if the student has a **paid/verified** term invoice for the current available terms (not just whether an invoice *exists*, which `hasCurrentTermInvoice` checks).
- When the user clicks "Pay Grading" in `QuickActionsSection`, intercept the action: if term invoice is unpaid, show a blocking dialog instead of opening PayGradingDialog.
- Add a new state `showTermPaymentRequired` and an AlertDialog that says "Please pay your current term invoice first" with a button to open the Pay School Fees dialog.

#### 2. QuickActionsSection — Pass blocking logic (`QuickActionsSection.tsx`)

- Accept a new prop `termInvoicePaid: boolean` from StudentDashboard.
- In the grading card's button click handler, call `onOpenGrading()` only if `termInvoicePaid` is true, otherwise call a new `onGradingBlocked()` callback.
- Alternatively, handle this entirely in StudentDashboard by wrapping the `onOpenGrading` callback.

**Simpler approach**: Handle the check entirely in `StudentDashboard.tsx` by wrapping the `onOpenGrading` callback passed to QuickActionsSection. No changes needed in QuickActionsSection itself.

#### 3. Branch Dashboard — Block grading invoice creation (`BranchDashboard.tsx` / `CreateInvoiceDialog.tsx`)

The branch dashboard uses `CreateInvoiceDialog` for all invoice creation (including grading). The blocking logic should be in `CreateInvoiceDialog.tsx`:
- When a grading product is added as a line item, check if the selected student has a paid/verified term invoice for the current term.
- If not, show a warning/block with a message to create and pay the term invoice first.
- **Exception**: If the same invoice being created also contains a term/lesson item, allow it (combined invoice).

#### 4. Implementation Details

**New query in StudentDashboard.tsx** (modify existing `hasCurrentTermInvoice` or add alongside):
```
Check invoices for current term → check if any has status 'paid' or 'verified'
If no term invoice exists at all → also unpaid (block grading)
```

**StudentDashboard.tsx onOpenGrading wrapper**:
```
onOpenGrading={() => {
  if (!currentTermInvoicePaid) {
    setShowTermPaymentRequired(true);
  } else {
    guardAction(() => setShowGradingDialog(true));
  }
}}
```

**CreateInvoiceDialog.tsx validation**:
- When a grading-category product is added, query the student's term invoices.
- If no paid/verified term invoice exists and no lesson/term item is in the current invoice items list, show a toast or inline warning blocking submission.

### Files to modify
- `src/components/dashboard/StudentDashboard.tsx` — add paid check query, blocking dialog, wrap onOpenGrading
- `src/components/sales/CreateInvoiceDialog.tsx` — add validation when grading product added without paid term invoice

