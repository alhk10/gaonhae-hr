

## Add Class Type Configuration to Products and Filter by Class Type

### Overview
Add a "Class Type" checkbox section to the Lesson Configuration in products, a new "Class Types" tab in Products & Inventory page, and filter the ClassScheduleSelector to only show relevant class types based on the product configuration.

### Part 1: Database Migration

**New column on `products` table:**
- `allowed_class_types text[]` -- stores the selected class types for lesson products (e.g., `['Junior', 'Kids']`)

### Part 2: Product Service Updates

**File: `src/services/productService.ts`**
- Add `allowed_class_types?: string[]` to the `Product` interface
- Map `raw.allowed_class_types` in the transform function
- Include `allowed_class_types` in create/update product functions
- Clear to `null` when `is_lesson` is false

### Part 3: Add Class Type Checkboxes to Lesson Configuration

**Files: `src/components/sales/AddProductDialog.tsx` and `src/components/sales/EditProductDialog.tsx`**
- Add `allowed_class_types: []` to formData state
- Under the Lesson Configuration section (after Available Days), add a new subsection "Class Type" with checkboxes for:
  - Little Gaonhae, Junior, Kids, Teens & Adults, Team Gaonhae Poomsae, Team Gaonhae Kyorugi, Kang Klass, Combat/Self-Defense, Private Lesson
- Use the existing `CLASS_TYPES` array from `branchTimetableService.ts`
- Include in submit data when `is_lesson` is true, clear when false
- In EditProductDialog, initialize from `product.allowed_class_types`

### Part 4: Add "Class Types" Tab to Products & Inventory Page

**File: `src/pages/sales/ProductManagement.tsx`**
- Add a 4th tab "Class Types" with a `Dumbbell` or similar icon
- Change grid-cols-3 to grid-cols-4

**New File: `src/components/sales/ClassTypeManagementTab.tsx`**
- A management UI to view/add/edit class types
- For now, displays the list from `CLASS_TYPES` constant with color coding from `classTypeColors.ts`
- Later can be extended to manage class types dynamically from a database table
- Shows a table with: Class Type name, Color indicator, and edit action
- Admin can add new class types or rename existing ones (stored in a new `class_types` table or kept as constants for now)

### Part 5: Filter ClassScheduleSelector by Allowed Class Types

**File: `src/components/dashboard/ClassScheduleSelector.tsx`**
- Add optional prop: `allowedClassTypes?: string[]`
- In the `eligibleClasses` filter, if `allowedClassTypes` is provided and non-empty, also filter by `cls.class_type` being in the allowed list
- This ensures only relevant class slots appear

### Part 6: Pass Class Types Through Invoice and Dashboard

**File: `src/components/sales/CreateInvoiceDialog.tsx`**
- When rendering `ClassScheduleSelector`, pass `allowedClassTypes` from the selected product's `allowed_class_types`

**File: `src/components/sales/ViewEditInvoiceDialog.tsx`**
- Pass `allowedClassTypes` from item metadata or from the linked product

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**
- Pass `allowedClassTypes` from the selected product

**File: `src/components/dashboard/StudentMyClassSchedule.tsx` / `StudentClassSchedule.tsx`**
- No changes needed here -- students see their already-enrolled classes regardless of type filter

### Technical Summary

| Change | File(s) |
|--------|---------|
| DB migration: add `allowed_class_types` column | New migration |
| Product interface + service | `productService.ts` |
| Add/Edit product dialogs -- class type checkboxes | `AddProductDialog.tsx`, `EditProductDialog.tsx` |
| Products page -- new tab | `ProductManagement.tsx` |
| Class Types management tab | New `ClassTypeManagementTab.tsx` |
| ClassScheduleSelector -- filter by class type | `ClassScheduleSelector.tsx` |
| Pass filter to selector | `CreateInvoiceDialog.tsx`, `ViewEditInvoiceDialog.tsx`, `PaySchoolFeesDialog.tsx` |

