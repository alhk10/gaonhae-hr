

# Plan: Add Term Tagging for Classes Category Items in Invoice Creation

## Overview
When adding invoice items from the "Classes" category, the system will automatically tag them with the appropriate term for the selected branch. The term selection logic follows these rules:
1. Auto-select the **current term** (based on today's date and branch)
2. If the current term already has a Classes invoice for this student, select the **next term**
3. If no next term is available, display an **error message**

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| **New state for terms** | Add state to track available terms for the selected branch |
| **Add term_id to newItem** | Track the selected term when adding class items |
| **Term dropdown** | Add a Term dropdown field (visible only for Classes category) |
| **Auto-term selection logic** | Auto-select current term, or next term if already invoiced |
| **Check existing invoices** | Query invoice_items to check if student already has class invoices for a term |
| **Store term in metadata** | Include term_id in invoice_item metadata when creating invoice |
| **Error handling** | Show error toast if no available term exists |

---

## Implementation Details

### 1. Add New State Variables

```typescript
import { getTerms, getCurrentTerm, Term } from '@/services/termCalendarService';

// Add to component state
const [branchTerms, setBranchTerms] = useState<Term[]>([]);
const [termLoading, setTermLoading] = useState(false);
const [termError, setTermError] = useState<string | null>(null);
```

### 2. Update newItem State

```typescript
const [newItem, setNewItem] = useState({
  product_id: '',
  category_id: '',
  quantity: 1,
  unit_price: 0,
  size_variant: '',
  color_variant: '',
  term_id: ''  // NEW: track selected term for class items
});
```

### 3. Load Terms When Branch Changes

When a branch is selected, load the active/upcoming terms for that branch:

```typescript
const loadBranchTerms = async (branchId: string) => {
  if (!branchId) {
    setBranchTerms([]);
    return;
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('term_calendars')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .gte('end_date', today)
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    setBranchTerms(data || []);
  } catch (error) {
    console.error('Error loading terms:', error);
    setBranchTerms([]);
  }
};
```

Call this when branch changes:
```typescript
// In handleInputChange for branch_id
if (field === 'branch_id') {
  loadBranchTerms(value);
}
```

### 4. Check Existing Invoices for Student + Term

Create a function to check if the student already has a class invoice for a specific term:

```typescript
const checkExistingClassInvoice = async (
  studentId: string, 
  termId: string
): Promise<boolean> => {
  if (!studentId || !termId) return false;
  
  try {
    // Get invoices for this student
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id')
      .eq('student_id', studentId);
    
    if (invError || !invoices?.length) return false;
    
    const invoiceIds = invoices.map(i => i.id);
    
    // Check if any invoice items have this term in metadata and are class products
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        id,
        metadata,
        product_id,
        products!inner(category_id, product_categories!inner(name))
      `)
      .in('invoice_id', invoiceIds)
      .eq('products.product_categories.name', 'Classes');
    
    if (itemsError) return false;
    
    // Check metadata for term_id match
    return (items || []).some(item => 
      item.metadata?.term_id === termId
    );
  } catch (error) {
    console.error('Error checking existing invoice:', error);
    return false;
  }
};
```

### 5. Auto-Select Term When Classes Category Selected

Update `handleCategoryChange` to auto-select the appropriate term:

```typescript
const handleCategoryChange = async (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId);
  const selectedBranch = branches.find(b => b.id === formData.branch_id);
  
  let defaultQuantity = 1;
  let selectedTermId = '';
  
  setTermError(null);
  
  if (category?.name === 'Classes') {
    // Set quantity defaults
    if (selectedBranch?.country === 'Singapore') {
      defaultQuantity = 12;
    } else if (selectedBranch?.country === 'Australia') {
      defaultQuantity = 10;
    }
    
    // Auto-select term
    if (formData.branch_id && formData.student_id) {
      setTermLoading(true);
      
      try {
        // Get current/upcoming terms for this branch
        const today = new Date().toISOString().split('T')[0];
        const availableTerms = branchTerms.filter(t => t.end_date >= today);
        
        if (availableTerms.length === 0) {
          setTermError('No active terms available for this branch');
        } else {
          // Find current term (today is within term dates)
          const currentTerm = availableTerms.find(t => 
            t.start_date <= today && t.end_date >= today
          );
          
          if (currentTerm) {
            // Check if current term already has class invoice for this student
            const hasExisting = await checkExistingClassInvoice(
              formData.student_id, 
              currentTerm.id
            );
            
            if (hasExisting) {
              // Find next term
              const nextTerm = availableTerms.find(t => 
                t.start_date > currentTerm.end_date
              );
              
              if (nextTerm) {
                selectedTermId = nextTerm.id;
              } else {
                setTermError('No next term available. Student already has classes invoiced for current term.');
              }
            } else {
              selectedTermId = currentTerm.id;
            }
          } else {
            // No current term - use first available future term
            selectedTermId = availableTerms[0].id;
          }
        }
      } catch (error) {
        console.error('Error auto-selecting term:', error);
      } finally {
        setTermLoading(false);
      }
    }
  }
  
  setNewItem(prev => ({
    ...prev,
    category_id: categoryId,
    product_id: '',
    quantity: defaultQuantity,
    unit_price: 0,
    size_variant: '',
    color_variant: '',
    term_id: selectedTermId
  }));
};
```

### 6. Add Term Dropdown UI

Add a Term selector that appears only when Classes category is selected:

```tsx
{/* Term Dropdown - Only for Classes category */}
{selectedCategory?.name === 'Classes' && branchTerms.length > 0 && (
  <div className="space-y-2">
    <Label>Term *</Label>
    <Select 
      value={newItem.term_id} 
      onValueChange={(value) => handleNewItemChange('term_id', value)}
      disabled={termLoading}
    >
      <SelectTrigger className={termError ? 'border-destructive' : ''}>
        <SelectValue placeholder={termLoading ? "Loading..." : "Select term"} />
      </SelectTrigger>
      <SelectContent>
        {branchTerms.map((term) => (
          <SelectItem key={term.id} value={term.id}>
            {term.name} ({term.start_date} to {term.end_date})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {termError && (
      <p className="text-sm text-destructive">{termError}</p>
    )}
  </div>
)}
```

### 7. Store Term in InvoiceItem Interface

Update the InvoiceItem interface:

```typescript
interface InvoiceItem {
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  size_variant?: string;
  color_variant?: string;
  term_id?: string;      // NEW: for class items
  term_name?: string;    // NEW: display name
  total: number;
}
```

### 8. Update addItem Function

When adding a class item, include the term:

```typescript
const addItem = () => {
  if (!newItem.product_id) {
    toast.error('Please select a product');
    return;
  }

  const product = products.find(p => p.id === newItem.product_id);
  const selectedCategory = categories.find(c => c.id === newItem.category_id);
  
  if (!product) {
    toast.error('Product not found');
    return;
  }
  
  // Validate term for Classes category
  if (selectedCategory?.name === 'Classes') {
    if (!newItem.term_id) {
      toast.error('Please select a term for class items');
      return;
    }
    if (termError) {
      toast.error(termError);
      return;
    }
  }

  const term = branchTerms.find(t => t.id === newItem.term_id);
  
  const item: InvoiceItem = {
    product_id: newItem.product_id,
    product_name: product.name,
    description: product.name,
    quantity: newItem.quantity,
    unit_price: newItem.unit_price,
    size_variant: newItem.size_variant || undefined,
    color_variant: newItem.color_variant || undefined,
    term_id: newItem.term_id || undefined,
    term_name: term?.name || undefined,
    total: newItem.quantity * newItem.unit_price
  };

  setItems([...items, item]);
  // Reset with term cleared
  setNewItem({
    product_id: '',
    category_id: newItem.category_id,
    quantity: 1,
    unit_price: 0,
    size_variant: '',
    color_variant: '',
    term_id: ''
  });
};
```

### 9. Update Invoice Service to Include Metadata

Update the `CreateInvoiceData` interface and `createInvoice` function in `invoiceService.ts`:

```typescript
// In CreateInvoiceData
items: Array<{
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  size_variant?: string;
  metadata?: Record<string, any>;  // NEW
}>;

// In createInvoice, when creating items:
const itemsToInsert = invoiceData.items.map(item => {
  const itemTotal = item.quantity * item.unit_price;
  const itemTaxAmount = itemTotal * taxRate;
  
  return {
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: taxRate,
    tax_amount: itemTaxAmount,
    total_amount: itemTotal + itemTaxAmount,
    size_variant: item.size_variant,
    metadata: item.metadata  // NEW: stores term_id
  };
});
```

### 10. Update handleSubmit in CreateInvoiceDialog

Pass term metadata when creating invoice:

```typescript
items: items.map(item => ({
  product_id: item.product_id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  size_variant: item.size_variant || undefined,
  metadata: item.term_id ? { term_id: item.term_id } : undefined
}))
```

### 11. Display Term in Items Table

Add a Term column to the invoice items table:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Product</TableHead>
    <TableHead>Term</TableHead>  {/* NEW */}
    <TableHead>Quantity</TableHead>
    <TableHead>Unit Price</TableHead>
    <TableHead>Size</TableHead>
    <TableHead>Color</TableHead>
    <TableHead>Total</TableHead>
    <TableHead className="w-12">Actions</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {items.map((item, index) => (
    <TableRow key={index}>
      <TableCell className="font-medium">{item.product_name}</TableCell>
      <TableCell>{item.term_name || '-'}</TableCell>  {/* NEW */}
      ...
    </TableRow>
  ))}
</TableBody>
```

---

## File Changes

### `src/components/sales/CreateInvoiceDialog.tsx`
- Add state for `branchTerms`, `termLoading`, `termError`
- Add `term_id` to `newItem` state
- Add `term_id` and `term_name` to `InvoiceItem` interface
- Create `loadBranchTerms()` function
- Create `checkExistingClassInvoice()` function
- Update `handleInputChange` to load terms when branch changes
- Update `handleCategoryChange` to auto-select term
- Add Term dropdown UI (conditional for Classes)
- Update `addItem()` to validate and include term
- Update `handleSubmit()` to pass term metadata
- Add Term column to items table
- Import `getTerms` from termCalendarService

### `src/services/invoiceService.ts`
- Update `CreateInvoiceData` interface to include optional `metadata` in items
- Update `createInvoice` to pass metadata to invoice_items

---

## Error Scenarios

| Scenario | Behavior |
|----------|----------|
| No branch selected | Term dropdown hidden |
| No student selected | Term auto-select skipped, manual selection required |
| No terms for branch | Error: "No active terms available for this branch" |
| Current term already invoiced, no next term | Error: "No next term available. Student already has classes invoiced for current term." |
| Term not selected for class item | Error toast when trying to add item |

---

## Testing Checklist

- [ ] Term dropdown appears only when Classes category is selected
- [ ] Terms are filtered to selected branch only
- [ ] Current term is auto-selected when available
- [ ] Next term is selected if current term already has class invoice for student
- [ ] Error displayed when no terms available
- [ ] Error displayed when current term invoiced and no next term
- [ ] Term is stored in invoice_item metadata upon creation
- [ ] Term column displays correctly in items table
- [ ] Items without terms (non-class) show "-" in Term column

