

## Plan: Tab-to-select in Nationality and Languages dropdowns

### Current behavior
The `MultiSelect` component (used for Nationality and Languages on the registration form) opens a popover with a search input. Users can already **type to filter**, but only **Enter** or **mouse click** picks the highlighted option. **Tab** moves focus out of the popover instead.

### Desired behavior
While typing in the search input:
- **Tab** selects the currently highlighted option (same as Enter), keeping the popover open so the user can keep adding more (matches the multi-select use case).
- If no option matches but `allowAddNew` is true (Languages), Tab adds the typed value as a new entry.
- Shift+Tab continues to behave normally (focus traversal), so users aren't trapped.

### Change

**File: `src/components/ui/multi-select.tsx`**

Add an `onKeyDown` handler on `CommandInput` that intercepts the Tab key:
1. Read the currently highlighted item from cmdk (via `[cmdk-item][data-selected="true"]` in the popover) and call `handleSelect` with its value.
2. If nothing is highlighted but `showAddOption` is true, call `handleAddNew`.
3. In both cases, `e.preventDefault()` to keep focus in the search input and the popover open. Otherwise let Tab proceed normally.

No changes to consumers (`StudentRegistration.tsx`, `AddStudentDialog.tsx`, `EditStudentDialog.tsx`) — they already use `MultiSelect`, so the improvement applies everywhere automatically (Nationality, Languages, and any other multi-select usage).

### Verification
- /register page → Additional Information → type "mal" in Nationality, press Tab → "Malaysian" is added, popover stays open, search clears, ready for next entry.
- Languages → type a new language not in the list, press Tab → it's added as a custom entry.
- Shift+Tab still moves focus away normally.

