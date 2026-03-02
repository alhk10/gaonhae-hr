

## Plan: Show Detailed Rate Breakdown in Slot Booking Breakdown Dialog

Replace the single "Full slot rate (inc. bonuses): S$98.00" line with an itemized table showing each bonus component and its amount.

### Changes

**1. `src/services/slotBookingPayrollService.ts`**
- Import `getPayBreakdown` from `slotPayCalculation.ts`
- Add `rateBreakdown` field to `SlotBookingPayData` interface: `rateBreakdown?: Array<{ item: string; amount: number }>`
- In `getSlotBookingPayForPeriod`, call `getPayBreakdown()` using the first booking's date (with full expected hours to get unprorated breakdown) and include it in the return value

**2. `src/pages/PayrollProcessing.tsx`**
- Add `rateBreakdown` to the `slotBreakdownData` state type
- Pass `rateBreakdown` through when setting state and to the dialog component

**3. `src/components/payroll/SlotBreakdownDialog.tsx`**
- Add `rateBreakdown?: Array<{ item: string; amount: number }>` prop
- Replace the single "Full slot rate (inc. bonuses)" text with a small breakdown table showing each component:
  - Base Rate: S$70.00
  - 2nd Dan: S$10.00
  - SG Coach L1: S$5.00
  - Service (3 yrs): S$9.00
  - etc.
  - **Total Rate: S$98.00** (bold)
- Keep the "prorated based on hours worked" note
- Keep "Average pay per slot" and "Average pay per hour" lines below

### Technical Details
- `getPayBreakdown` already exists and returns `{ item: string; amount: number }[]` with all applicable bonuses
- Call it with the expected hours (not actual) so the breakdown shows full unprorated amounts
- Filter out the "Prorated" info line (amount === 0) from the display since we show the full rate breakdown

