
# Plan: Add Grading List Tab with New Current Belt Column

## Overview

Add a new "Grading List" tab to the Grading Management page showing students invoiced for the current term, with filters for branch/payment status and columns for tracking grading readiness and results including the calculated new belt level.

---

## Data Model Changes

### Database Migration

Add new columns to the `grading_registrations` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `ready_for_grading` | boolean | false | Checkbox to mark student ready |
| `certificate_ii_issued` | boolean | false | Track second certificate for double promotions |

```sql
ALTER TABLE grading_registrations 
ADD COLUMN IF NOT EXISTS ready_for_grading boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_ii_issued boolean DEFAULT false;
```

---

## Architecture

```text
GradingManagement.tsx
├── Tab: "Grading Slots" (existing content)
└── Tab: "Grading List" (new)
    └── GradingListTab.tsx
        ├── Filters: Branch, Term (auto-selected), Payment Status
        ├── Table with grading data
        └── Inline editing for ready/result fields
```

---

## New Current Belt Logic

Using the existing belt hierarchy from `src/constants/beltLevels.ts`:

| Result | New Current Belt Calculation |
|--------|------------------------------|
| Empty / null | - (no value shown) |
| **Fail** | Same as current belt |
| **Confirmed** | Same as current belt |
| **Pass** | Next belt in hierarchy (use `getNextBeltLevel()`) |
| **Double** | Skip one belt (next belt's next belt) |

**Implementation**: Add a new utility function to `beltLevels.ts`:

```typescript
/**
 * Get the belt level after skipping one (for double promotions)
 * Returns null if not possible
 */
export const getDoubleBeltLevel = (currentBelt: string): string | null => {
  const nextBelt = getNextBeltLevel(currentBelt);
  if (!nextBelt) return null;
  return getNextBeltLevel(nextBelt);
};
```

---

## Table Columns Specification

| Column | Width | Description |
|--------|-------|-------------|
| Student Name | auto | Links to student profile |
| Current Belt | 120px | Student's current belt with colored badge |
| Class Invoice | 100px | Green "Paid" / Red "Unpaid" badge |
| Ready | 80px | Centered checkbox (editable) |
| Result | 140px | Dropdown: Empty, Double, Pass, Fail, Confirmed |
| **New Current Belt** | 130px | Calculated based on result (see logic above) |
| Certificate | 100px | Button enabled only for Pass/Double/Confirmed |
| Certificate II | 100px | Button enabled only for Double |

---

## Implementation Details

### File 1: Update Constants - `src/constants/beltLevels.ts`

Add new utility function for double promotions:

```typescript
export const getDoubleBeltLevel = (currentBelt: string): string | null => {
  const nextBelt = getNextBeltLevel(currentBelt);
  if (!nextBelt) return null;
  return getNextBeltLevel(nextBelt);
};
```

### File 2: New Component - `src/components/sales/GradingListTab.tsx`

Create new component with:

1. **State management** for filters (branch, term, payment status)
2. **Data fetching** using React Query to get students with term invoices
3. **Inline editing** for ready checkbox and result dropdown
4. **Calculated column** for New Current Belt using:

```typescript
const getNewCurrentBelt = (currentBelt: string, result: string | null) => {
  if (!result) return null;
  switch (result) {
    case 'fail':
    case 'confirmed':
      return currentBelt; // Same belt
    case 'pass':
      return getNextBeltLevel(currentBelt); // Next belt
    case 'double':
      return getDoubleBeltLevel(currentBelt); // Skip one belt
    default:
      return null;
  }
};
```

**Query Logic**:
```sql
-- Conceptual query
SELECT 
  s.id, s.first_name, s.last_name, s.current_belt,
  i.status as invoice_status,
  gr.ready_for_grading, gr.result, gr.certificate_issued, gr.certificate_ii_issued
FROM students s
JOIN invoice_items ii ON ii.metadata->>'student_id' = s.id::text
JOIN invoices i ON ii.invoice_id = i.id
JOIN products p ON ii.product_id = p.id
LEFT JOIN grading_registrations gr ON s.id = gr.student_id
WHERE ii.metadata->>'term_id' = :current_term_id
  AND p.is_lesson = true
  AND s.branch_id = :branch_id
```

### File 3: Service Functions - `src/services/gradingService.ts`

Add new functions:

```typescript
// Get students for grading list based on term invoices
export const getStudentsForGradingList = async (
  branchId: string,
  termId: string,
  paymentStatus?: 'paid' | 'unpaid' | 'all'
): Promise<GradingListStudent[]> => { ... };

// Update ready for grading status
export const updateGradingReadiness = async (
  studentId: string,
  termId: string,
  isReady: boolean
): Promise<void> => { ... };

// Update grading result with extended options
export const updateStudentGradingResult = async (
  studentId: string,
  termId: string,
  result: 'pass' | 'fail' | 'double' | 'confirmed' | null
): Promise<void> => { ... };
```

### File 4: Update Page - `src/pages/sales/GradingManagement.tsx`

Wrap existing content in Tabs:

```tsx
<Tabs defaultValue="slots">
  <TabsList>
    <TabsTrigger value="slots">Grading Slots</TabsTrigger>
    <TabsTrigger value="list">Grading List</TabsTrigger>
  </TabsList>
  <TabsContent value="slots">
    {/* Existing grading slots content */}
  </TabsContent>
  <TabsContent value="list">
    <GradingListTab />
  </TabsContent>
</Tabs>
```

---

## UI Behavior Details

### Filter Bar
- **Branch dropdown**: Required, loads from branches table
- **Term**: Auto-selects current term for branch (where `start_date <= today <= end_date`)
- **Payment Status**: "All" | "Paid" | "Unpaid"

### Result Dropdown Options
- *(Empty)* - Default, no result yet
- Double - Student skips a belt
- Pass - Normal promotion
- Fail - Must retake
- Confirmed - Result finalized

### Certificate Buttons
- **View Certificate**: Enabled when result is Pass, Double, or Confirmed
- **View Certificate II**: Enabled only when result is Double
- Both show toast "Certificate generation coming soon" for now

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXXXXX_grading_list_fields.sql` | Create | Add `ready_for_grading` and `certificate_ii_issued` columns |
| `src/constants/beltLevels.ts` | Edit | Add `getDoubleBeltLevel()` function |
| `src/components/sales/GradingListTab.tsx` | Create | New tab component with filters, table, and new belt calculation |
| `src/services/gradingService.ts` | Edit | Add service functions for grading list operations |
| `src/pages/sales/GradingManagement.tsx` | Edit | Add Tabs structure and import new component |

---

## Expected Result

After implementation:
- New "Grading List" tab appears alongside "Grading Slots"
- Shows students invoiced for current term lessons
- Filters by branch and payment status work correctly
- Ready checkbox toggles inline
- Result dropdown saves immediately on change
- **New Current Belt** column shows:
  - Same belt for Fail/Confirmed
  - Next belt for Pass
  - Skipped belt for Double
  - Empty when no result selected
- Certificate buttons placeholder ready for future implementation
