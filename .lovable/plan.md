

## Plan: Update ViewEditInvoiceDialog to Match CreateInvoiceDialog's Compact Format

### Problem
The View/Edit Invoice dialog uses standard sizing (`max-w-4xl`, `h-10` inputs, `text-sm`) with no mobile responsiveness. The Create Invoice dialog already uses a compact, mobile-first design (`max-w-[95vw] md:max-w-4xl`, `text-xs`, `h-7` inputs, mobile card layouts). These need to be consistent.

### Changes to `src/components/sales/ViewEditInvoiceDialog.tsx`

**1. Dialog container** (line 828)
- Change `max-w-4xl` to `max-w-[95vw] md:max-w-4xl` and add `top-[5%] translate-y-0`

**2. Header** (lines 829-877)
- Make title `text-base md:text-lg` instead of `text-xl`
- Stack action buttons: wrap in `flex-wrap` on mobile, use `text-xs` sizing (`h-7 text-xs`) for all header buttons
- On mobile, hide button text and show icon-only for History/Adjustments/Cancel & Refund buttons

**3. Tabs** (lines 879-892)
- Reduce tab trigger text size, hide icons on mobile (`hidden sm:inline`)

**4. Details tab** (lines 894-970)
- Make summary cards compact: `text-lg md:text-2xl` for amounts
- Use `text-xs md:text-sm` for labels and values
- Compact spacing throughout

**5. Items tab - View mode** (lines 1255-1375)
- Add mobile card layout (`md:hidden`) mirroring CreateInvoiceDialog's pattern: stacked cards showing product name, qty, price, discount, total
- Hide the Table on mobile (`hidden md:block`)
- Use `text-xs` throughout

**6. Items tab - Edit mode** (lines 972-1254)
- Replace `grid-cols-12` layout with responsive approach: mobile stacked cards + desktop table/grid
- Reduce input heights to `h-7 text-xs`
- Compact the product search popover button to `h-7 text-xs`
- Add Item button: compact sizing

**7. Payments tab** (lines 1378-1473)
- Add mobile card layout for payments list (hide table on mobile)
- Compact button sizing

**8. Totals sections** (both edit and view mode, lines 1227-1253 and 1341-1373)
- Match CreateInvoiceDialog's format: `w-full md:w-64`, `text-xs md:text-sm`

**9. Footer** (lines 1476-1487)
- Match `text-xs md:text-sm h-8 md:h-10` button sizing

**10. Cancel & Refund sub-dialog** (lines 1542-1591)
- Add `max-w-[95vw]` constraint
- Compact text sizing

**11. Delete Request sub-dialog** (lines 1490-1540)
- Add `max-w-[95vw]` constraint
- Compact text sizing

