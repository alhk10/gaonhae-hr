I investigated Rory’s database records directly.

What I found:
- Student: RORY MCINTOSH, active, Morley branch context.
- Invoice: INV-2026-00288 includes:
  - Class item with Term 2 2026 metadata.
  - Grading item “Foundation >> White” with metadata = null.
- Grading registration exists, but it was created as Term 2 2026 with no grading slot.
- Term 1 Morley has the correct Foundation slot available: 11/04/2026 08:00.

Do I know what the issue is? Yes.

The problem is that when a grading product is added while editing an existing invoice, the edit-save path drops the new item’s metadata. The UI can collect a grading slot, but the insert for newly added edit items saves metadata without `item.metadata`, so `grading_slot_id` is lost. Then the grading sync has no slot to derive Term 1 from, falls back to the class item’s Term 2, and Rory is written into Term 2 instead of Term 1.

Plan to fix after approval:

1. Repair Rory’s current database records
   - Update Rory’s grading invoice item metadata to include the correct Morley Foundation Term 1 grading slot.
   - Update the linked grading registration to:
     - Term 1 2026
     - the correct Foundation grading slot
     - ready_for_grading = true
   - This makes Rory appear immediately in the Term 1 grading list.

2. Fix invoice edit-save metadata persistence
   - In `InvoiceDialog.tsx`, update the new edit-item insert logic so it preserves `item.metadata`.
   - This will save `grading_slot_id`, `term_id`, `term_ids`, and other metadata for newly added items during invoice edits.
   - This also prevents similar issues for newly added class items during edits.

3. Make grading sync update existing linked registrations
   - In `syncGradingRegistrationsForInvoice`, stop skipping rows just because `invoice_item_id` already has a registration.
   - If the invoice item metadata changes, update the existing grading registration’s term, slot, belts, and ready state.
   - This ensures dialog save immediately corrects the database, not just newly creates missing records.

4. Strengthen lazy self-healing on grading list access
   - Update the branch backfill routine so it re-syncs grading invoices for the branch, not only invoice items with no registration.
   - This lets the grading list repair stale/wrong-term registrations when the page is opened.

5. Validate the Rory case
   - Confirm Rory’s registration is Term 1 2026 with the Morley Foundation slot.
   - Confirm the Term 1 grading list query will include him from `grading_registrations`.

Technical files expected to change:
- `src/components/sales/InvoiceDialog.tsx`
- `src/services/invoiceService.ts`
- Supabase migration for the one-time Rory data repair

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>