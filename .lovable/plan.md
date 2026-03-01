

## Plan: Branch Color Coding on Calendar

Replace the current approved/pending color scheme with per-branch color coding, so each branch gets a unique color on the calendar dates.

### Changes to `src/components/dashboard/SlotBookingBranchChangeDialog.tsx`

1. **Generate branch colors**: Create a color palette (8-10 distinct colors). Map each unique branch name from bookings to a color.
2. **Replace modifiers**: Instead of `approved`/`pending` modifiers, create a modifier per branch (e.g., `branch-ABC`, `branch-XYZ`), each with its own background/text color from the palette.
3. **Update legend**: Replace the Approved/Pending legend with a dynamic legend showing each branch name with its assigned color swatch.
4. **Keep status indicator**: Move status (approved/pending) indication to a small dot or border style on the date cell, or just show it in the selected booking details card (already shown there).

### Color Palette
Use a fixed array of distinct HSL colors like: blue, green, orange, purple, pink, teal, red, amber. Assign by index of unique branch names sorted alphabetically.

### Single file change, no new dependencies.

