

## Plan: Load grading slots in edit/adjust mode so the slot dropdown populates

### Root cause

In `src/components/sales/InvoiceDialog.tsx`, `loadGradingSlots()` only runs inside the create-mode mount effect (line 391: `if (!isCreateMode) return;`). When opening an existing invoice in **view/edit/adjust** mode, `gradingSlots` state stays `[]`, so for any line item in the *Grading* category the edit-mode UI (lines 1746–1776) computes `branchSlots = []` and shows:

> *"No grading slots — create one in Sales → Grading"*

Elliot's invoice INV-2026-00248 actually has `metadata.grading_slot_id = bcc577d6-...` saved (Morley · 11 Apr 2026 · 08:10 · White), and 7 active slots exist for Morley on that date — they just aren't fetched in edit mode.

### Fix

**File: `src/components/sales/InvoiceDialog.tsx`**

In the dialog-open effect (lines 400–414), also call `loadGradingSlots()` for the view/edit branch when the slots haven't been loaded yet. The function already filters by `status: 'active'` and includes the past 60 days, which covers the Apr 11 slot.

```ts
} else {
  setMode(initialMode);
  loadInvoiceData();
  loadViewProducts();
  if (branches.length === 0) loadBranches();
  if (gradingSlots.length === 0) loadGradingSlots();
}
```

The existing edit-mode renderer (lines 1746–1776) already filters slots by `s.branch_id === invoice.branch_id || s.available_branch_ids?.includes(invoice.branch_id)`, so once `gradingSlots` populates, all 7 Morley slots for 11 Apr 2026 (Foundation 1, Yellow Tip, White, Yellow, Green Tip, Green/Blue Tip, Foundation) will appear in the dropdown and the currently-saved slot (`bcc577d6-...`, "Morley - 11 Apr 2026 - 08:10 - White") will display as the selected value.

### Verification

1. Open INV-2026-00248 → click **Adjust** → the *White >> Yellow Tip* line shows **Grading slot: Morley - 11 Apr 2026 - 08:10 - White** as the selected value, with all 7 Apr 11 Morley slots in the dropdown.
2. Switch to a different slot → save → invoice metadata updates; reopen → new slot reflected.
3. Open any non-grading invoice → no extra render impact (gradingSlots still loaded once but unused).
4. Create-mode flow unchanged (slots still preloaded on mount).

### Out of scope

- Changing how grading slots are filtered by belt/age (separate slot eligibility logic in `getFilteredGradingSlots`, which is create-mode only).
- Refactoring `gradingSlots` into a shared cache.

