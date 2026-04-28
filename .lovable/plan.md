## Problem

Earl John Lucero II's actual belt in the `students` table is **Foundation**, but the Term 1 grading list shows **White**. The list reads `current_belt` from the `grading_registrations` row (snapshotted at registration time), and Earl's row contains stale/incorrect data:

- `grading_registrations.current_belt = 'White'`
- `grading_registrations.target_belt = 'Yellow Tip'`
- Created by `system-backfill` on 2026-04-24

The originating invoice item is also wrong:
- Product: **"White >> Yellow Tip"** (`Grading004`, $50)
- Description: `White >> Yellow Tip`

So the invoice itself was created for the wrong belt transition. For a Foundation student the correct grading product should be **"Foundation >> Foundation 1"** (matching the existing grading-fee lookup pattern memory).

## Root cause

Two layers:
1. **Bad invoice**: an incorrect grading product was selected when the invoice was issued.
2. **Snapshot never re-syncs**: `syncGradingRegistrationsForInvoice` records `current_belt` at creation/sync time but doesn't refresh it against the student's live `students.current_belt`, so even after the recent backfill overhaul (Rory fix) the registration keeps the wrong belt.

## Plan

### 1. Data repair (one-off SQL via migration / insert tool)
- Update Earl's `grading_registrations` row:
  - `current_belt = 'Foundation'`
  - `target_belt = 'Foundation 1'`
- Flag the invoice item for staff review (do NOT silently swap the product — the price/SKU differ and superadmin approval rules apply to paid invoice edits). Add a console-visible note: leave the invoice as-is and surface a UI warning instead (see step 3).

### 2. Auto-heal current belt in sync (`src/services/invoiceService.ts`)
In both `syncGradingRegistrationsForInvoice` and `backfillOrphanGradingRegistrationsForBranch`:
- When a registration already exists, also refresh `current_belt` from the student's live `students.current_belt` (only when not already manually graded — i.e. `result_manual_override` is false / no scorecard entered).
- Same on initial insert: source `current_belt` from `students.current_belt`, not from the invoice item description.

This prevents a recurrence: if the student's belt changes between invoice creation and grading day, the list reflects reality.

### 3. UI mismatch warning (`BranchGradingList.tsx` / `GradingListTab.tsx`)
When `student.current_belt` (live) differs from the belt implied by the invoice item description (e.g. invoice says "White >> Yellow Tip" but student is "Foundation"), show a small amber warning badge "Belt mismatch" next to the row. This makes future bad-invoice cases visible to staff instead of silently rendering the wrong belt.

### Files touched
- `supabase/migrations/<timestamp>_fix_earl_grading_belt.sql` — data repair
- `src/services/invoiceService.ts` — refresh `current_belt` from live student data on sync/backfill
- `src/components/dashboard/BranchGradingList.tsx` — mismatch badge
- `src/components/sales/GradingListTab.tsx` — mismatch badge

### Verification
- Re-query Earl's registration → `current_belt = Foundation`, `target_belt = Foundation 1`.
- Reload Term 1 grading list → Earl renders as Foundation.
- Confirm no other students regress (other rows in screenshot have matching belts).

Approve to switch to default mode and apply the repair + sync fix.