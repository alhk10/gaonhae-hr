## Goal
Make Poomsae Coach (L1/L2/L3) and SG Coach (L1/L2) bonuses **non-stackable** — only the highest held level in each group counts.

## Behavior
- **STF Poomsae Coach**: if employee holds L3, pay L3 only; else L2 only; else L1.
- **SG Coach**: if employee holds L2, pay L2 only; else L1.
- STF Coach Induction and Referee bonuses remain unchanged (still independent / stackable).

## Edits

1. **`src/utils/slotPayCalculation.ts`** — three places use the same stack-all pattern. Replace each `if (L1) {...} if (L2) {...} if (L3) {...}` block for Poomsae with a single highest-tier branch (`if L3 else if L2 else if L1`), and same for SG Coach (`if L2 else if L1`):
   - Total pay accumulation (~lines 507–530)
   - Breakdown push (~lines 623–637)
   - Per-slot weekday/weekend rate accumulation (~lines 760–803)

2. **`src/components/dashboard/ViewPricingRatesDialog.tsx`** (line 90)
   - Change section title `"Coach Certifications (stackable)"` → `"Coach Certifications (highest level only)"`.

3. **`src/components/slot-booking/PricingSettingsTab.tsx`** (line 235)
   - Update the `Coach Certifications` heading/help text to note that Poomsae and SG groups are non-stackable (highest level applies).

## Out of scope
- No DB schema changes; bonus values stored per-level remain.
- No changes to qualifications data model — employees can still hold multiple levels; only payout logic picks the top one.
