

# Add Payment Verification to Superadmin Dashboard

## Overview
Add a Payment Verification section to the Superadmin Dashboard so that superadmins can also verify student payments made through the Pay School Fees and Pay Grading dialogs, in addition to the existing verification in the Branch Dashboard.

## Current State
- Payment verification currently only exists in the Branch Dashboard, filtering unverified non-cash payments with proof of payment uploads
- When students pay via the portal, payments are created with `is_verified: false` (default) and include a `proof_of_payment_url`
- Branch staff can verify these payments, which updates `is_verified`, `verified_by`, and `verified_at` fields, and advances the invoice status to `verified`

## Changes

### 1. Create a new `PaymentVerificationApprovals` component
- **File**: `src/components/dashboard/PaymentVerificationApprovals.tsx`
- Fetches all unverified payments across all branches where `is_verified = false`, `proof_of_payment_url` is not null, and `payment_method != 'cash'`
- Displays each payment with: proof of payment image/thumbnail, student name, invoice number, amount, payment date, payment method, and branch name
- Includes a "Verify" button per payment that updates `is_verified`, `verified_by`, `verified_at` and advances invoice status to `verified`
- Uses the same visual pattern as the Branch Dashboard verification section (orange highlight, ShieldCheck icon)
- Groups or labels payments by branch for clarity

### 2. Add the component to `SuperadminDashboard.tsx`
- **File**: `src/components/dashboard/SuperadminDashboard.tsx`
- Import and render `PaymentVerificationApprovals` in the Overview tab alongside existing approval sections
- Place it after Slot Booking Approvals and before Payment Deletion Approvals (logical grouping with payment-related items)

### Technical Details
- Query: `supabase.from('payments').select('*, invoices!inner(invoice_number, branch_id, total_amount, students(first_name, last_name))').eq('is_verified', false).not('proof_of_payment_url', 'is', null).neq('payment_method', 'cash')`
- Verification action mirrors the Branch Dashboard logic: update payment record, then update invoice status from `paid` to `verified`
- Cache invalidation on verify: invalidate relevant payment and invoice queries

