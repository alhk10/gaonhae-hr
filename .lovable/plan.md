

## Update Student List to Compact Card View

Replace the current table layout in `StudentManagementList.tsx` with a compact card-based list matching the reference screenshot.

### Changes to `src/components/sales/StudentManagementList.tsx`

**Replace the `<Table>` block (lines 303-416) with a compact list:**
- Each student rendered as a bordered row/card
- Student name displayed in uppercase, bold, centered-left
- Phone and email shown below the name separated by a dot
- Belt level as a dark badge (or "No belt" in outline style) on the right
- Status badge next to belt badge
- Remove: Join Date column, Actions column (keep row clickable to navigate), table headers
- Keep checkbox selection functionality via a subtle left-side checkbox
- Maintain the existing pagination and bulk actions

### Layout per row
```text
┌──────────────────────────────────────────────────────────┐
│  STUDENT FULL NAME                    [Belt Badge] [status] │
│  +65XXXXXXXX  •  email@example.com                          │
└──────────────────────────────────────────────────────────┘
```

- Names rendered uppercase via CSS (`uppercase` class)
- Belt badges use dark variant for actual belts, outline for "No belt"
- Row is clickable (navigates to student profile)
- Edit/delete actions accessible from student profile page instead

### Items per page
Increase `itemsPerPage` from 20 to 50 to show more students at once in the compact view.

