

# Make Pay School Fees Dialog Mobile Friendly

## Changes to `src/components/dashboard/PaySchoolFeesDialog.tsx`

### 1. Responsive Dialog Width
- Change `max-w-3xl` to `w-full max-w-3xl` and add mobile padding: `sm:max-w-3xl p-4 sm:p-6`
- Add `max-h-[85vh] overflow-y-auto` (already has `max-h-[90vh]`, adjust to `85vh` for mobile consistency)

### 2. Responsive Padding and Spacing
- Reduce `space-y-4` to `space-y-3` on mobile for tighter layout
- Card content padding: change `p-4` to `p-3 sm:p-4` on summary and payment cards
- Upload area padding: `p-3 sm:p-4`

### 3. Summary Card Layout
- Keep the `flex justify-between` rows but ensure text doesn't overflow on narrow screens by adding `truncate` or `text-right` to value spans
- Total row: reduce `text-lg` to `text-base sm:text-lg` for the price

### 4. Action Buttons
- Change footer from `flex gap-2 justify-end` to stack vertically on mobile: `flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`
- Shorten button text on mobile: "Create Invoice & Pay" becomes "Pay" on small screens (or keep full text with smaller font)
- Make buttons full-width on mobile: `w-full sm:w-auto`

### 5. Upload Area
- The dashed upload area is already reasonably mobile-friendly; ensure the file name truncates with `truncate max-w-[200px]`

### 6. Dialog Header
- Reduce title size on mobile with `text-base sm:text-lg`

### 7. Success Step
- Reduce vertical padding: `py-4 sm:py-6`

## Technical Summary
All changes are CSS/className adjustments within `PaySchoolFeesDialog.tsx`. No logic or data flow changes needed.

