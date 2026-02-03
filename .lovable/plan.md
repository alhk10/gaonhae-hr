
# Plan: Casual Employee Dashboard Enhancements

## Overview
This plan addresses three improvements to the Casual Employee Dashboard:

1. **Add "Book Slots" Quick Action** for Casual Employees
2. **Remove "Next Payroll" stats card**
3. **Fix "Hours This Month" calculation** (currently showing all-time hours with floating-point precision issues)

---

## Changes Required

### 1. Add "Book Slots" Quick Action for Casual Employees

Add a new quick action button that appears only for Casual employee types. This button will navigate to the Slot Booking page (`/slot-booking`).

**Location**: Quick Actions section in `EmployeeDashboard.tsx`

**Behavior**:
- Only visible when `employeeData?.type === 'Casual'`
- Navigates to `/slot-booking` on click
- Uses a calendar/plus icon to match the booking concept
- Styled as outline button like other secondary actions

---

### 2. Remove "Next Payroll" Stats Card

Remove the "Next Payroll" card from the stats display for all employee types.

**Location**: `personalStats` array in `EmployeeDashboard.tsx`

**Current code at line 274**:
```javascript
{ title: 'Next Payroll', value: `${getDaysUntilNextPayroll()} days`, icon: DollarSign, color: 'bg-purple-500' }
```

This will be removed entirely along with the `getDaysUntilNextPayroll` function.

---

### 3. Fix "Hours This Month" Calculation

**Problem**: The current implementation fetches ALL attendance records and sums them all, instead of filtering for the current month only. Additionally, floating-point precision causes values like `508.8499999999999` to display.

**Solution**:
- Filter attendance data to only include records from the current month in the calculation
- Round the displayed value to 1 decimal place for clean display

**Current buggy code at line 244**:
```javascript
const hoursThisMonth = attendanceData.reduce((total, record) => total + (record.hours_worked || 0), 0);
```

**Fixed code**:
```javascript
const hoursThisMonth = (() => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyHours = attendanceData
    .filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth && 
             recordDate.getFullYear() === currentYear;
    })
    .reduce((total, record) => total + (record.hours_worked || 0), 0);
  
  return Math.round(monthlyHours * 10) / 10; // Round to 1 decimal
})();
```

---

## Technical Summary

| Task | File | Type of Change |
|------|------|----------------|
| Add Book Slots button | `src/components/dashboard/EmployeeDashboard.tsx` | Add new button in Quick Actions |
| Remove Next Payroll | `src/components/dashboard/EmployeeDashboard.tsx` | Remove stats entry + cleanup |
| Fix Hours This Month | `src/components/dashboard/EmployeeDashboard.tsx` | Fix filter logic + precision |

---

## Visual Result

**After implementation, Casual Employee Quick Actions will show**:
1. Clock In/Out (with location requirement)
2. **Book Slots** ← New action
3. Submit Claim
4. View Payslip

**Stats cards will show**:
- Pending Claims
- Hours This Month (correctly calculated for current month only, rounded)
- ~~Next Payroll~~ (removed)
