## Plan — Draft-invoice passes + payment reminder popup on PDF download

### Findings (read-only investigation)
- `GradingListTab.tsx` and `BranchGradingList.tsx` already let staff assign `result = 'pass' | 'double'` to a student **regardless of invoice status** (the Edit/Bulk Edit dialogs don't gate on `grading_paid`).
- The Cert (📄) button is gated only on `result ∈ {pass, double}` + Foundation→Black Tip + Morley branch — **not** on payment status. So in the screenshot, draft/unpaid students show "-" simply because no result has been entered yet, not because draft is blocked.
- Each row already carries `grading_paid: 'paid' | 'unpaid' | 'n/a'` (computed from the grading invoice item's invoice status), so no extra query is needed for the popup.

### Changes

**1. Confirm "draft can pass" remains supported**  
No code change required — passes already work for draft invoices. The flow is:
1. Staff opens Edit (✏️) on a draft-invoice student → sets Result = Pass → Save.
2. Cert button (📄) immediately appears in the row.

**2. Add payment-reminder confirmation dialog before PDF download**  
When the user clicks the Cert (or Cert II) button **and** `grading_paid !== 'paid'`, show a confirmation dialog instead of downloading immediately:

> **Grading fee not yet paid**  
> {Student Name}'s grading invoice is currently **{Draft / Unpaid / Partial / etc.}**.  
> Please remind the parent to settle the grading fee.  
>   
> Do you still want to download the certificate now?  
>   
> [Cancel]  [Download Anyway]

If `grading_paid === 'paid'` → download immediately (current behaviour, no popup).

**3. Files to edit**
- `src/components/sales/GradingListTab.tsx`
  - Add `AlertDialog` state: `const [pendingCert, setPendingCert] = useState<{ student, certificateNumber } | null>(null)`.
  - Refactor `handleViewCertificate` → split into:
    - `requestCertificate(student, n)` — runs current validation; if `grading_paid !== 'paid'` sets `pendingCert`, else calls `runCertificate(...)`.
    - `runCertificate(student, n)` — current download logic.
  - Wire Cert / Cert II buttons to `requestCertificate`.
  - Render `<AlertDialog open={!!pendingCert}>` with the warning copy + "Download Anyway" → `runCertificate(...)` then clear state.
- `src/components/dashboard/BranchGradingList.tsx`
  - Mirror the exact same change (same helpers, same dialog).

**4. Reused infrastructure**
- `AlertDialog` from `@/components/ui/alert-dialog` (already imported in `ScorecardColumnHeader.tsx`).
- `student.grading_paid` already present on every row — no new fetch.
- `invoice_status` shown in the dialog body for clarity (also already on the row).

**5. Out of scope**
- No change to result-entry rules, ready flag, or Edit dialog.
- No change to the PDF generator or scorecard editor.
- No new database column or migration.
- Mobile card layout remains untouched.

👉 Approve to switch to default mode and execute.