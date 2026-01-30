
# Plan: Invoice Dialog Improvements & Grading Management System

## Overview
This plan addresses three distinct enhancements:
1. Remove SKU from product dropdown in Create Invoice dialog
2. Move "Add Item" form inline after the last row of items
3. Create a new Grading Management page with grading slot setup functionality

---

## Part 1: Remove SKU from Product Dropdown

### Current Behavior
The product dropdown shows: `{product.name} ({product.sku})`

### Change
Show only: `{product.name}`

### File to Modify
- `src/components/sales/CreateInvoiceDialog.tsx` (line 703)

---

## Part 2: Add Item Inline After Last Row

### Current Behavior
The "Add Item" form appears as a collapsible card **above** the items table, toggled by a button in the header.

### New Behavior
- Remove the collapsible card at the top
- Add a new row **at the bottom of the items table** for inline item entry
- The add item inputs (Category, Product, Quantity, Price, Size, Color, Term, Add button) will appear as table cells in a final row
- When there are no items, show the inline form row directly in an otherwise empty table
- Clicking "Add" will add the item and clear the inline form for the next item

### New Layout
```
Invoice Items
┌─────────────────────────────────────────────────────────────┐
│ Product     | Term    | Qty | Price  | Size | Color | Actions │
├─────────────────────────────────────────────────────────────┤
│ Item 1      | Term 1  | 12  | $100   | -    | -     | [🗑]    │
│ Item 2      | -       | 1   | $50    | M    | Red   | [🗑]    │
├─────────────────────────────────────────────────────────────┤
│ [Cat ▼] [Product ▼] [1] [$0] [Size ▼] [Color ▼] [Term ▼] [+Add] │  <-- Inline form
└─────────────────────────────────────────────────────────────┘
Subtotal: $XX.XX
Tax (X%): $XX.XX
Total: $XX.XX
```

### File to Modify
- `src/components/sales/CreateInvoiceDialog.tsx`

---

## Part 3: Grading Management System

### Concept
Gradings need to be scheduled as "slots" that students can be assigned to. This enables:
- Setting up grading examination dates, times, and locations
- Tagging grading fees (products) to specific grading slots
- Tracking which students are registered for which grading

### Database Schema

**New Table: `grading_slots`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| branch_id | TEXT | Branch where grading takes place |
| grading_date | DATE | Date of the grading examination |
| start_time | TIME | Start time |
| end_time | TIME | End time |
| location | TEXT | Specific location/venue |
| examiner_name | TEXT | Name of examiner |
| belt_levels | TEXT[] | Array of belt levels being examined |
| max_capacity | INTEGER | Maximum students allowed |
| status | TEXT | active, cancelled, completed |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

**New Table: `grading_registrations`**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| grading_slot_id | UUID | Reference to grading slot |
| student_id | UUID | Reference to student |
| invoice_item_id | UUID | Reference to invoice item (grading fee) |
| current_belt | TEXT | Student's current belt at registration |
| target_belt | TEXT | Belt they're testing for |
| result | TEXT | pass, fail, conditional_pass, null (pending) |
| certificate_issued | BOOLEAN | Whether certificate has been issued |
| notes | TEXT | Examiner notes |
| created_at | TIMESTAMP | Created timestamp |

### New Files

**Page: `src/pages/sales/GradingManagement.tsx`**
- List of upcoming and past grading slots
- Filters by branch, date range, status
- Cards or table view of grading slots
- Quick stats: upcoming gradings, students registered, completion rate

**Component: `src/components/sales/AddGradingSlotDialog.tsx`**
- Form to create new grading slot
- Fields: Branch, Date, Start/End Time, Location, Examiner, Belt Levels (multi-select), Capacity, Notes

**Component: `src/components/sales/EditGradingSlotDialog.tsx`**
- Form to edit existing grading slot
- Same fields as add dialog

