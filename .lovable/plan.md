

## Plan: Fix missing Term/Slot for Grading items

### Root cause

The Morley grading slots in your database are all dated **11 April 2026**, but today is **21 April 2026**. The invoice dialog's `loadGradingSlots()` (in `src/components/sales/InvoiceDialog.tsx`, line 618) filters with `from_date: today`, which excludes any past slot. So the dropdown shows "No slots" and nothing can be picked — the existing "Green >> Blue Tip" line in your screenshot was added without a slot ever being selectable, leaving Term/Slot as `-`.

This is also why `getFilteredGradingSlots()` returns nothing for Morley right now — there are simply no future grading slots set up for that branch.

### Fix

Two coordinated changes in `src/components/sales/InvoiceDialog.tsx`:

1. **Widen the slot fetch window.** Change `loadGradingSlots()` to pull all `active` slots from the last 60 days forward (matches `GRADING_DUPLICATE_CHECK_DAYS = 60` already used in this file), instead of strictly future-only. This lets staff still register students against a recent grading event when the invoice is created shortly after (a common real-world flow when payment lags the event).
   - `from_date: <today − 60 days>` instead of `today`.

2. **Show a clearer empty-state message.** When `getFilteredGradingSlots()` returns empty, replace the silent "No slots" with a small inline hint: **"No grading slots — create one in Sales → Grading"**, and disable the "Add" button row (`disabled` on the `+` button) when category = Grading and no slot is available, so a Grading line cannot be added without a slot. This prevents the original "blank Term/Slot" situation from recurring.

3. **Backfill helper (UI only, no schema change).** In view/edit mode, if an existing Grading line item has no `grading_slot_id`, render an inline editable selector in the Term/Slot cell so superadmin can attach a slot retroactively (writes through the existing edit path). This recovers the "Green >> Blue Tip" line on this invoice without manual SQL.

### What you should also do

Create future Morley grading slots in **Sales → Grading List → Add Slot** (the existing Bulk Add Grading Slots dialog works well for a whole term at once). Without future slots in the table, no UI change can populate the dropdown.

### Files touched

- `src/components/sales/InvoiceDialog.tsx` — adjust `loadGradingSlots`, the empty-state in line 1530, the disable rule on the add button (line 1532), and add the inline slot selector for legacy Grading rows in edit mode.

### Verification

- Add a Grading slot for Morley dated next week → reopen Create Invoice → category Grading shows the new slot in the dropdown → add line → Term/Slot column shows the slot title.
- Try to add a Grading line at a branch with no upcoming slot → "+" disabled, hint text shown.
- Open the existing invoice from the screenshot in edit mode (as superadmin) → Term/Slot cell on the "Green >> Blue Tip" row becomes a dropdown of valid slots → pick one → save → cell now shows the slot title and `grading_slot_id` is persisted.

### Out of scope

- Auto-creating grading slots from a schedule.
- Changing the duplicate-grading-invoice 60-day window.
- Migrating historical grading invoice items in bulk via SQL.

