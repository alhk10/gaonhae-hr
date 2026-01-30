
# Plan: Tag Grading Products to Grading Slots

## Overview
When a user selects a product from the "Grading Fees" category during invoice creation, display a dropdown to select an available grading slot. This links the invoice item to a specific grading examination session.

---

## Current Flow
1. User selects "Grading Fees" category
2. User selects product (e.g., "Green Tip >> Green")
3. Product is added to invoice

## New Flow
1. User selects "Grading Fees" category
2. User selects product (e.g., "Green Tip >> Green")
3. **NEW:** User selects grading slot from dropdown
4. Product is added to invoice with grading_slot_id in metadata

---

## Implementation Details

### 1. CreateInvoiceDialog.tsx

**Add State for Grading Slots:**
```typescript
const [gradingSlots, setGradingSlots] = useState<GradingSlot[]>([]);
```

**Add grading_slot_id to newItem state:**
```typescript
const [newItem, setNewItem] = useState({
  // ... existing fields
  grading_slot_id: ''
});
```

**Load Grading Slots:**
- Fetch active grading slots when dialog opens
- Filter by selected branch and student's current belt level

**Grading Slot Filtering Logic:**
- Filter slots by selected branch_id
- Filter slots by status = 'active'
- Filter slots where grading_date is in the future
- Filter slots by belt_levels matching the student's current belt

**Add Grading Slot Dropdown:**
Replace the "Term" column with conditional logic:
- For "Classes" category: Show Term dropdown (existing)
- For "Grading Fees" category: Show Grading Slot dropdown
- For other categories: Show "-"

**Update addItem function:**
Store grading_slot_id in metadata when adding Grading Fees items

**Update InvoiceItem interface:**
```typescript
interface InvoiceItem {
  // ... existing fields
  grading_slot_id?: string;
  grading_slot_title?: string;
}
```

---

### 2. UI Layout Changes

The "Term" column will become a dynamic column that shows:
- Term dropdown for "Classes" category
- Grading Slot dropdown for "Grading Fees" category
- "-" for other categories

**Grading Slot Dropdown Display:**
- Show slot title (e.g., "Morley - 11 Apr 2026 - 08:00 - Green Tip")
- Filter to only show slots matching the student's branch and available capacity

---

### 3. Data Flow

**When adding a Grading Fees item:**
```typescript
const item: InvoiceItem = {
  // ... existing fields
  grading_slot_id: newItem.grading_slot_id || undefined,
  grading_slot_title: selectedSlot?.title || undefined,
  // In metadata for backend storage:
  metadata: { grading_slot_id: newItem.grading_slot_id }
};
```

---

### 4. Grading Slot Service Integration

**Import from gradingService:**
```typescript
import { getGradingSlots, type GradingSlot } from '@/services/gradingService';
```

**Load slots on dialog open:**
```typescript
const loadGradingSlots = async () => {
  const slots = await getGradingSlots({ 
    status: 'active',
    from_date: new Date().toISOString().split('T')[0]
  });
  setGradingSlots(slots);
};
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/sales/CreateInvoiceDialog.tsx` | Add grading slot state, load slots, add dropdown for Grading Fees category, store in metadata |

---

## UI Preview

**Invoice Items Row for Grading Fees:**
```
| Category     | Product              | Qty | Price | Size | Color | Slot                              | Total | Actions |
|--------------|----------------------|-----|-------|------|-------|-----------------------------------|-------|---------|
| Grading Fees | Green Tip >> Green   | 1   | 70    | -    | -     | [Morley - 11 Apr 2026 - 08:00 ▼] | $70   | [+]     |
```

**Filtered Slots:**
- Only show slots for the selected branch
- Only show active slots with future dates
- Show slot title in dropdown

---

## Execution Order

1. Add grading slots state to CreateInvoiceDialog
2. Add loadGradingSlots function
3. Call loadGradingSlots when dialog opens
4. Add grading_slot_id to newItem state
5. Update the "Term" column to conditionally render Grading Slot dropdown for Grading Fees category
6. Update addItem to include grading_slot_id in metadata
7. Display grading slot title in existing items table row
