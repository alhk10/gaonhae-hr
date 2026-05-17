## Make Branch optional on Grading Slot

**File:** `src/components/sales/AddGradingSlotDialog.tsx`
- Change label `Branch *` → `Branch`.
- Remove the `if (!formData.branch_id) { toast.error(...) }` guard in `handleSubmit`.
- Pass `branch_id: formData.branch_id || null` in the payload so empty isn't sent as ''.

**Migration:** Make `grading_slots.branch_id` nullable.
```sql
ALTER TABLE public.grading_slots ALTER COLUMN branch_id DROP NOT NULL;
```

No changes to filtering/listing logic — slots without a branch will simply have no branch label.