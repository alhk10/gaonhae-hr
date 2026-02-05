
# Plan: Split Full Name to First/Last Name and Uppercase All Party Details

## Overview
This plan will:
1. Add `first_name` and `last_name` columns to the employees table (matching the students table pattern)
2. Update all employee forms and detail pages to use first/last name fields instead of "Full Name"
3. Implement automatic uppercasing for all party details when keyed/stored in Supabase

## Database Changes Required

### 1. Add New Columns to Employees Table
A database migration is needed to add `first_name` and `last_name` columns:
- `first_name` (text, not null)
- `last_name` (text, nullable - to match students pattern)

The existing `name` column will be kept for backward compatibility and computed from `first_name` + `last_name`.

## Technical Implementation

### Files to Modify

#### 1. Type Definitions
**File: `src/types/employee.ts`**
- Add `first_name` and `last_name` to `EmployeeProfile` interface
- Keep `name` for computed/display purposes

#### 2. Employee Service Layer
**File: `src/services/employeeService.ts`**
- Update `createEmployee()` to accept and store first_name, last_name
- Compute `name` as `${first_name} ${last_name}`.toUpperCase()
- Update `updateEmployee()` to handle first_name/last_name fields
- Add uppercase transformation for all text fields on save
- Update `getEmployeeById()` and other fetch methods to return first_name/last_name

#### 3. Full-time Employee Details Page
**File: `src/pages/parties/FulltimeEmployeeDetails.tsx`**
- Replace single "Full Name" input with two inputs: "First Name" and "Last Name"
- Add uppercase transformation on input change
- Update form state to track first_name and last_name separately

#### 4. Casual Employee Details Page  
**File: `src/pages/parties/CasualEmployeeDetails.tsx`**
- Same changes as Full-time Employee Details page
- Replace "Full Name" with "First Name" and "Last Name" inputs
- Add uppercase transformation

#### 5. Edit Employee Form (used in edit mode)
**File: `src/components/employee/EditEmployeeForm.tsx`**
- Split "Full Name" field into "First Name" and "Last Name"
- Add uppercase transformation on input
- Update form data structure and save logic

#### 6. Employee Profile Form (self-service)
**File: `src/components/employee/EmployeeProfileForm.tsx`**
- Update to show first_name and last_name (read-only for non-superadmins)
- Transform inputs to uppercase when editable

#### 7. Party Management Page (add employee flow)
**File: `src/pages/PartyManagement.tsx`**
- Update employee creation to use first_name/last_name
- Add uppercase transformation

#### 8. Supabase Types (auto-generated after migration)
**File: `src/integrations/supabase/types.ts`**
- Will be regenerated after database migration to include first_name/last_name

### Uppercase Transformation Strategy

Create a utility function to standardize uppercasing:

```text
// src/utils/partyUtils.ts

export const toUppercasePartyField = (value: string): string => {
  return value?.toUpperCase() || '';
};

export const normalizePartyData = (data: Record<string, any>): Record<string, any> => {
  const textFields = ['first_name', 'last_name', 'name', 'nric', 'address', 'bank_name', 'position'];
  const normalized = { ...data };
  
  for (const field of textFields) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = normalized[field].toUpperCase();
    }
  }
  
  return normalized;
};
```

### UI Changes Summary

Current layout:
```text
+------------------+  +------------------+
|   Full Name      |  |   Display Name   |
+------------------+  +------------------+
```

New layout:
```text
+------------------+  +------------------+
|   First Name     |  |   Last Name      |
+------------------+  +------------------+
+------------------+  +------------------+
|   Display Name   |  |   (other field)  |
+------------------+  +------------------+
```

### Input Behavior
- All text inputs will automatically convert to uppercase as the user types
- This is done via `onChange={(e) => handleInputChange('field', e.target.value.toUpperCase())}`

## Migration Strategy

### Phase 1: Database Migration
1. Add `first_name` and `last_name` columns to employees table
2. Populate from existing `name` column (split on first space)
3. Keep `name` as a computed/derived field

### Phase 2: Code Updates  
1. Update all components to use first_name/last_name
2. Add uppercase transformation to all inputs
3. Update service layer to handle new fields

### Phase 3: Data Cleanup
1. Run one-time uppercase migration on existing data (optional separate step)

## Affected Party Types

| Party Type | Has First/Last Name | Changes Needed |
|------------|---------------------|----------------|
| Full-time Employee | No (has `name`) | Add first_name/last_name |
| Casual Employee | No (has `name`) | Add first_name/last_name |
| Student | Yes (already has) | Just add uppercase |
| Trial | Yes (already has) | Just add uppercase |

## Testing Checklist
- Create new full-time employee with first/last name
- Create new casual employee with first/last name
- Edit existing employee - verify uppercase conversion
- Verify display name still works correctly
- Check payslips/PDFs still show correct name
- Verify student/trial forms also uppercase correctly
