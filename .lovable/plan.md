

## Plan: Make Create Invoice Dialog Mobile-Compact

### Problem
The Create Invoice dialog uses a wide desktop table layout (`max-w-5xl`) with 10 columns that overflows on mobile screens. The image shows it's already partially compact but needs further optimization.

### Changes

#### 1. `src/components/sales/CreateInvoiceDialog.tsx` — DialogContent and form layout

**Dialog container** (line 1104):
- Change `max-w-5xl` to `max-w-[95vw] md:max-w-5xl`
- Add `top-[5%]` anchor pattern

**Header** (line 1106):
- Reduce title size on mobile: `text-base md:text-lg`

**Invoice Details section** (lines 1111-1152):
- Reduce heading: `text-sm md:text-lg font-medium`
- Tighten spacing: `space-y-2 md:space-y-4`, `gap-2 md:gap-4`
- Smaller labels on mobile: `text-xs md:text-sm`

**Invoice Items section** (lines 1155-1383):
- **Replace the Table with a mobile card layout**: On mobile (`md:hidden`), render each item and the add-item row as stacked cards instead of a horizontal table. Each card shows fields in 2-3 compact rows:
  - Row 1: Category select + Product select (side by side)
  - Row 2: Qty + Price + Discount + Total (side by side, tight)
  - Row 3: Size/Color/Term fields (only when relevant)
- Keep the existing Table for desktop (`hidden md:table`)
- Use `text-xs` throughout, `h-7` inputs, `px-1 py-1` cell padding

**Added items display on mobile**: Each added item as a compact card:
- Line 1: Product name (bold, truncated) + delete button
- Line 2: Qty × Price = Total, discount if any
- Line 3: Size/Color/Term metadata (small, muted)

**Totals section** (lines 1405-1422):
- Reduce width on mobile: `w-full md:w-64`
- Smaller text: `text-xs md:text-sm`, total `text-sm md:text-lg`

**Notes section** (lines 1428-1449):
- Reduce spacing: `space-y-2 md:space-y-4`
- Single row textareas on mobile: `rows={1}` on mobile via className height

**Footer** (lines 1452-1465):
- Smaller buttons on mobile: `text-xs md:text-sm h-8 md:h-10`

### Scope
- **Modified**: `src/components/sales/CreateInvoiceDialog.tsx` (mobile-responsive compact layout)
- No database or service changes

