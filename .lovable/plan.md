
# Plan: Convert Book Slots, Submit Claims, and View Payslip to Dialog Format

## Overview
Convert three Quick Action buttons in the Employee Dashboard from page navigation to dialog-based interactions, providing a streamlined mobile-friendly experience similar to the existing Attendance History dialog.

---

## Current State

| Feature | Current Behavior |
|---------|-----------------|
| Book Slots | Navigates to `/slot-booking` (full page with ResponsiveLayout) |
| Submit Claim | Navigates to `/submit-claim` (full page with ResponsiveLayout) |
| View Payslip | Navigates to `/payslips` (full page with sidebar) |

The Attendance History feature already uses the dialog pattern we want to replicate.

---

## Solution Design

Create three new dialog components that contain condensed, mobile-optimized versions of the respective page content. The dialogs will focus on the **employee-facing** functionality only (no admin/management tabs).

### Dialog Structure
```
┌─────────────────────────────────────────┐
│  [X] Dialog Title                       │
├─────────────────────────────────────────┤
│  Main Content Area                      │
│  (scrollable, max-height: 80vh)         │
│                                         │
│  - Focused on primary task              │
│  - Mobile-optimized layout              │
│  - Quick actions accessible             │
└─────────────────────────────────────────┘
```

---

## Files to Create

### 1. SlotBookingDialog.tsx
**Path:** `src/components/dashboard/SlotBookingDialog.tsx`

Content includes:
- Branch selector (compact)
- Calendar for date selection
- Selected dates display with pay calculation
- Book button
- Booking history list (scrollable)

Key adaptations:
- Single column layout (no tabs - just booking flow + history accordion)
- Remove management functionality
- Compact stat card showing approved bookings count
- Full-height scrollable content

### 2. SubmitClaimDialog.tsx
**Path:** `src/components/dashboard/SubmitClaimDialog.tsx`

Content includes:
- Claim type selector
- Amount input
- Date picker
- Description textarea
- Receipt upload component
- Submit button
- Claim history accordion (collapsible)

Key adaptations:
- Simplified form layout (single column)
- Remove management tabs
- Partners get partner claim form instead
- Collapsible history section to save space

### 3. ViewPayslipDialog.tsx
**Path:** `src/components/dashboard/ViewPayslipDialog.tsx`

Content includes:
- Summary stats cards (year totals)
- Payslips list with download buttons
- Month filter dropdown

Key adaptations:
- Remove management tab
- Compact payslip cards
- Direct PDF download action
- Mobile-optimized summary cards

---

## Files to Modify

### EmployeeDashboard.tsx
**Path:** `src/components/dashboard/EmployeeDashboard.tsx`

Changes:
1. Add state for each dialog (`showSlotBooking`, `showSubmitClaim`, `showViewPayslip`)
2. Update button onClick handlers to set dialog state instead of navigate
3. Import and render the three new dialog components
4. Pass required props (employeeId, employee data)

---

## Technical Implementation Details

### SlotBookingDialog.tsx

```typescript
interface SlotBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeType: string;
  qualifications: EmployeeQualifications | null;
  joinDate: string | null;
}
```

Core functionality:
- Reuse existing services: `getBranches`, `addSlotBooking`, `getEmployeeSlotBookings`, `checkForExistingBooking`, `getAvailableSlotsForDate`, `getWeeklySlotConfig`
- Reuse existing components: `EnhancedBranchSelector`, `EnhancedCalendar`, `SelectedDatesManager`
- Simplify `BookingActions` inline
- Add collapsible booking history section

Layout structure:
```
┌──────────────────────────────────────────┐
│ [X] Book Slots                           │
├──────────────────────────────────────────┤
│ [Branch Selector Dropdown]               │
├──────────────────────────────────────────┤
│ [Calendar Grid]                          │
├──────────────────────────────────────────┤
│ Selected: 3 dates | Est: S$252.00        │
│ [Clear All]          [Book Selected]     │
├──────────────────────────────────────────┤
│ ▼ Booking History (12 this month)        │
│   ├── Date - Branch - Status             │
│   └── ...                                │
└──────────────────────────────────────────┘
```

### SubmitClaimDialog.tsx

```typescript
interface SubmitClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employee: EmployeeProfile;
}
```

Core functionality:
- Reuse existing services: `createClaim`, `getEmployeeClaims`, `getClaimTypes`
- Reuse existing component: `ReceiptUpload`
- Separate handling for partners vs regular employees

