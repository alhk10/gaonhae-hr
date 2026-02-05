
# Add "View Branch Profit & Loss" Dialog for Partners

## Overview
Add a new quick action button "View Branch Profit & Loss" to the Employee Dashboard that is only visible to partners with branch shares. The button opens a mobile-friendly dialog showing published P&L reports with download PDF functionality.

## Current State Analysis
- Partners already have a dedicated BranchProfitLoss page (`/branch-profit-loss`)
- Partner branch shares are stored in `partner_branch_shares` table
- Published reports are tracked in `published_pl_reports` table
- PDF generation logic already exists in `BranchProfitLoss.tsx` using jsPDF
- Employee Dashboard already shows different actions based on position (partner vs non-partner)

## Implementation Plan

### 1. Create BranchProfitLossDialog Component
**File:** `src/components/dashboard/BranchProfitLossDialog.tsx`

A new mobile-friendly dialog component that:
- Fetches partner's branch shares (branches they have ownership in)
- Fetches published P&L reports for those branches
- Displays a list of published reports grouped by branch with month/year
- Shows summary totals (Revenue, Expenses, Net Profit) for each report
- Provides inline PDF download button for each published report
- Uses the existing PDF generation logic from BranchProfitLoss.tsx

**Key Features:**
- Branch selector dropdown (filtered to partner's branches with shares)
- List view of published months with:
  - Month/Year label
  - Revenue amount (partner's share)
  - Expenses amount (partner's share)  
  - Net Profit/Loss
  - Download PDF button
- Loading states and empty states
- Mobile-responsive layout

### 2. Update Employee Dashboard
**File:** `src/components/dashboard/EmployeeDashboard.tsx`

- Import the new BranchProfitLossDialog
- Add state for dialog visibility (`showBranchProfitLoss`)
- Add state to track partner branch shares
- Add useQuery to fetch partner's branch shares when user is a partner
- Add new Quick Action button "View Branch Profit & Loss" with Building2 icon
- Button only rendered when:
  - Employee position is 'Partner' or 'Senior Partner'
  - Employee has at least one active branch share
- Pass branch shares data to the dialog

### 3. PDF Generation Logic
The dialog will reuse the PDF generation approach from BranchProfitLoss.tsx:
- Fetch P&L entries from `branch_profit_loss_entries` for selected branch/month/year
- Generate PDF with:
  - Branch name and period header
  - Revenue section with partner's share calculations
  - Expenses section with partner's share calculations
  - Net Profit/Loss summary
- Download using jsPDF `doc.save()`

## Technical Details

### Data Flow
```text
1. Dialog opens
2. Fetch partner_branch_shares for current employee (active only)
3. Fetch published_pl_reports for partner's branches
4. Display branch selector with available branches
5. Show list of published reports for selected branch
6. On download click:
   - Fetch branch_profit_loss_entries for that month/year
   - Generate PDF with partner's share calculations
   - Trigger download
```

### Database Queries
- Partner shares: `partner_branch_shares` WHERE employee_id = X AND effective_to IS NULL
- Published reports: `published_pl_reports` WHERE branch_id IN (partner's branches)
- P&L entries: `branch_profit_loss_entries` WHERE branch_id = X AND month = Y AND year = Z

### Component Props
```typescript
interface BranchProfitLossDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}
```

## Files to Create
1. `src/components/dashboard/BranchProfitLossDialog.tsx`

## Files to Modify
1. `src/components/dashboard/EmployeeDashboard.tsx`
   - Add import for BranchProfitLossDialog
   - Add state and handler for dialog
   - Add query for partner branch shares
   - Add conditional quick action button
   - Render dialog component
