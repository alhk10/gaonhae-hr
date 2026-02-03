
# Plan: Add Quick Actions to Student Portal

## Overview

Add two Quick Action buttons to the Student Dashboard that enable parents/students to:
1. **Pay School Fees** - Select lesson slots, auto-generate invoice based on previous enrollment for next available term, and proceed to payment
2. **Pay Grading** - Select grading slot when student is ready for grading, create invoice for current belt grading

---

## Current Architecture Analysis

### Key Data Relationships
| Table | Purpose |
|-------|---------|
| `students` | Student info including `branch_id`, `current_belt` |
| `student_class_enrollments` | Previous class enrollments (class_type, tier_name, pricing_tier_id) |
| `term_calendars` | Available terms per branch |
| `grading_slots` | Available grading sessions with `belt_levels` filter |
| `invoices` / `invoice_items` | Created invoices with term/grading metadata |

### Existing Services Available
- `classEnrollmentService.ts` - Enrollment management and pricing tiers
- `termCalendarService.ts` - Term fetching and availability
- `gradingService.ts` - Grading slot queries
- `invoiceService.ts` - Invoice creation
- `paymentService.ts` - Payment recording

---

## Solution Design

### UI Layout

Quick Actions will appear as action cards in the **Overview tab** of the StudentDashboard, positioned after the Stats Cards:

```text
+------------------------------------------+
|  Student Portal - John Doe               |
|  Manage your profile, invoices...        |
+------------------------------------------+
|  [Sessions]  [Balance]  [Current Belt]   |   <-- Stats Cards (existing)
+------------------------------------------+
|  +------------------+  +----------------+|
|  | Pay School Fees  |  | Pay Grading   ||   <-- NEW Quick Actions
|  | Renew your class |  | Register for  ||
|  | enrollment       |  | belt exam     ||
|  +------------------+  +----------------+|
+------------------------------------------+
```

### Component Structure

```text
StudentDashboard.tsx
  └── QuickActionsSection (NEW)
        ├── PaySchoolFeesDialog (NEW)
        │     ├── Shows previous enrollment info
        │     ├── Term selector (next available)
        │     ├── Class type & tier (pre-filled)
        │     └── Creates invoice and redirects to payment
        │
        └── PayGradingDialog (NEW)
              ├── Shows current belt → next belt
              ├── Grading slot selector (filtered by belt)
              └── Creates invoice for grading fee
```

---

## Detailed Implementation

### 1. New Component: QuickActionsSection

**Location:** `src/components/dashboard/QuickActionsSection.tsx`

| Feature | Implementation |
|---------|----------------|
| Pay School Fees button | Shows if student has branch and previous enrollment OR active terms |
| Pay Grading button | Shows if student has current_belt and matching grading slots |
| Disabled states | Show appropriate messages if prerequisites not met |

### 2. New Component: PaySchoolFeesDialog

**Location:** `src/components/dashboard/PaySchoolFeesDialog.tsx`

**Workflow:**
1. Fetch student's previous enrollment from `student_class_enrollments`
2. Fetch next available term from `term_calendars`
3. Pre-fill: class_type, tier_name, pricing from previous enrollment
4. Show term info: name, dates, weeks, price
5. Create invoice with term metadata
6. Show payment creation form inline

**Data Fetching:**
```typescript
// Previous enrollment
const previousEnrollment = await getEnrollments(branchId).filter(e => e.student_id === studentId)[0];

// Next available term
const today = new Date().toISOString().split('T')[0];
const terms = await getActiveTermsForSelection().filter(t => 
  t.branch_id === branchId && t.start_date > today
);

// Class products
const classProducts = await getProducts().filter(p => 
  p.category_id === CLASSES_CATEGORY_ID
);
```

**Form Fields:**
- Term selector (pre-selected: next available)
- Class type (pre-filled from previous enrollment)
- Quantity (weeks in term)
- Price (from pricing tier or product base_price)

### 3. New Component: PayGradingDialog

**Location:** `src/components/dashboard/PayGradingDialog.tsx`

**Workflow:**
1. Display current belt and target belt (next in progression)
2. Fetch grading slots filtered by branch and current belt
3. Allow selection of grading slot
4. Fetch grading fee product
5. Create invoice with grading_slot_id metadata
6. Show payment creation form inline

**Belt Progression Logic:**
```typescript
const BELT_PROGRESSION = [
  'Foundation 1', 'Foundation 2', 'Foundation 3',
  'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
  'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
  'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4',
  'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5'
];

const getNextBelt = (currentBelt: string) => {
  const idx = BELT_PROGRESSION.indexOf(normalizeBelt(currentBelt));
  return idx >= 0 && idx < BELT_PROGRESSION.length - 1 
    ? BELT_PROGRESSION[idx + 1] 
    : null;
};
```

### 4. Update StudentDashboard.tsx

**Changes:**
- Import QuickActionsSection
- Add QuickActionsSection after Stats Cards in Overview tab
- Pass studentId, student data, and branch info

---

## Technical Details

### Categories Constants

Add to constants file:
```typescript
// Product category IDs (from database)
export const CLASSES_CATEGORY_ID = 'classes-category-uuid';
export const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';
```

### Invoice Creation Flow

Both dialogs will:
1. Create invoice via `createInvoice()` service
2. Return invoice ID
3. Trigger payment creation inline (simplified payment form)
4. On success, invalidate queries and show confirmation

### Payment Integration

**Simplified Payment Form within Dialog:**
- Invoice auto-selected
- Amount pre-filled to balance_due
- Payment method selector (country-filtered)
- Proof of payment upload (required)
- Reference number (optional)

### Error Handling

| Scenario | Handling |
|----------|----------|
| No previous enrollment | Show "Contact academy to set up classes" |
| No available terms | Hide Pay School Fees or show "No upcoming terms" |
| No grading slots for belt | Hide Pay Grading or show "No grading sessions available" |
| Duplicate grading invoice | Block with 60-day rule message |
| Invoice creation fails | Toast error, keep dialog open |
| Payment fails | Toast error, invoice already created |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/QuickActionsSection.tsx` | Container for quick action buttons |
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | School fees enrollment & payment flow |
| `src/components/dashboard/PayGradingDialog.tsx` | Grading registration & payment flow |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/StudentDashboard.tsx` | Add QuickActionsSection to Overview tab |
| `src/config/constants.ts` | Add category IDs for reference |

---

## Validation Rules

### Pay School Fees
- Student must have branch_id
- Term must be available for branch
- Cannot duplicate invoice for same term (existing check)

### Pay Grading
- Student must have current_belt
- Grading slot must match student's belt level
- 60-day duplicate check (existing in CreateInvoiceDialog)
- Only 1 grading per invoice (existing rule)

---

## Security Considerations

- All data fetched server-side via RLS policies
- Invoice creation respects existing service validation
- Payment proof upload uses existing storage bucket
- Student can only view/pay their own invoices

---

## UI/UX Enhancements

| Feature | Benefit |
|---------|---------|
| Pre-filled forms | Reduces friction for renewals |
| Previous class shown | Confirms what they're renewing |
| Belt progression displayed | Clear expectation for grading |
| Inline payment | Single-dialog experience |
| Loading states | Clear feedback during operations |