Layout structure:
```
┌──────────────────────────────────────────┐
│ [X] Submit Claim                         │
├──────────────────────────────────────────┤
│ Claim Type: [Dropdown]                   │
│ Amount: [____] | Date: [____]            │
│ Description: [_______________]           │
│ Receipt: [Upload Area]                   │
│                        [Submit Claim]    │
├──────────────────────────────────────────┤
│ ▼ Claim History                          │
│   Pending: 2 | Approved: 5 | Rejected: 1 │
│   ├── Date - Type - Amount - Status      │
│   └── ...                                │
└──────────────────────────────────────────┘
```

### ViewPayslipDialog.tsx

```typescript
interface ViewPayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employee: EmployeeProfile;
}
```

Core functionality:
- Reuse existing services: `getEmployeePayrollRecords`
- Reuse existing PDF generators: `generatePayslipPDF`, `generateCasualPayslipPDF`
- Month navigation similar to AttendanceHistoryDialog

Layout structure:
```
┌──────────────────────────────────────────┐
│ [X] My Payslips                          │
├──────────────────────────────────────────┤
│ [<] February 2026 [>]                    │
├──────────────────────────────────────────┤
│ ┌────────────────────────────────────┐   │
│ │ Feb 2026                           │   │
│ │ Net: S$2,500 | Gross: S$3,000      │   │
│ │ CPF: S$500                         │   │
│ │               [Download PDF]       │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ Jan 2026                           │   │
│ │ ...                                │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

---

## EmployeeDashboard.tsx Updates

### State additions:
```typescript
const [showSlotBooking, setShowSlotBooking] = useState(false);
const [showSubmitClaim, setShowSubmitClaim] = useState(false);
const [showViewPayslip, setShowViewPayslip] = useState(false);
```

### Button handler updates:
```typescript
// Book Slots button (line ~552-560)
onClick={() => setShowSlotBooking(true)}

// Submit Claim button (line ~562-576)
onClick={() => setShowSubmitClaim(true)}

// View Payslip button (line ~578-587)
onClick={() => setShowViewPayslip(true)}
```

### Dialog component additions (at end of component, before final `</>`):
```tsx
{employeeData?.type === 'Casual' && (
  <SlotBookingDialog
    open={showSlotBooking}
    onOpenChange={setShowSlotBooking}
    employeeId={effectiveEmployeeId}
    employeeName={employeeData.name}
    employeeType={employeeData.type}
    qualifications={employeeData.qualifications}
    joinDate={employeeData.joinDate}
  />
)}

{employeeData && (
  <SubmitClaimDialog
    open={showSubmitClaim}
    onOpenChange={setShowSubmitClaim}
    employeeId={effectiveEmployeeId}
    employee={employeeData}
  />
)}

{employeeData && (
  <ViewPayslipDialog
    open={showViewPayslip}
    onOpenChange={setShowViewPayslip}
    employeeId={effectiveEmployeeId}
    employee={employeeData}
  />
)}
```

---

## Mobile-Friendly Design Considerations

1. **Dialog sizing**: `max-w-lg` on mobile, `max-w-2xl` on desktop for slot booking
2. **Scroll handling**: Content areas use `overflow-y-auto` with `max-h-[80vh]`
3. **Touch targets**: Minimum 44px touch targets for buttons
4. **Compact forms**: Single-column layouts on mobile
5. **Collapsible sections**: History sections collapse by default to prioritize primary action
6. **Responsive spacing**: Tighter padding on mobile (`p-3` vs `p-6`)

---

## Navigation Fallback

The original page routes (`/slot-booking`, `/submit-claim`, `/payslips`) will remain functional for:
- Direct URL access
- Superadmin management features
- Senior Partner management access

The dialogs focus purely on the employee self-service experience.

---

## Implementation Order

1. Create `SlotBookingDialog.tsx`
2. Create `SubmitClaimDialog.tsx`
3. Create `ViewPayslipDialog.tsx`
4. Update `EmployeeDashboard.tsx` to use dialogs
5. Test on mobile viewport

---

## Existing Components to Reuse

| Component | Used In |
|-----------|---------|
| `EnhancedBranchSelector` | SlotBookingDialog |
| `EnhancedCalendar` | SlotBookingDialog |
| `SelectedDatesManager` | SlotBookingDialog |
| `ReceiptUpload` | SubmitClaimDialog |
| `PartnerClaimContent` | SubmitClaimDialog (for partners) |
| PDF generators | ViewPayslipDialog |

---

## Service Dependencies

All dialogs will use existing Supabase services:
- `slotBookingService.ts` - Slot booking operations
- `claimsService.ts` - Claim CRUD operations
- `claimTypesService.ts` - Claim type definitions
- `payrollService.ts` - Payroll records
- `employeeService.ts` - Employee data
