
## Replace "Add Grading Slot" with Bulk Spreadsheet Dialog

### Goal
The existing `+ Add Grading Slot` button will open a new bulk spreadsheet-style dialog instead of the single-slot dialog. The button label stays `+ Grading Slot`. The single-slot dialog (`AddGradingSlotDialog`) is kept only for the **Edit** and **Duplicate** row actions — it will no longer be used for creation.

### What the Bulk Dialog Looks Like

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  + Grading Slot                                              [X Close]   │
│  Add multiple grading slots at once                                      │
├──────────┬──────────┬───────┬──────────────────────┬──────────┬─────────┤
│  Branch  │   Date   │ Time  │        Title         │  Belts   │ Cap │ ✕ │
├──────────┼──────────┼───────┼──────────────────────┼──────────┼─────────┤
│ [sel ▼]  │ [date]   │[time] │ [auto-generated]     │ [btn▼]   │ 20  │ 🗑│
│ [sel ▼]  │ [date]   │[time] │ [auto-generated]     │ [btn▼]   │ 20  │ 🗑│
└──────────┴──────────┴───────┴──────────────────────┴──────────┴─────────┘
  [+ Add Row]  [Duplicate Last Row]          [Cancel]  [Save All (2)]
```

### Implementation Plan

#### 1. New Component: `BulkAddGradingSlotsDialog.tsx`

**Local row state:**
```typescript
interface BulkRow {
  id: string;          // temp local key (uuid)
  branch_id: string;
  grading_date: string;
  start_time: string;
  title: string;       // auto-generated, editable
  belt_levels: string[];
  max_capacity: number;
}
```

**Row interactions:**
- Branch: `<Select>` dropdown (filtered to real branches)
- Date: `<input type="date">`
- Time: `<input type="time">`
- Title: `<Input>` — auto-fills when branch/date/time/belts change (reuses `generateDefaultTitle` logic), user can override
- Belt Levels: compact `<Popover>` button showing count (e.g. "3 belts"), opens checkbox list of all `BELT_LEVELS`
- Capacity: `<input type="number">`
- Delete icon: removes that row

**Toolbar controls:**
- `+ Add Row` — appends a blank row
- `Duplicate Last Row` — copies last row's values for fast repetitive entry

**Validation before save:**
- Each row must have `branch_id` and `grading_date`
- Invalid rows highlighted with red border
- Toast shows count of errors if any

**Save logic:**
- Calls `createGradingSlot(row)` for each valid row
- Shows inline progress text: "Saving 2 of 5..."
- On completion: success toast with count, dialog closes, parent `loadData()` called

**Dialog starts with 1 blank row by default.**

#### 2. Changes to `GradingManagement.tsx`
- Replace the `GradingSlotDialog` trigger block (lines 151–161) with the new `BulkAddGradingSlotsDialog`
- Button label stays `+ Grading Slot` (just changes the `Plus` icon + label text to match)
- Keep existing `GradingSlotDialog` for Edit (inline per-row) and Duplicate (pre-filled copy dialog) — no change to those

### Files

| Action | File |
|--------|------|
| Create | `src/components/sales/BulkAddGradingSlotsDialog.tsx` |
| Edit | `src/pages/sales/GradingManagement.tsx` |

No database changes needed — uses existing `createGradingSlot` from `gradingService.ts`.
