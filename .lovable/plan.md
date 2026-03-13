

## Plan: Student Credit Balance System (Overpayments & Refunds)

### Overview
Add a credit balance system where overpayments are stored as student credits, automatically applied to new invoices, and manageable via both student profiles and a dedicated admin page.

### Database Changes

**New table: `student_credits`**
- `id` (uuid, PK)
- `student_id` (uuid, FK to students)
- `amount` (numeric, positive = credit available)
- `type` (enum: 'overpayment', 'refund', 'manual_adjustment', 'credit_applied')
- `reference_id` (text, nullable — links to payment_id or invoice_id)
- `description` (text)
- `created_by` (text, nullable)
- `created_at` (timestamptz)

**New view or query pattern**: student credit balance = SUM of all `student_credits` amounts per student (positive entries add credit, negative entries consume it).

**RLS**: Same pattern as invoices — superadmins full access, branch staff with sales access can view/insert, students can view own records.

### Code Changes

#### 1. Payment Service — Allow overpayments (`src/services/paymentService.ts`)
- Remove the validation at line 199 that blocks payments exceeding `balance_due`
- When `paymentData.amount > invoice.balance_due`, set the invoice to `paid` (balance_due = 0) and insert a `student_credits` record of type `overpayment` for the excess amount
- Include the payment_id as `reference_id`

#### 2. Credit Service (new: `src/services/studentCreditService.ts`)
- `getStudentCreditBalance(studentId)` — returns net credit balance
- `getStudentCreditHistory(studentId)` — returns all credit transactions
- `addManualCredit(studentId, amount, description)` — admin manual adjustment
- `applyCredit(studentId, invoiceId, amount)` — deducts credit and applies as payment
- `getAllStudentCredits()` — admin view of all students with credit balances

#### 3. Invoice Creation — Auto-apply credits (`src/components/sales/CreateInvoiceDialog.tsx`)
- After invoice is created, check if student has credit balance
- If credit exists, automatically apply it (up to invoice total) by calling `applyCredit` and creating a corresponding payment record
- Show toast: "Student credit of $X.XX automatically applied"

#### 4. Student Profile — Credit tab (`src/pages/parties/StudentDetails.tsx`)
- Add a "Credits" section showing current balance and transaction history
- Include a button for admins to add manual credit adjustments

#### 5. Admin Credit Management Page (new: `src/pages/sales/CreditManagement.tsx`)
- Table of all students with credit balances (student name, balance, last transaction date)
- Click to view full credit history for a student
- Ability to add manual adjustments or issue refunds (which zero out credit and log as 'refund')
- Add route and sidebar navigation entry

#### 6. Create Payment Dialog (`src/components/sales/CreatePaymentDialog.tsx`)
- Show student's available credit balance when an invoice is selected
- Allow payment amount to exceed balance_due (with confirmation: "Excess of $X.XX will be stored as student credit")

### Files to create
- `src/services/studentCreditService.ts`
- `src/pages/sales/CreditManagement.tsx`

### Files to modify
- `src/services/paymentService.ts` — allow overpayments, create credit records
- `src/components/sales/CreatePaymentDialog.tsx` — show credit info, allow overpayments
- `src/components/sales/CreateInvoiceDialog.tsx` — auto-apply credits post-creation
- `src/pages/parties/StudentDetails.tsx` — add credits section
- `src/App.tsx` — add route for CreditManagement
- `src/components/layout/Sidebar.tsx` — add nav link

