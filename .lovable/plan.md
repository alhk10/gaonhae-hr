## Update Gaonhae Protection Guard Set

Edit `src/services/guardsPurchaseService.ts`:

1. **Catalog entry** (lines 19–34):
   - `description`: `'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag'`
   - `priceInc`: `174.40`
   - `priceEx`: `160.00` (174.40 / 1.09)

2. **Invoice builder** (lines ~408, 422):
   - `targetInc = 174.40 * qty`
   - `targetEx = 160.00 * qty`
   - Existing 3 component products (arm/shin/groin) remain unchanged; the auto-adjustment line absorbs the new $24.40 (inc) / $22.39 (ex) delta so totals reconcile to $174.40.

Canvas Carry Bag is treated as a descriptive bundle inclusion only — no new product is created and no DB migration is required. The `/guards` page and approval/invoice flow will pick up the new label and price automatically.
