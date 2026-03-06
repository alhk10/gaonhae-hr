

## Plan: Fix Orphaned Entitlements When Invoices Are Deleted or Edited

### Problem
When an invoice is deleted (or items removed during editing), the associated `entitlements` records are **not** cleaned up. The `deleteInvoice` function in `invoiceService.ts` cleans up enrollments and scheduled classes but completely ignores entitlements. This causes orphaned entitlement records that inflate student session counts (e.g., Wei En showing 49 instead of 25).

### Changes

#### 1. `src/services/invoiceService.ts` — `deleteInvoice` function (~line 599)
After fetching `invoiceItems` and before deleting them, **deactivate entitlements** linked to those invoice items:

```typescript
// Deactivate entitlements linked to this invoice's items
if (invoiceItems && invoiceItems.length > 0) {
  const itemIds = invoiceItems.map(item => item.id);
  
  await supabase
    .from('entitlements')
    .update({ is_active: false, notes: 'Deactivated - source invoice deleted' })
    .in('source_id', itemIds)
    .eq('source_type', 'invoice_item');
}
```

This goes inside the existing `if (invoiceItems && invoiceItems.length > 0)` block, alongside the enrollment cleanup.

#### 2. `src/components/sales/ViewEditInvoiceDialog.tsx` — item deletion during edit (~line 325-331)
When invoice items are removed during editing, also deactivate their linked entitlements:

```typescript
// Before deleting removed items, deactivate their entitlements
if (removedItemIds.length > 0) {
  await supabase
    .from('entitlements')
    .update({ is_active: false, notes: 'Deactivated - invoice item removed' })
    .in('source_id', removedItemIds)
    .eq('source_type', 'invoice_item');
}
```

#### 3. Database: Clean up Wei En's orphaned entitlement
Run a migration to deactivate orphaned entitlements whose `source_id` no longer references a valid `invoice_items` row:

```sql
UPDATE entitlements
SET is_active = false, notes = 'Deactivated - orphaned (source invoice item missing)'
WHERE source_type = 'invoice_item'
  AND is_active = true
  AND source_id NOT IN (SELECT id::text FROM invoice_items);
```

### Scope
- **Modified**: `src/services/invoiceService.ts` (add entitlement cleanup to delete flow)
- **Modified**: `src/components/sales/ViewEditInvoiceDialog.tsx` (add entitlement cleanup to edit flow)
- **Migration**: One-time cleanup of existing orphaned entitlements

