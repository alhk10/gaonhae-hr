## Goal
Change monthly slot milestone tiers from **5 / 10 / 16** to **6 / 12 / 16** (only the first two thresholds shift; 16 is unchanged).

## Approach
Keep existing DB columns (`milestone_5_slots_bonus`, `milestone_10_slots_bonus`, `milestone_16_slots_bonus`) — they continue to store the bonus amounts but now correspond to the 6 / 12 / 16-slot tiers. This avoids a risky column rename + types regen and preserves historical values.

## Edits

1. **`src/utils/slotPayCalculation.ts`** (line ~209)
   - Update thresholds in `calculateMilestoneBonus`: `>= 10` → `>= 12`, `>= 5` → `>= 6`. (>= 16 unchanged.)

2. **`src/services/slotBookingPayrollService.ts`** (lines ~203–212)
   - Mirror the same threshold change: 10 → 12, 5 → 6 for `milestoneBonusThreshold` assignment. Update the inline comment "5, 10, or 16" to "6, 12, or 16".

3. **`src/components/slot-booking/PricingSettingsTab.tsx`** (lines ~130–160)
   - Labels: "5 Slots Bonus ($)" → "6 Slots Bonus ($)", "10 Slots Bonus ($)" → "12 Slots Bonus ($)". 16 unchanged.

4. **`src/components/dashboard/ViewPricingRatesDialog.tsx`** (lines ~79–81)
   - Row labels: "5 Slots" → "6 Slots", "10 Slots" → "12 Slots".

## Out of scope
- No DB migration / column rename.
- No changes to `SlotBreakdownDialog` (it displays the dynamic threshold value, which now flows through correctly).