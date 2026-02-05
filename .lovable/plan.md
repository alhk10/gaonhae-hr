

# Plan: Fix Day Rate Display in Casual Employee Payslips

## The Problem
The "Day Rate" column in the payslip timesheet shows **prorated amounts** (e.g., $83.07, $63.93) instead of the **full slot rate** (e.g., $84.00, $98.00). The Day Rate should show the maximum amount the employee can earn for a slot including all bonuses, before any proration for partial hours.

## Root Cause
The system correctly calculates and stores the full slot rate (`fullSlotRate`) in the payroll breakdown data, but this value is **not being passed** to the PDF generator. When the PDF is generated, it tries to reverse-calculate the day rate from the prorated pay, which produces incorrect values.

## Solution Summary
Pass the `fullSlotRate` from the stored payroll data as the `dayRate` when preparing the slot entries for PDF generation.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/payroll/PayslipManagementContent.tsx` | Add `dayRate: slot.fullSlotRate` to slot mapping |
| `src/pages/PayslipManagement.tsx` | Add `dayRate: slot.fullSlotRate` to slot mapping |
| `src/pages/Payslips.tsx` | Add `dayRate: slot.fullSlotRate` to slot mapping |

---

## Implementation Details

### 1. PayslipManagementContent.tsx (Line ~145-152)

**Current Code:**
```typescript
const slots: SlotEntry[] = payslip.payrollData.slotBreakdown!.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  pay: slot.pay || 0
}));
```

**Updated Code:**
```typescript
const slots: SlotEntry[] = payslip.payrollData.slotBreakdown!.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  dayRate: (slot as any).fullSlotRate,  // Full rate before proration
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  expectedHours: (slot as any).expectedHours,
  pay: slot.pay || 0
}));
```

### 2. PayslipManagement.tsx (Line ~178-186)

**Current Code:**
```typescript
const slots: SlotEntry[] = payslip.payrollData.slotBreakdown!.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  pay: slot.pay || 0
}));
```

**Updated Code:**
```typescript
const slots: SlotEntry[] = payslip.payrollData.slotBreakdown!.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  dayRate: (slot as any).fullSlotRate,  // Full rate before proration
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  expectedHours: (slot as any).expectedHours,
  pay: slot.pay || 0
}));
```

### 3. Payslips.tsx (Line ~129-137)

**Current Code:**
```typescript
const slots: SlotEntry[] = payslipData.slotBreakdown.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  expectedHours: (slot as any).expectedHours,
  pay: slot.pay
}));
```

**Updated Code:**
```typescript
const slots: SlotEntry[] = payslipData.slotBreakdown.map(slot => ({
  date: slot.date,
  branchName: slot.branchName,
  dayRate: (slot as any).fullSlotRate,  // Full rate before proration
  clockIn: slot.checkIn || null,
  clockOut: slot.checkOut || null,
  hoursWorked: slot.hoursWorked || 0,
  expectedHours: (slot as any).expectedHours,
  pay: slot.pay
}));
```

---

## How It Works

The data flow is:

```text
1. Slot Booking Pay Calculation (slotBookingPayrollService.ts)
   ↓
   Calculates fullSlotRate = $84.00 (base + bonuses for full day)
   Calculates pay = $83.07 (prorated based on actual hours)
   ↓
2. Saved to Database (payroll_records table)
   ↓
   breakdown: [{ date, branchName, pay, fullSlotRate, hoursWorked, ... }]
   ↓
3. PDF Generation (this fix)
   ↓
   Maps fullSlotRate → dayRate
   ↓
4. PDF Display (casualPayslipPDFGenerator.ts)
   ↓
   Shows dayRate = $84.00 (full rate)
   Shows pay = $83.07 (actual earned)
```

---

## Expected Result

**Before Fix:**
| Date | Day Rate | Hours | Pay |
|------|----------|-------|-----|
| 07 Jan | $83.07 | 5.9 | $83.07 |
| 08 Jan | $84.00 | 6.0 | $84.00 |
| 20 Jan | $63.93 | 4.6 | $63.93 |

**After Fix:**
| Date | Day Rate | Hours | Pay |
|------|----------|-------|-----|
| 07 Jan | $84.00 | 5.9 | $83.07 |
| 08 Jan | $84.00 | 6.0 | $84.00 |
| 20 Jan | $84.00 | 4.6 | $63.93 |

The Day Rate now correctly shows the full amount the employee could have earned if they worked the complete slot, while the Pay column shows what they actually earned based on hours worked.

---

## Note on Type Casting

The `(slot as any).fullSlotRate` casting is used because the TypeScript type definition for `slotBreakdown` doesn't include `fullSlotRate`. This is a pragmatic approach since the data exists at runtime but the type wasn't updated when the field was added. A future enhancement could add proper type definitions.

