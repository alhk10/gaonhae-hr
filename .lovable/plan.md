## Remove "Next slot: ..." text from public grading payment

**File:** `src/pages/public/PublicGradingPayment.tsx`

Delete the `options?.slot_date` block (the `<p className="text-xs text-muted-foreground">Next slot: ...</p>`) from the non-foundation product display card. Keeps product name and price; removes the suggested next-slot line since the dedicated Grading Slot dropdown below already lets the user pick.