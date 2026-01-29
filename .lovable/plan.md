
# Plan: Add Change Log for Invoices

## Overview
Implement a comprehensive change log system for invoices that tracks all modifications including status changes, payment updates, item modifications, and field edits. The change log will be displayed in a dialog accessible from the invoice list and will show a chronological history of all changes made to an invoice.

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| **New database table** | Create `invoice_change_logs` table to store change history |
| **New service functions** | Add functions to create and retrieve change log entries |
| **Update existing functions** | Modify invoice service functions to log changes when updates occur |
| **New UI component** | Create `InvoiceChangeLogDialog` to display the change history |
| **Update invoice list** | Add a "History" button to the invoice actions column |
| **RLS policies** | Add appropriate security policies for the change log table |

---

## Implementation Details

### 1. Database Schema

Create a new `invoice_change_logs` table following the pattern established by `security_audit_log` and `student_grading_history`:

```sql
CREATE TABLE public.invoice_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changes JSONB,
    changed_by TEXT,
    changed_by_email TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by invoice
CREATE INDEX idx_invoice_change_logs_invoice_id ON public.invoice_change_logs(invoice_id);
CREATE INDEX idx_invoice_change_logs_created_at ON public.invoice_change_logs(created_at DESC);
```

**Action Types:**
- `created` - Invoice was created
- `status_changed` - Status was modified
- `payment_added` - Payment was recorded
- `payment_removed` - Payment was deleted
- `item_added` - Line item was added
- `item_removed` - Line item was deleted
- `item_updated` - Line item was modified
- `field_updated` - Other invoice fields were modified (notes, due_date, etc.)
- `deleted` - Invoice was deleted (soft log before deletion)

### 2. RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.invoice_change_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all change logs
CREATE POLICY "superadmin_manage_invoice_change_logs" ON public.invoice_change_logs
FOR ALL USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- Students can view change logs for their own invoices
CREATE POLICY "students_view_own_invoice_change_logs" ON public.invoice_change_logs
FOR SELECT USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE student_id IN (
            SELECT id FROM students WHERE email = auth.email()
        )
    )
);

-- Insert policy for any authenticated user (logs are created programmatically)
CREATE POLICY "authenticated_insert_invoice_change_logs" ON public.invoice_change_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 3. Service Layer Updates

**New file: `src/services/invoiceChangeLogService.ts`**

```typescript
export interface InvoiceChangeLog {
  id: string;
  invoice_id: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, any>;
  changed_by?: string;
  changed_by_email?: string;
  created_at: string;
}

// Log a change to an invoice
export const logInvoiceChange = async (params: {
  invoice_id: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, any>;
}): Promise<void>

// Get change logs for an invoice
export const getInvoiceChangeLogs = async (
  invoiceId: string
): Promise<InvoiceChangeLog[]>
```

**Update `src/services/invoiceService.ts`:**

- Import and use `logInvoiceChange` in:
  - `createInvoice()` - Log "created" action
  - `updateInvoiceStatus()` - Log "status_changed" with old/new values
  - `deleteInvoice()` - Log "deleted" action before deletion

**Update `src/services/paymentService.ts`:**

- Log "payment_added" when a payment is created
- Log "payment_removed" when a payment is deleted

### 4. UI Component

**New file: `src/components/sales/InvoiceChangeLogDialog.tsx`**

A dialog component that displays the change history in a timeline format:

```text
+-----------------------------------------------+
|  Invoice Change Log - INV-2025-00001          |
|-----------------------------------------------|
|  Timeline                                     |
|                                               |
|  ● Jan 29, 2025 10:30 AM                      |
|    Status changed from "draft" to "sent"     |
|    by John Doe                                |
|                                               |
|  ● Jan 28, 2025 3:15 PM                       |
|    Payment of $500.00 added                   |
|    by Jane Smith                              |
|                                               |
|  ● Jan 27, 2025 9:00 AM                       |
|    Invoice created                            |
|    by John Doe                                |
|                                               |
|                              [Close]          |
+-----------------------------------------------+
```

**Features:**
- Chronological timeline view (newest first)
- Color-coded action types (green for payments, blue for status, etc.)
- User attribution for each change
- Timestamps formatted in local timezone
- Collapsible detail sections for complex changes (like item modifications)
- Loading state with skeleton
- Empty state when no logs exist

### 5. Integration with Invoice List

**Update `src/components/sales/InvoiceManagementList.tsx`:**

Add a "History" button in the actions column:

```tsx
import { History } from 'lucide-react';
import InvoiceChangeLogDialog from './InvoiceChangeLogDialog';

// In the actions column
<InvoiceChangeLogDialog
  invoiceId={invoice.id}
  invoiceNumber={invoice.invoice_number}
  trigger={
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title="View History"
    >
      <History className="h-4 w-4" />
    </Button>
  }
/>
```

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `src/services/invoiceChangeLogService.ts` | Service for managing invoice change logs |
| `src/components/sales/InvoiceChangeLogDialog.tsx` | Dialog component for displaying change history |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/invoiceService.ts` | Add change logging to create, update, and delete functions |
| `src/services/paymentService.ts` | Add change logging for payment operations |
| `src/components/sales/InvoiceManagementList.tsx` | Add History button to actions column |

### Database Migration
| Change | Description |
|--------|-------------|
| New table | `invoice_change_logs` with proper indexes |
| RLS policies | Superadmin full access, students view own, authenticated insert |

---

## Technical Considerations

1. **Performance**: Indexes on `invoice_id` and `created_at` ensure fast lookups
2. **Data Retention**: Change logs are cascaded on invoice deletion to maintain referential integrity
3. **Audit Trail**: The `changed_by_email` field is populated from `auth.email()` for accountability
4. **JSONB for Complex Changes**: The `changes` field stores structured data for complex modifications (like item updates with multiple field changes)
5. **RLS Security**: Follows existing patterns - superadmins have full access, students can only see their own invoice logs

---

## Testing Checklist

- [ ] Change log table is created with correct schema
- [ ] RLS policies allow appropriate access levels
- [ ] Invoice creation logs "created" action
- [ ] Status changes log old and new values
- [ ] Payment additions/removals are logged
- [ ] Change log dialog displays entries in chronological order
- [ ] History button appears in invoice list actions
- [ ] Empty state shows when no logs exist
- [ ] Loading state displays while fetching logs
