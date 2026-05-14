## Goal
Add a read-only "View Pricing Rates" quick action in the Employee Dashboard so any employee can see the current dynamic pricing configuration (the same config superadmins edit in `PricingSettingsTab`).

## Changes

### 1. New file: `src/components/dashboard/ViewPricingRatesDialog.tsx`
Read-only dialog that:
- Calls `getActivePricingConfig()` from `@/services/slotPricingService` on open.
- Renders the active `SlotPricingConfig` grouped into the same sections as `PricingSettingsTab`, but as static labelled rows (no inputs, no save):
  - Base Rates: Weekday, Weekend, Years-of-service bonus / yr
  - Monthly Milestone Bonuses: 5 / 10 / 16 slots
  - Dan Level Bonuses: 1st / 2nd / 3rd & above
  - Coach Certifications: STF Induction, STF Poomsae L1/L2/L3, SG Coach L1/L2
  - Referee Certifications: STF Poomsae, STF Kyorugi
- All amounts shown as `$X.XX` using a small helper.
- Mobile-friendly compact layout (`max-w-lg`, `max-h-[85vh] overflow-y-auto`, text-sm grid 2-col).
- Loading skeleton + "No pricing configuration found" empty state.

### 2. `src/components/dashboard/EmployeeDashboard.tsx`
- Import `ViewPricingRatesDialog` and a `DollarSign` icon (already used elsewhere if not imported).
- Add `const [showPricingRates, setShowPricingRates] = useState(false);`.
- In the Quick Actions grid (after Attendance History / Branch P&L block, ~line 712), add a new outline button "View Pricing Rates" with the DollarSign icon, visible to all employees (no role gate).
- Render `<ViewPricingRatesDialog open={showPricingRates} onOpenChange={setShowPricingRates} />` alongside the other dialogs.

## Out of scope
- No edit capability, no role-based hiding, no changes to `PricingSettingsTab` or the underlying service/table.
