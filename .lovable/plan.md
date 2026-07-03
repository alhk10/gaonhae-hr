# Change 6-Slot Milestone Bonus to 8-Slot Milestone Bonus

Rename the lowest slot-booking milestone from "6 slots" to "8 slots". The bonus amount stays whatever is currently configured in `slot_pricing_config.milestone_5_slots_bonus` (we're only changing the threshold count, not the dollar value or the DB column name).

## Changes

1. **`src/utils/slotPayCalculation.ts`** (line 213) — change `else if (slotCount >= 6)` to `>= 8`.
2. **`src/services/slotBookingPayrollService.ts`** (lines 210-211) — change `>= 6` check and the assigned `milestoneBonusThreshold` value from `6` to `8`; update the `// 6, 12, or 16` comment to `// 8, 12, or 16`.
3. **`src/components/dashboard/ViewPricingRatesDialog.tsx`** (line 79) — change label `"6 Slots"` to `"8 Slots"`.
4. **`src/components/slot-booking/PricingSettingsTab.tsx`** (line 130) — change label `"6 Slots Bonus ($)"` to `"8 Slots Bonus ($)"` (input still binds to `milestone_5_slots_bonus`).

## Out of scope

- No DB migration — the column `milestone_5_slots_bonus` and its stored value are unchanged.
- No changes to the 12- and 16-slot tiers.
