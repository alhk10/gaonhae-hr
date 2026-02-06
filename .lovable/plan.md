

# Add Day Rate Breakdown to Casual Employee PDF Payslip

## Overview
Add a detailed breakdown section to the casual employee PDF payslip showing how Weekday and Weekend day rates are calculated based on the employee's qualifications and bonuses.

## Current State
- **`casualPayslipPDFGenerator.ts`** generates PDF payslips for casual employees with a timesheet table
- The timesheet shows per-slot "Day Rate" column but no explanation of how it's calculated
- **`slotPayCalculation.ts`** has existing logic for calculating rates and a `getPayBreakdown` function
- Employee qualifications are stored in `EmployeeProfile.qualifications`

## Implementation Plan

### 1. Create Rate Calculation Helper Function
**File:** `src/utils/slotPayCalculation.ts`

Add a new function to calculate employee's full day rates (before proration) for both weekday and weekend:

```typescript
export const getEmployeeDayRates = async (
  qualifications?: EmployeeQualifications,
  joinDate?: string,
  referenceDate?: string
): Promise<{
  weekdayRate: number;
  weekendRate: number;
  breakdown: { item: string; weekdayAmount: number; weekendAmount: number }[];
}>
```

This function will:
- Calculate weekday base rate + all applicable bonuses
- Calculate weekend base rate + all applicable bonuses
- Return itemized breakdown showing each component (base rate, Dan level, certifications, years of service)

### 2. Update CasualPayslipData Interface
**File:** `src/utils/casualPayslipPDFGenerator.ts`

Add optional day rate calculation data to the interface:

```typescript
interface CasualPayslipData {
  // ... existing fields
  dayRateCalculation?: {
    weekdayRate: number;
    weekendRate: number;
    breakdown: { item: string; weekdayAmount: number; weekendAmount: number }[];
  };
}
```

### 3. Render Day Rate Breakdown Section in PDF
**File:** `src/utils/casualPayslipPDFGenerator.ts`

Add a new section after the "TOTAL SLOT PAY" line that displays:

```
┌─────────────────────────────────────────────────────────┐
│ DAY RATE CALCULATION:                                   │
├─────────────────────────────────────────────────────────┤
│                           Weekday      Weekend          │
│ Base Rate                 $78.00       $93.00           │
│ 2nd Dan                   +$12.00      +$12.00          │
│ SG Coach L1               +$6.00       +$6.00           │
│ Poomsae Coach L1          +$4.00       +$4.00           │
├─────────────────────────────────────────────────────────┤
│ TOTAL DAY RATE            $100.00      $115.00          │
└─────────────────────────────────────────────────────────┘
```

### 4. Pass Rate Data When Generating PDF
**Files to update:**
- `src/components/dashboard/ViewPayslipDialog.tsx`
- `src/pages/Payslips.tsx`
- `src/pages/PayslipManagement.tsx`
- `src/components/payroll/PayslipManagementContent.tsx`

Each location that calls `generateCasualPayslipPDF` will:
1. Call the new `getEmployeeDayRates` function with employee qualifications and join date
2. Pass the result as `dayRateCalculation` property

## Technical Details

### Data Flow
```text
Employee Profile (qualifications, joinDate)
            ↓
getEmployeeDayRates() calculates rates
            ↓
Pass to generateCasualPayslipPDF({ ...data, dayRateCalculation })
            ↓
PDF renders breakdown section after TOTAL SLOT PAY
```

### Files Modified

| File | Changes |
|------|---------|
| `src/utils/slotPayCalculation.ts` | Add `getEmployeeDayRates` function |
| `src/utils/casualPayslipPDFGenerator.ts` | Update interface + add PDF section renderer |
| `src/components/dashboard/ViewPayslipDialog.tsx` | Fetch and pass day rates |
| `src/pages/Payslips.tsx` | Fetch and pass day rates |
| `src/pages/PayslipManagement.tsx` | Fetch and pass day rates |
| `src/components/payroll/PayslipManagementContent.tsx` | Fetch and pass day rates |

### PDF Layout Positioning
- The day rate breakdown section will be placed immediately after the "TOTAL SLOT PAY" row
- Rendered as a bordered table with two columns (Weekday/Weekend)
- Uses compact font size (7-8pt) consistent with timesheet styling
- Includes a horizontal line separator before and after the section

### Edge Cases
- If no qualifications exist: Shows only base rates
- If `dayRateCalculation` is not provided: Section is skipped (backward compatible)
- New employees with no years of service: Service bonus shows as $0 or is omitted
- Page overflow handling: Section uses existing page break logic

