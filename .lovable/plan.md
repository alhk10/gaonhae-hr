## Grading List — Sort, Compact Rows, Multi-Select Bulk Action, Autosave Ready

Apply the same changes to **both** files (they share the same shape):
- `src/components/dashboard/BranchGradingList.tsx` (Branch Dashboard)
- `src/components/sales/GradingListTab.tsx` (Sales / Superadmin)

### 1. Sort by slot order (unassigned at top)

Replace the current `result.sort((a, b) => a.student_name.localeCompare(b.student_name))` with:

```ts
result.sort((a, b) => {
  // Unassigned slots float to the top
  const aHas = !!a.grading_slot_date;
  const bHas = !!b.grading_slot_date;
  if (aHas !== bHas) return aHas ? 1 : -1;          // unassigned first
  if (!aHas && !bHas) return a.student_name.localeCompare(b.student_name);
  // Both have a date → ascending (earliest first)
  const dateCmp = (a.grading_slot_date || '').localeCompare(b.grading_slot_date || '');
  if (dateCmp !== 0) return dateCmp;
  // Same date → group by slot title, then name
  const titleCmp = (a.grading_slot_title || '').localeCompare(b.grading_slot_title || '');
  if (titleCmp !== 0) return titleCmp;
  return a.student_name.localeCompare(b.student_name);
});
```

### 2. One-line compact desktop row

Reduce row to a single line. Drop the per-row inline editor for slot/result (those move to the bulk dialog or a per-row pencil — see §4). Tighten table cell padding via a `compact` className.

- Add a top-level checkbox column for multi-select (header = "select all visible").
- Override `TableCell` padding for this table only with `className="py-1 px-2 text-xs"` and `TableHead` similarly. This keeps `ui/table.tsx` untouched.
- Columns (in order): `[ ☐ ] Name · Belt · Lessons · Ready · Term · Grading · Slot · Result · Cert · Cert II · ⋯`
  - Belt → `Badge` `text-[10px] px-1 py-0`
  - Term Paid / Grading Paid → `Badge` `text-[10px] px-1 py-0`
  - Slot → single-line `truncate` `text-xs` (e.g. "Morley · 11/04/2026 · 08:10 · White")
  - Result → small badge or `–`
  - Actions cell collapses Eye + Trash + Pencil (per-row edit) into a tight `gap-0.5` flex with `h-6 w-6 p-0` ghost buttons
- Add `whitespace-nowrap` on Slot/Term/Result cells, but allow Name to truncate with `max-w-[180px] truncate`.
- Drop `<TableHead className="w-[…]">` fixed widths in favour of `min-w-` so columns auto-fit.

Mobile layout stays as the existing 3-line cards but gains the same checkbox in the top-right cluster.

### 3. Multi-select + Bulk Action dialog (replaces "Mass Edit" button)

Remove the `Mass Edit` button entirely. Remove `isEditMode` state.

State additions:
```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkOpen, setBulkOpen] = useState(false);
```

Header layout (replaces current right-side button cluster):
- Always-visible: `Term` selector (unchanged)
- When `selectedIds.size > 0`: show `Bulk Edit (N)` primary button → opens `<Dialog>`
- When `selectedIds.size === 0`: button hidden; no other action buttons in the header

Bulk dialog content (`max-w-md`):
- Header: "Update N student(s)"
- Field 1 — **Grading Slot**: `Select` with options `Leave unchanged` (default), `Not Assigned`, then `availableSlots` listed in **slot order (date asc)**. Use the same options the per-row Select uses today.
- Field 2 — **Result**: `Select` with options `Leave unchanged` (default), `Clear`, plus the four `RESULT_OPTIONS`.
- Footer: `Cancel` · `Apply`

`Apply` handler:
- Build a single `update` payload per selected student that mirrors the existing batch-save logic (registration update OR insert). Reuse the lazy-Ready-sync rule already implemented in `batchSaveMutation` (lines 486–496).
- For students whose `grading_paid !== 'paid'` we still allow setting the slot — the existing per-row dropdown disables it, but the user explicitly asked for a bulk action; we will warn in the dialog ("Slot changes will be persisted even for unpaid grading rows. Result changes are only applied to paid rows.") and skip the `result` field for unpaid rows to match the existing inline rule.
- After save: clear `selectedIds`, invalidate `grading-list-students`, toast `Updated N student(s)`.

