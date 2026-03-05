

## Plan: Fix Package & Class Timeslot Prefill from Previous Invoice

### Root Cause

The query at line 124 requires BOTH `term_id` AND (`product_name` OR `selected_class_slots`) in the invoice item metadata. The existing invoice in the database only has `{"term_id": "..."}` — it was created before the code that stores `product_name` and `selected_class_slots` was added (lines 553-560). So the query returns `null` and nothing gets prefilled.

### Fix

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**

1. **Relax the metadata filter** (line 124): Accept items that have just `term_id` — don't require `product_name` or `selected_class_slots` to be present.

2. **Add fallback data sources**: When `product_name` is missing from metadata, fetch it from the `invoice_items.product_id → products.name` join. When `selected_class_slots` is missing, fetch slots from `student_scheduled_classes` for that student's most recent term enrollment.

3. **Expand the query** to select `product_id` alongside `metadata`, then join products to get the name as fallback.

4. **Add scheduled classes fallback**: Query `student_scheduled_classes` joined with `student_class_enrollments` for this student to get `timetable_id` values, which can be used to reconstruct the slot pattern for the new term.

### Specific Changes

In the `previousInvoiceMetadata` query:
- Select `metadata, product_id, products(name)` instead of just `metadata`
- Change filter from `metadata?.term_id && (metadata?.product_name || metadata?.selected_class_slots)` to just `metadata?.term_id`
- Return `product_name: metadata.product_name || item.products?.name`
- When `selected_class_slots` is missing, query `student_scheduled_classes` for the student's enrolled timetable IDs as fallback

### Files to modify
- **Edit**: `src/components/dashboard/PaySchoolFeesDialog.tsx` — Fix metadata query and add fallback data sources

