## Problem
On `/slot-booking`, the Settings dialog's **Pricing** tab renders `<PricingSettingsTab />` with no `onConfigChange` and no Save button, so edits to dynamic pricing rates can't be persisted. (The same component on the admin page in `AdminSlotBooking.tsx` is wired up correctly with a save handler.)

## Fix

### `src/components/slot-booking/SlotBookingManagementContent.tsx`
1. Import `updatePricingConfig` and `SlotPricingConfig` from `@/services/slotPricingService`.
2. Add local state: `pendingPricingConfig: Partial<SlotPricingConfig> | null` and `isSavingPricing: boolean`.
3. Update the Pricing tab:
   ```tsx
   <TabsContent value="pricing">
     <PricingSettingsTab onConfigChange={(c) => setPendingPricingConfig(c)} />
     <div className="flex justify-end gap-2 mt-4">
       <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Cancel</Button>
       <Button
         disabled={!pendingPricingConfig || isSavingPricing}
         onClick={async () => {
           setIsSavingPricing(true);
           const ok = await updatePricingConfig(pendingPricingConfig!);
           setIsSavingPricing(false);
           if (ok) { toast.success('Pricing rates saved'); setPendingPricingConfig(null); }
           else toast.error('Failed to save pricing rates');
         }}
       >
         {isSavingPricing ? 'Saving...' : 'Save Pricing'}
       </Button>
     </div>
   </TabsContent>
   ```
4. Reset `pendingPricingConfig` when the dialog closes.

## Out of scope
- Timing tab save button (not mentioned by user).
- Read-only `ViewPricingRatesDialog` on Employee Dashboard (unchanged).
- No backend / RLS changes — `updatePricingConfig` and superadmin gating already exist.