## Plan — Click Slot/Result to edit (remove pencil button)

### Goal
Get rid of the per-row pencil (✏️) edit button. Instead, make the **Slot** and **Result** cells themselves clickable — clicking either one opens the existing `GradingBulkEditDialog` scoped to that single student, where the user can change slot and/or result.

### Findings (read-only)
- `GradingBulkEditDialog` already supports single-student editing (it accepts an array of student IDs and dynamically adapts the title/description).
- Current Edit (✏️) button in both `BranchGradingList.tsx` and `GradingListTab.tsx` calls:
  ```ts
  setBulkStudentIds([student.student_id]);
  setBulkOpen(true);
  ```
  — exactly the same handler we need to wire to the cell click.
- Slot cell currently renders the slot name (or `"-"`); Result cell renders a colored badge (Pass / Double / Fail) or `"-"`.
- Top-bar **Bulk Edit** button (multi-select via checkboxes) stays untouched — only the per-row pencil goes.

### Changes

**1. `src/components/dashboard/BranchGradingList.tsx`**
- Remove the `<Button>` with the `Pencil` icon from the desktop Actions column.
- Remove the `Pencil` import if no longer used.
- Wrap the Slot cell content in a clickable element:
  ```tsx
  <TableCell
    className="cursor-pointer hover:bg-accent/50 transition-colors"
    onClick={() => { setBulkStudentIds([student.student_id]); setBulkOpen(true); }}
    title="Click to change slot"
  >
    {student.slot_name ?? <span className="text-muted-foreground italic">Click to assign</span>}
  </TableCell>
  ```
- Same treatment for the Result cell (keep the existing badge inside, just make the cell clickable with the same handler + `title="Click to change result"`).
- Mobile card: remove the small pencil button; make the "Slot:" and "Result:" lines tappable with the same handler (add `cursor-pointer` + subtle hover/active state).

**2. `src/components/sales/GradingListTab.tsx`**
- Mirror the exact same changes:
  - Remove pencil button from the sticky Actions column.
  - Make Slot and Result `<TableCell>`s clickable → open `GradingBulkEditDialog` for that single student.
  - Mobile card: same treatment.

**3. Preserved behaviour**
- Top-bar **Bulk Edit** button (works on multi-row checkbox selection) — unchanged.
- Cert / Cert II buttons in the sticky-right action area — unchanged (still gated by result + payment-reminder dialog).
- Inline scorecard cells (Height, Weight, etc.) — unchanged.
- `GradingBulkEditDialog` itself — no changes needed.

**4. Out of scope**
- No DB or service changes.
- No change to the dialog's UX or fields.
- No change to result-entry validation / ready-flag logic.

👉 Approve to switch to default mode and execute.