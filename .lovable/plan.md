

## Plan: Restructure Invoice & Payment row layout

### What changes

In `src/components/dashboard/BranchDashboard.tsx` (Invoice list rendering, lines ~1604–1662), restructure each invoice card into 2 lines with the requested ordering, and hide View/Edit/Delete buttons on mobile.

### New row layout

**Line 1** (left → right):
- Student Display Name (uppercase, bold)
- Invoice number (muted, smaller)
- Amount (right-aligned)
- Status badge

**Line 2** (left → right):
- Date of invoice (muted)
- Action buttons (right-aligned): `$` Add Payment, Download PDF, SMS, WhatsApp, Overdue alert (if overdue), View, Edit, Delete

### Mobile vs desktop visibility

Use the existing `useIsMobile()` hook (from `@/hooks/use-mobile`) to conditionally hide three action buttons under 768px:
- **View** (Eye icon) — hidden on mobile
- **Edit** (Edit icon) — hidden on mobile
- **Delete** (Trash icon) — hidden on mobile

Always visible on both mobile and desktop:
- `$` Add Payment (when status is unpaid/draft/sent/partial/overdue)
- Download PDF
- SMS, WhatsApp
- Overdue alert (when applicable)

Implementation: wrap the three buttons with `{!isMobile && (...)}`.

### Hint text

The phrase "Click row to view/edit invoice" does not currently appear anywhere in the codebase. No hint text is added; row container has no `onClick` handler — confirmed unchanged.

### Code shape

```tsx
<div key={invoice.id} className="px-2 py-1.5 bg-muted/50 rounded-lg space-y-1">
  {/* Line 1: name + invoice number + amount + status */}
  <div className="flex items-center gap-1.5">
    <span className="font-semibold text-xs truncate min-w-0">{studentName}</span>
    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{invoice.invoice_number}</span>
    <span className="font-medium text-xs whitespace-nowrap ml-auto">${invoice.total_amount?.toFixed(2)}</span>
    <Badge variant={...} className="text-[10px] px-1 h-4 shrink-0">{invoice.status}</Badge>
  </div>
  {/* Line 2: date + action buttons */}
  <div className="flex items-center gap-1.5">
    <span className="text-[11px] text-muted-foreground">{formatDate(new Date(invoice.created_at))}</span>
    <div className="flex items-center shrink-0 ml-auto">
      {/* $ Add Payment, Download, SMS, WhatsApp, Overdue — always shown */}
      {!isMobile && (
        <>
          {/* View, Edit, Delete buttons */}
        </>
      )}
    </div>
  </div>
</div>
```

Add `const isMobile = useIsMobile();` near the top of the component if not already present, and import `useIsMobile` from `@/hooks/use-mobile`.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` (only)

### Verification

1. Desktop (≥768px): each invoice row shows 2 lines as specified, all 8 action buttons visible on line 2.
2. Mobile (<768px): each invoice row shows 2 lines; line 2 hides View, Edit, Delete; `$`, Download, SMS, WhatsApp (and Overdue when applicable) remain.
3. Status badge shows on line 1 next to the amount on both viewports.
4. Invoice number now sits next to the student name on line 1 (previously on line 2).
5. No "Click row to view/edit invoice" hint appears anywhere; row has no click handler.

### Out of scope

- Status filter dropdown, Create Invoice button, search/date filter row — unchanged.
- Payments section rendering elsewhere — unchanged.
- Tab counter logic — unchanged.

