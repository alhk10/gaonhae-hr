

# Plan: Filter Products by Student Belt Level

## Overview
Filter the product dropdown in the Create Invoice dialog to only show products that match the selected student's current belt level. Products with belt level requirements will only appear if the student's belt falls within the product's min/max belt range.

---

## Current State Analysis

### Data Structures
- **Students**: Store `current_belt` in lowercase-hyphenated format (e.g., "green-tip", "foundation-1")
- **Products**: Have three belt-related fields:
  - `requires_belt_level` (boolean): Whether the product has belt restrictions
  - `min_belt_level` (text): Minimum belt required (e.g., "Foundation 1", "Green Tip")
  - `max_belt_level` (text): Maximum belt allowed

### Belt Progression Order
```text
Foundation 1 → Foundation 2 → Foundation 3 → White → Yellow Tip → Yellow → 
Green Tip → Green → Blue Tip → Blue → Red Tip → Red → Black Tip → Poom 1 → Poom 2 → Poom 3 → Poom 4 →  Dan 1 → Dan 2 → Dan 3 → Dan 4 → Dan 5

Poom 1, Poom 2, Poom 3, Poom 4 are for students below age 15. Once they turn 15 they will be Dan 1, Dan 2, Dan 3, Dan 4 respectively.
```

---

## Changes Required

### 1. Extend ProductWithVariants Interface
Add belt level fields to the `ProductWithVariants` interface in CreateInvoiceDialog:

```typescript
interface ProductWithVariants {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  category_id?: string;
  available_variants?: {
    sizes?: string[];
    colors?: string[];
  };
  // Add these new fields:
  requires_belt_level?: boolean;
  min_belt_level?: string;
  max_belt_level?: string;
}
```

### 2. Update loadProducts Function
Include belt level fields when loading products:

```typescript
setProducts(response.products.map(p => ({ 
  id: p.id, 
  name: p.name, 
  sku: p.sku,
  base_price: p.base_price,
  category_id: p.category_id,
  available_variants: p.available_variants,
  requires_belt_level: p.requires_belt_level,
  min_belt_level: p.min_belt_level,
  max_belt_level: p.max_belt_level
})));
```

### 3. Store Selected Student's Belt Level
Update student loading to include `current_belt` and track selected student:

```typescript
// Update students state type
const [students, setStudents] = useState<Array<{
  id: string, 
  name: string, 
  email: string, 
  branch_id?: string, 
  status?: string,
  current_belt?: string  // Add this
}>>([]);

// Update loadStudents to include current_belt
setStudents(response.students.map(s => ({ 
  id: s.id, 
  name: `${s.first_name} ${s.last_name}`, 
  email: s.email || '',
  branch_id: s.branch_id,
  status: s.status,
  current_belt: s.current_belt  // Add this
})));
```

### 4. Add Belt Level Comparison Helper
Create a utility function to compare belt levels:

```typescript
const BELT_LEVELS = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4'
];

// Normalize belt format: "green-tip" → "Green Tip"
const normalizeBelt = (belt: string): string => {
  if (!belt) return '';
  return belt.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get belt index for comparison
const getBeltIndex = (belt: string): number => {
  const normalized = normalizeBelt(belt);
  return BELT_LEVELS.indexOf(normalized);
};

// Check if student belt is within product's belt range
const isProductAvailableForBelt = (
  product: ProductWithVariants, 
  studentBelt: string
): boolean => {
  // If product doesn't require belt level, it's available to all
  if (!product.requires_belt_level) return true;
  
  const studentIndex = getBeltIndex(studentBelt);
  if (studentIndex === -1) return true; // Unknown belt, allow all
  
  const minIndex = product.min_belt_level 
    ? getBeltIndex(product.min_belt_level) 
    : 0;
  const maxIndex = product.max_belt_level 
    ? getBeltIndex(product.max_belt_level) 
    : BELT_LEVELS.length - 1;
  
  return studentIndex >= minIndex && studentIndex <= maxIndex;
};
```

### 5. Update Filtered Products Logic
Modify the `filteredProducts` computation to include belt filtering:

```typescript
// Get selected student's belt
const selectedStudent = students.find(s => s.id === formData.student_id);
const studentBelt = selectedStudent?.current_belt || '';

// Filter products by category AND belt level
const filteredProducts = products.filter(p => {
  // First filter by category if selected
  const matchesCategory = !newItem.category_id || p.category_id === newItem.category_id;
  
  // Then filter by student belt level
  const matchesBelt = isProductAvailableForBelt(p, studentBelt);
  
  return matchesCategory && matchesBelt;
});
```

---

## Filtering Logic Summary

| Scenario | Product Shows? |
|----------|----------------|
| Product has `requires_belt_level = false` | Yes (available to all) |
| Student belt within product's min-max range | Yes |
| Student belt below product's min level | No |
| Student belt above product's max level | No |
| No student selected | Yes (show all products) |
| Student has unknown/empty belt | Yes (show all products) |

---

## Example Filtering

**Student**: Current belt = "green-tip" (index 6)

| Product | Min Belt | Max Belt | Visible? |
|---------|----------|----------|----------|
| Foundation 1 >> Foundation 2 | Foundation 1 (0) | Foundation 1 (0) | No |
| Green Tip >> Green | Green Tip (6) | Green Tip (6) | Yes |
| Green >> Blue Tip | Green (7) | Green (7) | No |
| 4x Weekend (no belt req) | - | - | Yes |

---

## File to Modify
- `src/components/sales/CreateInvoiceDialog.tsx`

## Implementation Steps
1. Add BELT_LEVELS constant and helper functions
2. Extend ProductWithVariants interface with belt fields
3. Update students state type to include current_belt
4. Update loadStudents to fetch current_belt
5. Update loadProducts to include belt level fields
6. Update filteredProducts computation with belt filtering

