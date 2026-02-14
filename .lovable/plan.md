

## Payment Verification Section in Branch Dashboard

### Overview
Add a "Payment Verification" section within the Invoice & Payment tab that lists all unverified payments with their uploaded proof documents. Staff can view the proof, then mark payments as verified, which updates the related invoice status to "verified".

### Database Changes

**Add columns to `payments` table:**
- `is_verified` (boolean, default false) -- whether the payment has been manually verified
- `verified_by` (text, nullable) -- employee ID who verified
- `verified_at` (timestamptz, nullable) -- when verification occurred

### UI Changes (BranchDashboard.tsx)

1. **Payment Verification Section** -- A new subsection at the top of the Invoice & Payment tab content, shown only when there are unverified payments (payments where `is_verified = false` and `proof_of_payment_url` is not null, and payment method is not cash).

2. **Verification Card per Payment** -- Each unverified payment shows:
   - Payment number, student name, amount, date, payment method
   - A "View Proof" button linking to the uploaded `proof_of_payment_url`
   - A "Verify" button that marks the payment as verified and updates the invoice status to "verified"

3. **Verify Action Flow:**
   - On clicking "Verify", update `payments` row: `is_verified = true`, `verified_by = currentUser.employeeId`, `verified_at = now()`
   - Update the related `invoices` row: set `status = 'verified'` (only if currently 'paid')
   - Invalidate relevant queries to refresh the list

### Technical Details

- Query unverified payments: filter `branch-payments` data client-side for `is_verified === false` and non-cash methods with proof URLs
- The verification section auto-hides when all payments are verified (zero pending)
- Badge count for unverified payments shown in the section header
- Uses existing `useAuth` for `verified_by` employee ID

### Files to Modify
- **Migration**: Add `is_verified`, `verified_by`, `verified_at` columns to `payments`
- **src/components/dashboard/BranchDashboard.tsx**: Add verification section UI, verify handler, updated payment query to include new fields

