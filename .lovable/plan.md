

# Plan: Update CreateInvoiceDialog Layout and Functionality

## Overview
Restructure the CreateInvoiceDialog to improve the layout and add category-based filtering with smart quantity defaults based on branch country.

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| **Branch field position** | Move Branch field to left of Student field |
| **Remove Payment Terms** | Remove the payment_terms_days field from the form |
| **Move Notes fields** | Relocate Notes and Internal Notes fields after the Add Items section |
| **Add horizontal separator** | Add a Separator component after the Notes field |
| **Add Category dropdown** | Add category filter dropdown to the left of Product selector in Add Items section |
| **Default quantity logic** | Auto-set quantity to 12 for Singapore branches, 10 for Australia branches when "Classes" category is selected |
| **Variant selection** | Replace "Size (optional)" text input with Size and Color dropdown selects populated from product's `available_variants` |

---

## Implementation Details

### 1. Update Field Order in Invoice Details Section

**Current order:**
```
[Student] [Branch] [Payment Terms]
[Notes]
[Internal Notes]
```

**New order:**
```
[Branch] [Student]
```

Remove payment terms row entirely.

### 2. Move Notes Fields After Add Items Section

The Notes and Internal Notes fields will be moved after the "Add Items" card section, followed by a horizontal separator line.

**New structure:**
```
Invoice Details (Branch, Student)
Add Items Section
Invoice Items Table
Notes Field
Internal Notes Field
───────────────────── (Separator)
Totals Section
Footer Buttons
```

### 3. Add Category Dropdown to Add Items

Add a category filter dropdown that:
- Filters the products dropdown based on selected category
- Uses the existing `getProductCategories()` from productService
- Positioned to the left of the Product selector

**Layout change in Add Items card:**
```
Current: [Product] [Quantity] [Unit Price] [Size] [Add]
New:     [Category] [Product] [Quantity] [Price] [Size] [Color] [Add]
```

### 4. Smart Quantity Defaults

When a category is selected:
- If category name is "Classes" AND branch country is "Singapore" → set quantity to 12
- If category name is "Classes" AND branch country is "Australia" → set quantity to 10
- Otherwise, keep quantity at 1

### 5. Replace Size Text Input with Variant Dropdowns

Replace the free-text "Size (optional)" input with two conditional Select dropdowns:
- **Size dropdown**: Only visible when selected product has `available_variants.sizes`
- **Color dropdown**: Only visible when selected product has `available_variants.colors`

Both dropdowns will populate from the selected product's variant options.

### 6. Update Invoice Item Interface

```typescript
interface InvoiceItem {
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  size_variant?: string;
  color_variant?: string;  // Add color variant
  total: number;
}
```

---

## File Changes

### `src/components/sales/CreateInvoiceDialog.tsx`

#### State Changes
- Add `categories` state for category list
- Add `selectedCategory` state for filtering
- Add `loadCategories()` function using `getProductCategories()`
- Update `newItem` state to include `color_variant`
- Update `InvoiceItem` interface to include `color_variant`

#### Form Data Changes
- Remove `payment_terms_days` from `formData` state
- Keep notes and internal_notes but move their JSX position
- Set `payment_terms_days` to a default value (30) in submit without form input

#### New Item Changes
```typescript
const [newItem, setNewItem] = useState({
  product_id: '',
  category_id: '',  // Add category filter
  quantity: 1,
  unit_price: 0,
  size_variant: '',
  color_variant: ''  // Add color variant
});
```

#### Product Loading Changes
- Filter products by selected category when loading/displaying

#### Quantity Auto-Set Logic
```typescript
const handleCategoryChange = (categoryId: string) => {
  setNewItem(prev => {
    const category = categories.find(c => c.id === categoryId);
    const selectedBranch = branches.find(b => b.id === formData.branch_id);
    
    let defaultQuantity = 1;
    if (category?.name === 'Classes') {
      if (selectedBranch?.country === 'Singapore') {
        defaultQuantity = 12;
      } else if (selectedBranch?.country === 'Australia') {
        defaultQuantity = 10;
      }
    }
    
    return {
      ...prev,
      category_id: categoryId,
      product_id: '',  // Reset product when category changes
      quantity: defaultQuantity,
      unit_price: 0
    };
  });
};
```

#### Variant Selection Logic
When product is selected, check for available_variants:
```typescript
// Get selected product's variants for dropdown options
const selectedProduct = products.find(p => p.id === newItem.product_id);
const sizeOptions = selectedProduct?.available_variants?.sizes || [];
const colorOptions = selectedProduct?.available_variants?.colors || [];
```

#### Import Changes
- Add `Separator` import from `@/components/ui/separator`
- Add `getProductCategories` import from `@/services/productService`

---

## Updated JSX Structure

```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Invoice Details - Branch first, then Student */}
  <div className="space-y-4">
    <h3>Invoice Details</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>Branch *</div>   {/* Moved to first */}
      <div>Student *</div>  {/* Moved to second */}
    </div>
    {/* Payment terms removed */}
  </div>

  {/* Add Items Section */}
  <div className="space-y-4">
    <h3>Add Items</h3>
    <Card>
      <CardContent>
        <div className="grid grid-cols-7 gap-4">
          <div>Category</div>      {/* New */}
          <div>Product *</div>
          <div>Quantity</div>
          <div>Unit Price</div>
          <div>Size</div>          {/* Conditional dropdown */}
          <div>Color</div>         {/* New conditional dropdown */}
          <div>Add Button</div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Items List */}
  {items.length > 0 && (
    <div>Invoice Items Table</div>
  )}

  {/* Notes Section - Moved here */}
  <div className="space-y-4">
    <div>Notes</div>
    <div>Internal Notes</div>
  </div>

  <Separator />

  {/* Totals Section */}
  {items.length > 0 && (
    <div>Totals</div>
  )}

  <DialogFooter />
</form>
```

---

## Items Table Updates

Update the table to show both Size and Color columns:
```
| Product | Quantity | Unit Price | Size | Color | Total | Actions |
```

---

## Testing Checklist

- [ ] Branch field appears before Student field
- [ ] Payment terms field is removed from UI
- [ ] Category dropdown filters products correctly
- [ ] Quantity auto-sets to 12 for Singapore branches with Classes category
- [ ] Quantity auto-sets to 10 for Australia branches with Classes category
- [ ] Size dropdown shows product's available sizes (or hides if none)
- [ ] Color dropdown shows product's available colors (or hides if none)
- [ ] Notes and Internal Notes appear after Add Items section
- [ ] Horizontal separator appears after notes
- [ ] Invoice creation still works correctly
- [ ] Invoice items correctly store size and color variants

