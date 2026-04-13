

## Plan: Copy Previous Month Expenses

### What
Add a "Copy Previous" button in the Expenses section header that copies all expense entries from the previous month into the current month.

### How

**File: `src/pages/BranchProfitLoss.tsx`**

1. **Add a `handleCopyPreviousExpenses` function** that:
   - Calculates the previous month/year (e.g., April 2026 → March 2026)
   - Queries `branch_profit_loss_entries` for all expense entries from that previous month/branch
   - If none found, shows a toast: "No expenses found for [previous month]"
   - Otherwise, shows a confirmation dialog with the count
   - On confirm, bulk-inserts all entries into the current month (new IDs, same category/subcategory/description/amount/share_percentage, updated month/year/created_by)
   - Refreshes local state

2. **Add confirmation dialog** using the existing `Dialog` component -- simple "Copy N expense entries from [Month Year]?" with Cancel/Copy buttons

3. **Add "Copy Previous" button** next to the existing Categories and Add buttons in the Expenses card header (line 1745-1754), with a `Copy` icon from lucide-react. Only visible to superadmins.

### UI
The button row in the Expenses header will become: `Categories | Copy Previous | + Add`

