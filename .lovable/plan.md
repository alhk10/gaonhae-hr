
# Invoice Status Updates and Notes Field Removal

## Overview
This plan implements several changes to the invoice system:
1. **Replace "Draft" status with "Unpaid"** - Conceptually clearer for users
2. **Remove "Sent" status** - No longer needed in the workflow
3. **Apply color coding** - Paid (Green), Unpaid (Red)
4. **Capitalize "Paid" correctly** - Already implemented but needs consistency
5. **Remove "Notes (visible to customer)" field** - Only keep Internal Notes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/InvoiceManagementList.tsx` | Update status options, badge colors, remove notes field |
| `src/components/sales/ViewEditInvoiceDialog.tsx` | Update status dropdown, badge colors, remove notes section |
| `src/utils/invoicePDFGenerator.ts` | Add color coding for status text (green for Paid, red for Unpaid) |

---

## 1. Status Changes

### Status Mapping
| Old Status | New Status |
|------------|------------|
| draft | unpaid |
| sent | (removed) |
| paid | paid |
| overdue | overdue |
| cancelled | cancelled |

### Badge Color Coding
| Status | Color Style |
|--------|-------------|
| Paid | Green (`bg-green-100 text-green-800`) |
| Unpaid | Red (`bg-red-100 text-red-800`) |
| Overdue | Red (destructive) - existing |
| Cancelled | Gray (secondary) - existing |

---

## 2. InvoiceManagementList.tsx Changes

### Update `getStatusBadgeVariant()` function:
```typescript
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid': return 'default';      // Will use custom green
    case 'unpaid': return 'destructive'; // Will use custom red
    case 'overdue': return 'destructive';
    case 'cancelled': return 'secondary';
    default: return 'outline';
  }
};
```

### Add custom badge class function:
```typescript
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800 border-green-200';
    case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
    default: return '';
  }
};
```

### Update Status Filter Dropdown:
Remove "Draft" and "Sent", add "Unpaid":
```text
- All Statuses
- Unpaid     (replaces Draft)
- Paid
- Overdue
- Cancelled
```

---

## 3. ViewEditInvoiceDialog.tsx Changes

### Update Status Edit Dropdown:
```text
SelectContent:
  - Unpaid     (value="unpaid")
  - Paid       (value="paid")
  - Overdue    (value="overdue")
  - Cancelled  (value="cancelled")
```

### Update Badge Styling:
Apply same color logic as list view:
- Paid = Green badge
- Unpaid = Red badge

### Remove Notes Field:
Delete the entire section for "Notes (visible to customer)" from both view and edit modes. Keep only "Internal Notes".

**Before:**
```text
| Notes (visible to customer) |
| [textarea or display]       |
|                             |
| Internal Notes              |
| [textarea or display]       |
```

**After:**
```text
| Internal Notes              |
| [textarea or display]       |
```

---

## 4. PDF Generator Changes

### Update Status Text Coloring:
In `invoicePDFGenerator.ts`, add color to the status text:

```typescript
// Before drawing status text
if (invoice.status === 'paid') {
  doc.setTextColor(34, 139, 34); // Forest green
} else if (invoice.status === 'unpaid') {
  doc.setTextColor(220, 53, 69);  // Red
}

// Draw status text
doc.text(statusText, margin + 35, yPos);

// Reset color
doc.setTextColor(0, 0, 0);
```

### Map Draft to Unpaid in Display:
Since existing data may have 'draft' status, map it to display as "Unpaid":
```typescript
let statusText = invoice.status || 'Unpaid';
if (statusText === 'draft') statusText = 'unpaid';
statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
```

---

## 5. Summary of UI Changes

### Invoice List View
- Status badge: Paid (green), Unpaid (red), Overdue (red), Cancelled (gray)
- Filter dropdown: Unpaid, Paid, Overdue, Cancelled

### Invoice View/Edit Dialog
- Status badge in header: Colored appropriately
- Status dropdown in edit mode: Unpaid, Paid, Overdue, Cancelled options
- Notes field: Removed entirely
- Internal Notes: Remains unchanged

### Invoice PDF
- Status text "Paid" in green color
- Status text "Unpaid" in red color
- "Draft" displays as "Unpaid"

---

## Database Consideration
The existing `draft` values in the database will continue to work. The UI will:
- Display "draft" as "Unpaid"
- When editing, selecting "Unpaid" will save as "unpaid"

No database migration is required - this is a display-layer change only.
