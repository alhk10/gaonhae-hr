

## Plan: Update BranchGradingList — Invoiced Students, Term Paid Column, Mobile 3-Line Layout

### Changes to `src/components/dashboard/BranchGradingList.tsx`

**1. Remove description text (line 440-444)**
Remove the `CardDescription` that shows "X active students with paid invoices for Term..."

**2. Update query to include invoiced students (not just paid)**
Change the Supabase query filter from `.eq('invoices.status', 'paid')` to `.in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'overdue', 'paid'])` — essentially all statuses except `cancelled`. Store `invoice_status` per student for the new "Term Paid" column.

**3. Add `term_paid` field to `GradingListStudent` interface**
Add `term_paid: string` derived from the term invoice status (e.g., 'paid', 'unpaid', 'draft', 'partial').

**4. Add "Term Paid" column before "Grading Paid" in desktop table**
New `TableHead` "Term Paid" between "Ready" and "Grading Paid". Display as a Badge: green for 'paid', destructive for overdue/unpaid, secondary for draft/sent.

**5. Mobile 3-line layout**
Hide the desktop `Table` on mobile (`hidden sm:block`). Add a mobile-only stacked list (`sm:hidden`) with each row as 3 lines:

- **Line 1**: Student name (bold, `text-xs`), Current Belt badge, Ready checkbox/indicator — right-aligned actions (eye, delete)
- **Line 2**: Lessons count, Term Paid badge, Grading Paid badge — `text-[11px]`
- **Line 3**: Grading Slot, Result — `text-[11px]`

Tight padding (`px-2 py-1.5`), `bg-muted/50 rounded-lg`, `space-y-1.5` between rows.

**6. Update empty state message**
Change "No active students found with paid class invoices" to "No active students found with invoices for this term."

### Scope
Single file: `src/components/dashboard/BranchGradingList.tsx`. Query logic + layout changes.

