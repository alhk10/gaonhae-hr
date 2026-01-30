
# Plan: Refine CreateInvoiceDialog Layout

## Overview
This plan addresses three UI improvements to the Create Invoice dialog to streamline the interface and improve user experience.

## Changes Required

### 1. Remove Email from Student Dropdown
**Current:** Student dropdown shows `{student.name} ({student.email})`
**Change:** Show only `{student.name}`

**Location:** Line 632-633 in the student Select dropdown

---

### 2. Replace "Add Items" Section with a + Button in Invoice Items Header
**Current:** There's a separate card section called "Add Items" with all the input fields for adding new items

**Change:** 
- Remove the standalone "Add Items" card section (lines 642-785)
- Add a collapsible "add item row" inside the Invoice Items section
- Add a `+` button in the "Invoice Items" section header that shows/hides the add item inputs
- The add item form fields will appear inline within the Invoice Items section when the + button is clicked

**New Layout:**
```
Invoice Items                     [+ Add]
┌─────────────────────────────────────────┐
│ [Add item row - shown when + clicked]   │
├─────────────────────────────────────────┤
│ Product | Term | Qty | Price | Total    │
│ Item 1  | ...  | ... | ...   | ...      │
│ Item 2  | ...  | ... | ...   | ...      │
└─────────────────────────────────────────┘
Subtotal: $XX.XX
Tax (X%): $XX.XX
Total: $XX.XX
```

---

### 3. Move Subtotal, Tax, and Total After Invoice Items Section
**Current:** 
- A "Subtotal" appears after the items table (lines 850-858)
- Another set of Subtotal, Tax, and Total appears after the Notes section (lines 889-906)

**Change:**
- Remove the duplicate Subtotal after the items table
- Keep the full totals section (Subtotal, Tax, Total) but move it immediately after the Invoice Items section, before the Notes section

---

## Technical Implementation

### File: `src/components/sales/CreateInvoiceDialog.tsx`

1. **Line 633** - Remove email from student display:
   ```tsx
   {student.name}  // Remove: ({student.email})
   ```

2. **Add state for showing/hiding add item form:**
   ```tsx
   const [showAddItem, setShowAddItem] = useState(false);
   ```

3. **Restructure JSX layout:**
   - Remove the "Add Items" section header and Card wrapper
   - Move the add item form inputs into the "Invoice Items" section
   - Add a + button in the Invoice Items header
   - Show add item form conditionally based on `showAddItem` state
   - Move totals section (Subtotal, Tax, Total) directly after the items table
   - Remove duplicate subtotal display

4. **New Invoice Items section structure:**
   ```tsx
   <div className="space-y-4">
     <div className="flex items-center justify-between">
       <h3 className="text-lg font-medium">Invoice Items</h3>
       <Button 
         type="button" 
         variant="outline" 
         size="sm"
         onClick={() => setShowAddItem(!showAddItem)}
       >
         <Plus className="w-4 h-4 mr-1" />
         Add Item
       </Button>
     </div>
     
     {/* Collapsible Add Item Form */}
     {showAddItem && (
       <Card className="border-dashed">
         {/* Add item form fields here */}
       </Card>
     )}
     
     {/* Items Table */}
     {items.length > 0 && (
       <Table>...</Table>
     )}
     
     {/* Totals - moved here from after Notes */}
     {items.length > 0 && (
       <div className="flex justify-end">
         <div className="w-64 space-y-2">
           <div className="flex justify-between">
             <span>Subtotal:</span>
             <span>${subtotal.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-muted-foreground">
             <span>Tax ({taxRate}%):</span>
             <span>${taxAmount.toFixed(2)}</span>
           </div>
           <div className="flex justify-between font-bold text-lg border-t pt-2">
             <span>Total:</span>
             <span>${total.toFixed(2)}</span>
           </div>
         </div>
       </div>
     )}
   </div>
   ```

---

## Summary of Changes
| Change | Before | After |
|--------|--------|-------|
| Student dropdown | Name (email) | Name only |
| Add Items section | Separate card above items | + button in Items header, collapsible form |
| Subtotal display | Duplicate (after items + after notes) | Single display after items |
| Totals location | After Notes section | After Invoice Items section |

All existing functionality (add item, remove item, edit quantity/price, term selection, validation) will remain intact.
