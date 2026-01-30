

# Plan: Add Grading Invoice Validation

## Overview
Add two validation rules when creating an invoice:
1. **Duplicate check**: Prevent creating an invoice with a grading product if the same student already has an invoice with the same grading product in the last 60 days
2. **Single grading per invoice**: Only allow 1 grading product per invoice

## Current Behavior
- No validation for duplicate grading invoices for the same student
- Multiple grading products can be added to a single invoice

## Proposed Behavior
1. When clicking "Create Invoice" button, check if any grading item in the invoice already exists for the same student within the last 60 days
2. When adding an item, validate that only 1 grading product can exist per invoice

## Technical Details

### Identifying Grading Products
- The "Grading Fees" category has ID: `31514844-78dc-43f2-bf07-41d124d175e2`
- Products in this category include belt progression items like "Green Tip >> Green", "Yellow >> Green Tip", etc.
- The grading_slot_id is stored in invoice_items.metadata as `{ grading_slot_id: "uuid" }`

### Database Query for Duplicate Check
To find existing grading invoices for a student in the last 60 days:

```sql
SELECT ii.product_id, p.name, i.created_at
FROM invoice_items ii
JOIN products p ON ii.product_id = p.id
JOIN invoices i ON ii.invoice_id = i.id
WHERE i.student_id = 'student_uuid'
  AND p.category_id = '31514844-78dc-43f2-bf07-41d124d175e2'
  AND i.created_at >= NOW() - INTERVAL '60 days'
  AND i.status != 'cancelled'
```

## Implementation

### File: `src/components/sales/CreateInvoiceDialog.tsx`

### Change 1: Add validation function for checking existing grading invoices (after line 230)

Add a new async function to check for existing grading invoices:

```typescript
const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';
const GRADING_DUPLICATE_CHECK_DAYS = 60;

const checkExistingGradingInvoice = async (
  studentId: string, 
  productId: string
): Promise<{ exists: boolean; productName?: string; createdAt?: string }> => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - GRADING_DUPLICATE_CHECK_DAYS);
  
  const { data, error } = await supabase
    .from('invoice_items')
    .select(`
      product_id,
      products!inner(name, category_id),
      invoices!inner(student_id, created_at, status)
    `)
    .eq('product_id', productId)
    .eq('invoices.student_id', studentId)
    .neq('invoices.status', 'cancelled')
    .gte('invoices.created_at', sixtyDaysAgo.toISOString());
  
  if (error || !data || data.length === 0) {
    return { exists: false };
  }
  
  return { 
    exists: true, 
    productName: data[0].products?.name,
    createdAt: data[0].invoices?.created_at
  };
};
```

### Change 2: Add single grading product validation in addItem function (around line 629)

Before adding an item, check if it's a grading product and if one already exists:

```typescript
const addItem = () => {
  if (!newItem.product_id) {
    toast.error('Please select a product');
    return;
  }

  const product = products.find(p => p.id === newItem.product_id);
  if (!product) {
    toast.error('Product not found');
    return;
  }

  // Check if adding a grading product and one already exists in current items
  const isGradingProduct = product.category_id === GRADING_CATEGORY_ID;
  if (isGradingProduct) {
    const existingGradingItem = items.find(item => {
      const itemProduct = products.find(p => p.id === item.product_id);
      return itemProduct?.category_id === GRADING_CATEGORY_ID;
    });
    
    if (existingGradingItem) {
      toast.error('Only 1 grading product allowed per invoice. Please remove the existing grading item first.');
      return;
    }
  }

  // ... rest of existing validation and item creation
};
```

### Change 3: Add duplicate grading check in handleSubmit function (around line 248)

Before creating the invoice, check for duplicates in the last 60 days:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... existing validations ...

  if (items.length === 0) {
    toast.error('Please add at least one item');
    return;
  }

  setLoading(true);
  try {
    // Check for duplicate grading products in the last 60 days
    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (product?.category_id === GRADING_CATEGORY_ID) {
        const duplicateCheck = await checkExistingGradingInvoice(
          formData.student_id, 
          item.product_id
        );
        
        if (duplicateCheck.exists) {
          const date = duplicateCheck.createdAt 
            ? new Date(duplicateCheck.createdAt).toLocaleDateString() 
            : 'recently';
          toast.error(
            `This student already has an invoice for "${duplicateCheck.productName}" created on ${date}. Only 1 grading of the same type allowed per 60 days.`
          );
          setLoading(false);
          return;
        }
      }
    }

    // ... rest of existing invoice creation logic ...
  } catch (error) {
    // ... existing error handling ...
  }
};
```

## User Experience

| Scenario | Message Shown |
|----------|---------------|
| Adding 2nd grading item to invoice | "Only 1 grading product allowed per invoice. Please remove the existing grading item first." |
| Student already has same grading in last 60 days | "This student already has an invoice for 'Green Tip >> Green' created on 15/01/2026. Only 1 grading of the same type allowed per 60 days." |
| Valid grading submission | Invoice created successfully |

## Edge Cases Handled

| Edge Case | Behavior |
|-----------|----------|
| Cancelled invoices | Excluded from duplicate check (using `status != 'cancelled'`) |
| Different grading products | Allowed (e.g., "Yellow Tip >> Yellow" and "Yellow >> Green Tip" are different) |
| Same grading > 60 days ago | Allowed (time window check) |
| Non-grading products | No restrictions applied |

## Summary of Changes

1. Add `GRADING_CATEGORY_ID` constant
2. Add `checkExistingGradingInvoice` async validation function
3. Modify `addItem` to prevent multiple grading items per invoice
4. Modify `handleSubmit` to check for 60-day duplicate before creation