Selection mechanics:
- Header checkbox toggles all currently rendered rows.
- Row checkbox toggles its own id.
- Selection is cleared whenever `selectedTerm` changes.

### 4. Inline autosave for Ready (no edit mode required)

The Ready cell becomes an always-interactive `Checkbox`. On change, call a new mutation that immediately persists the change (no batch, no edit mode):

```ts
const toggleReadyMutation = useMutation({
  mutationFn: async ({ student, next }: { student: GradingListStudent; next: boolean }) => {
    if (student.registration_id) {
      const { error } = await supabase
        .from('grading_registrations')
        .update({ ready_for_grading: next })
        .eq('id', student.registration_id);
      if (error) throw error;
    } else {
      // Insert a fresh registration row (same shape used in batchSaveMutation else-branch)
      const { getNextBeltLevel } = await import('@/constants/beltLevels');
      const currentBelt = student.current_belt || 'White';
      const nextBelt = getNextBeltLevel(currentBelt) || currentBelt;
      const { error } = await supabase
        .from('grading_registrations')
        .insert([{
          student_id: student.student_id,
          current_belt: currentBelt,
          target_belt: nextBelt,
          grading_slot_id: null,
          ready_for_grading: next,
          result: null,
          term_id: selectedTerm || null,
        }]);
      if (error) throw error;
    }
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grading-list-students'] }),
  onError: (e: Error) => toast.error(e.message || 'Failed to update Ready'),
});
```

Behaviour:
- Checkbox is `disabled={toggleReadyMutation.isPending}` while in flight.
- Optimistic UI: temporarily reflect the toggle by updating the row through `setQueryData` so the user sees the tick immediately; rollback on error.
- The existing UI-derivation (`termStarted && !result`) still drives the **default** displayed state; the autosave converges the DB on the very first interaction.

### 5. Per-row Slot/Result still editable via a small pencil (per Q3 answer)

Add a `Pencil` icon in the row's Actions cell. Clicking it opens the **same** Bulk Edit dialog pre-seeded with that single student id (`selectedIds = new Set([student.student_id])`, `bulkOpen = true`). This:
- Removes the need for any persistent edit-mode state.
- Lets staff edit exactly one row through the same code path as bulk.
- Keeps single-row changes safe (explicit dialog confirmation).

### 6. Cleanup

- Delete: `isEditMode`, `pendingChanges`, `setLocalReady`, `setLocalResult`, `setLocalSlot`, `getEffectiveResult`, `getEffectiveSlot`, `hasStudentChange`, `batchSaveMutation`, sticky save bar, `Save` / `Undo2` / `Pencil`-as-mass-edit imports (re-add `Pencil` for per-row edit), discard buttons.
- Keep: `getEffectiveReady` (still useful for term-started fallback display) — but rename to `displayReady` since there are no longer any pending changes. Inputs simplify to `(student) => student.ready_for_grading || (termStarted && !student.result)`.
- Keep: deletion AlertDialog, detail dialog, term selector behaviour.

### 7. Verification checklist

- Term 1 2026 list opens sorted by slot date (Morley 11/04/2026 grouped together) with any unassigned students at the top.
- Toggling the Ready checkbox on any row immediately persists (refresh confirms) without entering an edit mode.
- Selecting 3 students → header shows `Bulk Edit (3)` → dialog allows slot+result update → Apply persists all 3 in one network round-trip equivalent.
- Pencil on a single row opens the same dialog with that student preselected.
- Mobile: rows still render as the compact 3-line card, Ready autosaves, multi-select checkbox visible top-right.
- Both Branch Dashboard grading tab and Sales > Grading List tab behave identically.

### Files to edit
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`

No DB schema changes. No new memory entries needed (behaviour is consistent with existing grading-list memory).