# Reinstate the Branch Profit & Loss page

## What you will get
- The old Branch Profit & Loss page back, with the same layout, categories, monthly entries, copy-previous-month and published reports.
- A link to it from the same places it was before (branch dashboard / sidebar).
- The new Finance running journal in /access stays as it is.

## Data
- The old P&L tables were deleted when Finance was rebuilt, so they will be recreated empty with the original categories.
- Old P&L entries that were moved into the Finance journal will be copied back into the P&L page where they can be matched (by branch, date, category and amount). Anything that cannot be matched stays only in the journal.
- Entries made in the journal since then will not be copied into P&L automatically.

## Technical details
- Restore `src/pages/BranchProfitLoss.tsx`, `BranchProfitLossDialog.tsx`, `FinanceBasisToggle.tsx` and related services from the version before commit e42000f3; re-add route and navigation links.
- Migration: recreate `pl_categories`, `branch_profit_loss_entries`, `published_pl_reports` with grants, RLS (superadmin/branch-scoped via existing role checks), timestamps; seed categories; backfill from `branch_journal_entries` rows tagged as migrated.
- Keep the AGENTS.md rule about not posting from invoice/payment services; P&L stays manual-entry only. Update that rule to note P&L is a separate manual report.
- Verify the page loads and an entry can be added and read back.
