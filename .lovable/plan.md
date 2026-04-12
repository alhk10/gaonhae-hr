

## Plan: Add Drag-and-Drop Category Reordering

### Problem
Currently, reordering categories requires clicking tiny up/down arrows one position at a time -- tedious when you have many categories (like the 20+ revenue items shown).

### Solution
Replace the up/down arrow buttons with drag-and-drop reordering using `@dnd-kit/core` + `@dnd-kit/sortable`. Each category row becomes a draggable item with a grip handle. Dropping saves the new order to the database in bulk.

### File: `src/pages/BranchProfitLoss.tsx`

1. **Install dependency**: Add `@dnd-kit/core` and `@dnd-kit/sortable` and `@dnd-kit/utilities`
2. **Replace the category list** (lines 1842-1929) with a `SortableContext` wrapping sortable category rows
3. **Add a drag handle** (grip icon) on each row instead of the up/down chevron buttons
4. **Add `handleDragEnd`** handler that:
   - Reorders the local array
   - Assigns new sequential `sort_order` values
   - Batch-updates all affected rows in `pl_categories` via Supabase
5. **Remove** `handleReorderCategory` function and `ChevronUp`/`ChevronDown` imports (no longer needed)

### Impact
- Only affects the "Manage Revenue Categories" and "Manage Expense Categories" dialogs
- Drag-and-drop makes reordering 10+ items much faster
- Existing edit, delete, and add functionality unchanged
- Sort order persists to database same as before

