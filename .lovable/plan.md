## Plan

Fix the grading product dropdown so it can be scrolled reliably inside the Add Grading Slots dialog.

## Changes

1. **Use a modal-aware popover container**
   - Render the grading product popover portal inside the dialog content instead of the document body.
   - This avoids the dialog overlay/scroll container interfering with wheel and touch scrolling.

2. **Make the product list the scroll target**
   - Keep the popover itself unscrolled.
   - Put scrolling on the inner product list with fixed height constraints.
   - Add overscroll containment so mouse wheel/touch gestures stay within the dropdown.

3. **Improve list usability**
   - Keep the checkbox list compact.
   - Prevent long product names from breaking the dropdown layout.
   - Apply the same fix to the “Avail. to Branches” multi-select if it uses the same popover pattern.

## Technical details

- Update `BulkAddGradingSlotsDialog.tsx` only.
- Add a `dialogContentRef` to `DialogContent`.
- Pass that ref as `container` to `PopoverContent` for `GradingProductPopover` (and branch multi-select if needed).
- Use classes like `max-h-[min(18rem,calc(100vh-12rem))] overflow-y-auto overscroll-contain touch-pan-y` on the inner list.
- No database changes are needed.