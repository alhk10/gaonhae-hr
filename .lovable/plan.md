## Problem

For Jason Lu (and any casual employee whose earliest booking in the period has no attendance record), the **Full Slot Rate Breakdown** panel in the Slot Booking Breakdown dialog shows:

- Every line item ("Weekend Base", "Service Bonus (4 years)", "3rd Dan", "Poomsae Coach L2") at **S$0.00**
- A stray bare "**0**" rendered at the bottom of the breakdown
- No "Total Rate" line

…even though the per-slot pay column correctly shows S$107.45 / S$126.00.

## Root Cause

Two bugs in `src/services/slotBookingPayrollService.ts` + one rendering bug in `src/components/payroll/SlotBreakdownDialog.tsx`.

### Bug 1 — Sample row chosen for rate breakdown can be an unattended booking

In `getSlotBookingPayForPeriod` we build `breakdown[]` by iterating bookings sorted ascending by date. Bookings with **no attendance record** are pushed first as a stub:

```ts
breakdown.push({
  date: booking.date,
  ...
  expectedHours: 0,        // ← stub value
  fullSlotRate: 0,         // ← stub value
  hasAttendance: false,
});
```

Then we use `breakdown[0]` as the "sample" for the summary rate breakdown:

```ts
employeeFullSlotRate = breakdown[0].fullSlotRate;          // = 0
const sampleExpectedHours = breakdown[0].expectedHours;     // = 0
const fullBreakdown = await getPayBreakdown(
  sampleDate, employee.qualifications, employee.joinDate,
  sampleExpectedHours ?? undefined,                         // = 0 (nullish coalescing keeps 0!)
);
```

If Jason Lu's earliest April booking has no attendance, `sampleExpectedHours = 0` is passed as `actualHoursWorked` into `getPayBreakdown`. Inside `getPayBreakdown`:

```ts
const hoursWorked = actualHoursWorked ?? expectedDuration;  // = 0
const prorationFactor = hoursWorked / expectedDuration;     // = 0
const isProrated = hoursWorked < expectedDuration;          // = true
// every breakdown item: applyProration(amount) = amount * 0 = 0
```

So every line item is multiplied by 0 → all S$0.00.

### Bug 2 — `employeeFullSlotRate` is sourced from the same unattended stub

`breakdown[0].fullSlotRate` is `0` for an unattended booking, so the dialog receives `fullSlotRate = 0`.

### Bug 3 — React renders `0` literally

In `SlotBreakdownDialog.tsx`:

```tsx
{fullSlotRate && (
  <div>...Total Rate ... S${fullSlotRate.toFixed(2)}</div>
)}
```

When `fullSlotRate === 0`, the expression `0 && (...)` evaluates to `0`, and React renders that `0` as a text node — which is the stray "**0**" the user sees.

## Fix

### File: `src/services/slotBookingPayrollService.ts`

In the section that picks the sample for the rate breakdown (~lines 163–179), pick the **first booking that has attendance** (a real `expectedHours > 0` and a real `fullSlotRate`), and only fall back to the unattended stub if no attended bookings exist. In that fallback case, recompute the rate breakdown using `expectedDuration` instead of the stub's `0`.

Outline:

```ts
const sample = breakdown.find(b => b.hasAttendance) ?? breakdown[0];
employeeFullSlotRate = sample.fullSlotRate || undefined;

const expectedHoursForBreakdown =
  sample.expectedHours && sample.expectedHours > 0
    ? sample.expectedHours
    : undefined; // let getPayBreakdown use the slot's own expectedDuration

const fullBreakdown = await getPayBreakdown(
  sample.date,
  employee.qualifications,
  employee.joinDate,
  expectedHoursForBreakdown,
);
```

Also: if `employeeFullSlotRate` is still missing (e.g. no attended slot at all), compute it once via `calculateSlotPay(sample.date, qualifications, joinDate, expectedDuration)` so the dialog can render the "Total Rate" line.

### File: `src/components/payroll/SlotBreakdownDialog.tsx`

Replace the truthy-check that triggers the React `0` rendering bug:

```tsx
{fullSlotRate && (...)}
```

with an explicit numeric guard:

```tsx
{typeof fullSlotRate === 'number' && fullSlotRate > 0 && (...)}
```

Apply the same defensive pattern at line 387 (`fullSlotRate ?` ternary) to be safe.

## Files to Edit

- `src/services/slotBookingPayrollService.ts` — choose attended booking as sample; avoid passing `0` as `actualHoursWorked`.
- `src/components/payroll/SlotBreakdownDialog.tsx` — guard `fullSlotRate` rendering against `0`.

## Verification

1. Open the Payroll page → Jason Lu → Slot Booking Breakdown dialog.
2. Confirm the **Full Slot Rate Breakdown** section now shows the proper amounts (e.g. Weekend Base S$85.00, Service Bonus (4 years) S$12.00, 3rd Dan S$15.00, Poomsae Coach L2 S$5.00 → Total S$117.00).
3. Confirm the stray "0" is gone.
4. Verify per-slot pay amounts (S$107.45 / S$126.00) and totals are unchanged.
5. Spot-check another casual employee whose first booking has attendance — behavior must remain identical.
