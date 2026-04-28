## Plan — Auto-create grading registration on invoice edit

### Problem
When Rory's invoice was **edited** (not newly created) to add a Foundation grading line item, the grading list for Term 1 did not show the registration, even after dialog save and refresh.

Root cause: only `createInvoice` (in `src/services/invoiceService.ts`) auto-creates `grading_registrations` rows for Grading-category line items. The **edit save** path in `src/components/sales/InvoiceDialog.tsx` (`handleSave`, ~line 1178) inserts new `invoice_items` directly via `supabase.from('invoice_items').insert(...)` and never runs the grading-registration sync. So the new Grading line item exists but no registration row is written → student does not appear in the grading list.

### Fix

**1. New shared service helper** (already drafted in `invoiceService.ts`):
- `syncGradingRegistrationsForInvoice(invoiceId)` — re-derives registrations from the invoice's current Grading-category items.
- Idempotent: skips items that already have a registration via `invoice_item_id`, claims any existing `(student_id, term_id)` row with no `invoice_item_id`, otherwise inserts a fresh row.
- Resolves `term_id` in this priority: grading slot → item metadata → any lesson term on the invoice.
- Belt transition parsed from product name (e.g. "White >> Yellow Tip"); falls back to student's current belt.
- `ready_for_grading` flips true only when the term has started; preserves an already-true flag.

**2. Wire it into the edit save flow** in `src/components/sales/InvoiceDialog.tsx`:
- Import `syncGradingRegistrationsForInvoice` from `@/services/invoiceService` and `useQueryClient`.
- Inside `handleSave`, after the existing item insert/update/delete + `invoices` update + class-slot sync, call:
  ```ts
  await syncGradingRegistrationsForInvoice(invoice.id);
  queryClient.invalidateQueries({ queryKey: ['grading-list-students'] });
  queryClient.invalidateQueries({ queryKey: ['grading-list-count'] });
  queryClient.invalidateQueries({ queryKey: ['grading-registrations'] });
  ```
- This guarantees the grading list reflects the change immediately on the next read (no manual reload needed).

**3. Edit cleanup for removed grading items**:
- When a Grading line item is removed during edit (already tracked as `removedIds`), also delete its linked `grading_registrations` row (where `invoice_item_id IN removedIds`) before the items themselves are deleted, so a later re-add doesn't get blocked by an orphan FK and the list stays consistent.

### Out of scope
- No DB schema changes (the existing `grading_registrations` table already has `invoice_item_id`, `term_id`, `student_id`, etc.).
- No change to `createInvoice` — its inline auto-create block already works and is idempotent. The new helper is only invoked from the edit path; we can refactor `createInvoice` to use it later if desired, but not in this change.
- No change to the bulk certificate or column-width work from earlier.

### Files
- `src/services/invoiceService.ts` — add exported `syncGradingRegistrationsForInvoice` (already appended).
- `src/components/sales/InvoiceDialog.tsx` — import the helper + `useQueryClient`, add `const queryClient = useQueryClient()`, call sync + invalidations at the end of `handleSave`, and delete grading_registrations for `removedIds` before deleting invoice_items.