**Component: `src/components/sales/GradingSlotDetails.tsx`**
- View slot details
- List of registered students
- Ability to mark results (pass/fail)
- Issue certificates

**Service: `src/services/gradingService.ts`**
- CRUD operations for grading slots
- Registration management
- Result recording

### Navigation Updates
- Add "Grading" menu item to sidebar under Sales module
- Route: `/sales/grading`

### Integration Points
- When creating an invoice with a grading fee product, optionally allow selection of a grading slot
- Student grading history will pull from both existing `student_grading_history` and new `grading_registrations` tables

---

## Technical Implementation Details

### Part 1 - SKU Removal
```tsx
// Line 703 in CreateInvoiceDialog.tsx
// Before:
{product.name} ({product.sku})

// After:
{product.name}
```

### Part 2 - Inline Add Item
The table structure will be modified to always show a final row with input fields:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Category</TableHead>
      <TableHead>Product</TableHead>
      <TableHead>Quantity</TableHead>
      <TableHead>Unit Price</TableHead>
      <TableHead>Size</TableHead>
      <TableHead>Color</TableHead>
      <TableHead>Term</TableHead>
      <TableHead>Total</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Existing items */}
    {items.map((item, index) => (
      <TableRow key={index}>...</TableRow>
    ))}
    
    {/* Inline add item row - always visible */}
    <TableRow className="bg-muted/30">
      <TableCell><Select>Category...</Select></TableCell>
      <TableCell><Select>Product...</Select></TableCell>
      <TableCell><Input type="number" /></TableCell>
      <TableCell><Input type="number" /></TableCell>
      <TableCell>{sizeOptions.length > 0 && <Select>...</Select>}</TableCell>
      <TableCell>{colorOptions.length > 0 && <Select>...</Select>}</TableCell>
      <TableCell>{isClasses && <Select>Term...</Select>}</TableCell>
      <TableCell>-</TableCell>
      <TableCell><Button>Add</Button></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Part 3 - Grading System Files

**Migration file structure:**
```sql
-- Create grading_slots table
CREATE TABLE public.grading_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  grading_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  examiner_name TEXT,
  belt_levels TEXT[],
  max_capacity INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create grading_registrations table
CREATE TABLE public.grading_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_slot_id UUID NOT NULL REFERENCES grading_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES invoice_items(id),
  current_belt TEXT NOT NULL,
  target_belt TEXT NOT NULL,
  result TEXT CHECK (result IN ('pass', 'fail', 'conditional_pass')),
  certificate_issued BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(grading_slot_id, student_id)
);

-- Enable RLS
ALTER TABLE grading_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read" ON grading_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON grading_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON grading_slots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON grading_slots FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON grading_registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON grading_registrations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON grading_registrations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON grading_registrations FOR DELETE TO authenticated USING (true);
```

---

## Files to Create/Modify Summary

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/components/sales/CreateInvoiceDialog.tsx` | Remove SKU, inline add item row |
| Create | `src/pages/sales/GradingManagement.tsx` | Main grading management page |
| Create | `src/components/sales/AddGradingSlotDialog.tsx` | Dialog to create grading slots |
| Create | `src/components/sales/EditGradingSlotDialog.tsx` | Dialog to edit grading slots |
| Create | `src/components/sales/GradingSlotCard.tsx` | Card component for slot display |
| Create | `src/services/gradingService.ts` | Service for grading CRUD operations |
| Create | Migration file | Database schema for grading tables |
| Modify | `src/App.tsx` | Add route for `/sales/grading` |
| Modify | `src/components/layout/Sidebar.tsx` | Add "Grading" menu item |
| Modify | `src/integrations/supabase/types.ts` | Updated with new table types |

---

## Execution Order
1. Create database migration for grading tables
2. Update Supabase types
3. Modify CreateInvoiceDialog (SKU removal + inline add item)
4. Create grading service
5. Create grading UI components
6. Create GradingManagement page
7. Update routing and navigation
