

## Plan: Restrict "Ready for Grading" auto-flag to invoices with a matching grading product

### Problem

Currently in `src/services/invoiceService.ts` (`createInvoice`, lines ~374–513), **any** lesson invoice auto-creates a `grading_registrations` row with `ready_for_grading = true` for the student's current → next belt. This is why CIELLE, HANNAH, and DAWN show ✓ in the Ready column even though no grading fee was ever invoiced.

### Required behaviour

`ready_for_grading = true` should only be set when the same invoice contains a **grading-category product whose name matches the student's belt transition**, i.e. a product where:
- `product_categories.name = 'Grading'`, AND
- `products.name = '<student.current_belt> >> <getNextBeltLevel(current_belt, country)>'` (e.g. `Yellow Tip >> Yellow`).

A lesson-only invoice (no matching grading product) must NOT create a grading registration and must NOT flip `ready_for_grading` on. Manual toggle from the Grading List UI is unaffected.

### Changes

**1. `src/services/invoiceService.ts` — auto-flag block (≈ lines 374–513)**

Replace the current "any lesson product → Ready" logic with:

a. When fetching `productDetails` (already happens above, line ~365), also pull each product's `category_id` and join to `product_categories.name`. Build a `gradingProducts` map keyed by `product.id` containing `{ name, category_name }`.

b. Compute the **expected grading product name** for this student:
```ts
const expectedName = `${formatBeltLevel(currentBelt)} >> ${formatBeltLevel(targetBelt)}`;
```
(using the same `formatBeltLevel` already used in `PayGradingDialog`).

c. Iterate `invoiceData.items` and find any item whose product is in category `Grading` AND whose product name equals `expectedName` (case-insensitive). Call this `matchingGradingItem`.

d. **Gate the entire auto-flag block on `matchingGradingItem` existing.** If none, skip — do not insert or update any `grading_registrations` row.

e. When `matchingGradingItem` exists:
   - Term resolution stays the same (slot-derived term wins; otherwise lesson-derived term; otherwise `matchingGradingItem.metadata.term_id`).
   - On insert, set `invoice_item_id = <id of matchingGradingItem after insert>` (instead of `null`) so deletion cleanup at line ~772 can purge it via the existing `invoice_item_id IN (...)` branch.
   - On update of an existing registration, still flip `ready_for_grading = true` and refresh belts/slot, and additionally set `invoice_item_id` if it was previously null.

**2. `src/services/invoiceService.ts` — deletion cleanup (≈ lines 782–797)**

The "1b. Delete auto-created grading_registrations" block (which currently deletes any `invoice_item_id IS NULL` registration) becomes safe to keep but largely redundant since new auto-rows now carry an `invoice_item_id`. Leave it in place to also clean up legacy null-linked rows from earlier behaviour. No code change needed here.

**3. One-off data correction (migration)**

Existing `grading_registrations` rows that were auto-created under the old rule (with `ready_for_grading = true`, `invoice_item_id IS NULL`, `result IS NULL`) need to be reconciled so CIELLE / HANNAH / DAWN (and similar) lose the ✓.

Add a SQL migration that, for every such row, checks whether the student has any **non-cancelled** invoice in the same term containing a grading product matching `current_belt >> target_belt`. If not, delete the row.

```sql
DELETE FROM public.grading_registrations gr
WHERE gr.invoice_item_id IS NULL
  AND gr.result IS NULL
  AND gr.ready_for_grading = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.invoice_items ii
    JOIN public.invoices i  ON i.id = ii.invoice_id
    JOIN public.products  p  ON p.id = ii.product_id
    JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE i.student_id = gr.student_id
      AND i.status <> 'cancelled'
      AND pc.name = 'Grading'
      AND p.name  = gr.current_belt || ' >> ' || gr.target_belt
      AND COALESCE(ii.metadata->>'term_id', '') = gr.term_id::text
  );
```

This is a one-shot cleanup. It will also remove any other "false-positive" Ready rows from the previous logic, which matches the intent.

### Behaviour after change

| Scenario | Result |
|---|---|
| Invoice with only lesson products | No grading_registrations row created. Student does NOT appear with Ready ✓. |
| Invoice contains "Yellow Tip >> Yellow" for a Yellow Tip student | Grading_registrations row created with `ready_for_grading = true` and `invoice_item_id` set. Student shows Ready ✓. |
| Invoice contains "White >> Yellow Tip" for a Yellow Tip student (mismatch) | No auto-flag — name doesn't match the student's belt transition. |
| Staff manually ticks Ready in the Grading List | Unchanged — manual toggle still works. |
| Invoice deleted | Existing FK-based cleanup deletes the linked grading_registrations row. |

### Files NOT changed

- `gradingService.ts` (manual toggle untouched)
- `BranchGradingList.tsx` (display only — already reads `ready_for_grading`)
- `PayGradingDialog.tsx` / `PaySchoolFeesDialog.tsx` (grading-product lookup pattern is the source of truth for the matching name)
- No RLS changes

### Verification

1. Open Branch Dashboard → Grading tab → CIELLE, HANNAH, DAWN no longer show ✓ in Ready (after migration runs).
2. Create a new lesson-only invoice for any active student → student does NOT appear with Ready ✓.
3. Create a new invoice that includes the matching grading product (e.g. `Yellow Tip >> Yellow` for a Yellow Tip student) → student now appears with Ready ✓ and the row is linked to the grading line item.
4. Delete that invoice → student disappears from the Ready list.
5. Manual ✓ toggle in the Grading List still works regardless.

### Out of scope

- Changing the manual toggle behaviour or the Grading List UI.
- Revisiting `getNextBeltLevel` country logic.
- Altering grading-fee pricing or the Pay Grading workflow.

