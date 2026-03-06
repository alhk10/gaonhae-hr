

## Plan: Move Payment Verification to Approvals Tab

### Changes to `src/components/dashboard/BranchDashboard.tsx`

**1. Compute unverified payments count at component level**
Extract the unverified payments filter logic (currently inline IIFE at line 584-590) into a computed variable near the top of the render, e.g.:
```ts
const unverifiedPayments = payments.filter(
  (p: any) => !p.is_verified && p.proof_of_payment_url && p.payment_method !== 'cash'
);
```

**2. Update Approvals tab visibility condition**
Change from `pendingRequests.length > 0` to `pendingRequests.length > 0 || unverifiedPayments.length > 0`. Update the count to include both: `pendingRequests.length + unverifiedPayments.length`.

**3. Move Payment Verification UI from Invoice tab to Approvals tab**
- Remove the Payment Verification section (lines 583-683) from `TabsContent value="invoices"`.
- Add it at the top of `TabsContent value="approvals"` (before StudentRegistrationApprovals), using the pre-computed `unverifiedPayments` variable instead of the inline IIFE.

**4. No other changes needed** — the verify button logic, query invalidation, and styling all remain the same.

### Scope
Single file: `src/components/dashboard/BranchDashboard.tsx`

