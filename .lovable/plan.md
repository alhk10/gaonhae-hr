

## Plan: Fix first-open race where Branch & Student dropdowns appear empty

### Root cause

In `InvoiceDialog.tsx`, the data loaders (`loadBranches`, `loadStudents`, `loadProducts`, `loadCategories`, `loadGradingSlots`) only run inside `useEffect(..., [dialogOpen])` — i.e., **after** the dialog opens. The dialog renders immediately with empty `branches=[]` and `students=[]`, so:

- The **Branch** Select receives `formData.branch_id = lockedBranchId` (e.g. `"morley"`) but no matching `<SelectItem>` exists yet → it falls back to the "Select branch" placeholder. The "Locked" badge still shows because `lockedBranchId` is truthy, but the field looks empty.
- The **Student** combobox renders with `filteredStudents = []` → "Select student" placeholder, no options to pick.
- Closing and reopening "fixes" it because by the time the user reopens, the prior fetches have populated `branches`/`students`/`products` state, and the second mount's loaders just refresh already-populated data.

There is a secondary minor issue: `StudentSearchSelect` receives `container={dialogContentRef.current}`, which is `null` on the first render (ref attaches after mount), but this only affects the popover portal target, not the empty-list problem.

### Fix

**File: `src/components/sales/InvoiceDialog.tsx`**

1. **Preload shared data on component mount in create mode**, not on dialog open. The component is mounted as soon as the page renders the trigger button, so by the time the user clicks, `branches`/`students`/`products`/`categories`/`gradingSlots` are already populated.

   Replace the existing `useEffect([dialogOpen])`:
   ```ts
   // Preload reference data once when component mounts (create mode only)
   useEffect(() => {
     if (!isCreateMode) return;
     loadStudents();
     loadProducts();
     loadBranches();
     loadCategories();
     loadGradingSlots();
   }, [isCreateMode]);

   // On dialog open: just apply locked branch + load view data for view/edit
   useEffect(() => {
     if (!dialogOpen) return;
     if (isCreateMode) {
       if (lockedBranchId) {
         setFormData(prev => ({ ...prev, branch_id: lockedBranchId }));
         loadBranchTerms(lockedBranchId);
       }
     } else {
       setMode(initialMode);
       loadInvoiceData();
       loadViewProducts();
     }
   }, [dialogOpen]);
   ```

2. **Add a loading guard for the locked-branch case** so the Select doesn't briefly render with a stale placeholder if a slow network beats the user's click. While `branches.length === 0` AND `lockedBranchId` is set, render a disabled `<Input value="Loading branch..." />` in place of the Branch Select. Once `branches` populates (almost always before the user opens the dialog after the mount-preload), the real Select renders with the correct selected branch name.

3. **Show a subtle loading indicator in the Student combobox** when `students.length === 0`: change the placeholder from "Select student" to "Loading students..." and disable the trigger button. Once students load, normal behavior resumes.

4. **Fix the popover container ref** so the Student/Product comboboxes portal correctly on first open: switch `container={dialogContentRef.current}` to a state-driven ref:
   ```ts
   const [dialogContentEl, setDialogContentEl] = useState<HTMLElement | null>(null);
   <DialogContent ref={(el) => { dialogContentRef.current = el; setDialogContentEl(el); }} ...>
   ```
   Then pass `container={dialogContentEl}` to `StudentSearchSelect` and `ProductSearchSelect`. This ensures the popover re-renders with the correct portal target after the dialog mounts.

### Verification

- From `/parties` (or any branch dashboard), click **Create Invoice** for the first time after page load → Branch field immediately shows the locked branch name (e.g. **Morley**), Student dropdown lists active students for that branch, no need to close/reopen.
- Click Create Invoice on a slow network → Branch field briefly shows "Loading branch..." then resolves to the locked branch; Student dropdown shows "Loading students..." then populates. No empty dropdown with a "Locked" badge.
- Open Create Invoice from `InvoiceManagementList` (no `lockedBranchId`) → Branch dropdown lists all accessible branches on first open.
- Open in **view/edit** mode → unchanged (loaders still fire on `dialogOpen` for invoice data).
- Open Student combobox → list portals inside the dialog (not behind it), search works on first interaction.

### Out of scope

- Migrating loaders to React Query for cross-component caching (current local-state approach is fine for the fix; can be revisited later).
- Changing the locked-branch UX (badge, disabled state).

