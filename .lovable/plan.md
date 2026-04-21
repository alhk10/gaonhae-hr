

## Plan: Wider, taller, mobile-friendly Create Invoice dialog

### Current state (from screenshot + code)
- `InvoiceDialog` uses `DialogContent` with `max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-3 sm:p-6 top-[5%] translate-y-0`.
- On a 1804px viewport the dialog renders much narrower than expected (~720px) and short — empty space below items, headers crammed (Disc/Size/Color narrow). On mobile the items table doesn't fit and forces horizontal scroll.

### Root cause
`Dialog`'s base `DialogContent` (`src/components/ui/dialog.tsx`) hardcodes `max-w-lg` in its className. Because Tailwind merges via `twMerge`, `max-w-6xl` from `InvoiceDialog` does override `max-w-lg` — but the dialog also lacks an explicit `min-h` and the items table columns are fixed at narrow widths. The dialog also doesn't reach near the viewport bottom because there's no `min-h` / flex layout to fill `max-h-[95vh]`.

### Fix (single file: `src/components/sales/InvoiceDialog.tsx`)

1. **Wider on desktop, full-bleed on mobile**
   - Change `DialogContent` className to:
     `w-[98vw] sm:w-[95vw] max-w-[1400px] max-h-[95vh] sm:max-h-[90vh] min-h-[60vh] overflow-hidden p-0 top-[2%] sm:top-[5%] translate-y-0 flex flex-col`
   - Wrap the existing header in `px-4 sm:px-6 pt-4 sm:pt-6` and the body in a scrollable `flex-1 overflow-y-auto px-4 sm:px-6` region; footer (Cancel / Create Invoice) gets `border-t px-4 sm:px-6 py-3 sticky bottom-0 bg-background`. This makes the dialog visually fill more vertical space and keeps action buttons reachable on mobile.

2. **Mobile-friendly items area**
   - The `Invoice Items` table currently uses a fixed grid (`Category | Product | Qty | Price | Disc | Size | Color | Term/Slot | Total | +`) — too wide for phones.
   - Wrap the table in `<div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">` so it scrolls horizontally only inside the body on mobile, while the dialog itself stops needing horizontal scroll.
   - Set table min-width: `min-w-[900px]` so columns keep their proportions when scrolled.
   - On `sm:` and up, the table fits the wider dialog naturally — no horizontal scroll needed.

3. **Header field stacking on mobile**
   - The Branch / Student / Invoice Date row uses a 3-col grid. Change to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3` so each field gets a full row on phones.

4. **Apply the same shell to edit/view modes**
   - Same `DialogContent` shell pattern for `mode === 'edit' | 'view'` so the experience is consistent (no separate dialog).

### What stays the same
- All field logic, validation, branch product filtering, popover scroll behavior (already fixed).
- Compact sizing tokens (`h-7`, `text-xs`) per existing memory.
- Date format (`DD/MM/YYYY` via `DatePicker`).

### Verification
- Desktop 1804px: dialog ≈ 1400px wide and ≥60vh tall — no empty space, items table fits without horizontal scroll.
- Tablet ~820px: dialog uses ~95vw, header fields stack 2-up, items table fits.
- Mobile 390px: dialog uses ~98vw, header fields stack 1-up, items table scrolls horizontally inside the dialog body, footer stays pinned at bottom and reachable.

### Out of scope
- Redesigning the items table layout itself (column re-ordering, hiding columns on mobile).
- Touching other dialogs.

