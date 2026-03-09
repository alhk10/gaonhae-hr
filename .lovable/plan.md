

## Problem

When creating an invoice with a product like "Foundation to Red 1x Weekday," the Class Schedule Selector shows all days (including Friday, Saturday, Sunday) instead of filtering to only weekday columns. The product has `lesson_days` configured in the database (e.g., `["Monday", "Tuesday", "Wednesday", "Thursday"]`) but this value is not being passed to the `ClassScheduleSelector` component.

## Root Cause

The `ClassScheduleSelector` already supports an `allowedDays` prop that filters columns. However, in two places where it's used, the prop is missing:

1. **`CreateInvoiceDialog.tsx` (line 1399)** — passes `allowedClassTypes` but **not** `allowedDays`
2. **`ViewEditInvoiceDialog.tsx` (line 780)** — passes neither `allowedClassTypes` nor `allowedDays`

The product object already contains `lesson_days` (string array like `["Monday", "Tuesday", "Wednesday", "Thursday"]`), which maps directly to the `allowedDays` prop.

## Plan

### 1. Fix CreateInvoiceDialog.tsx
Add `allowedDays={selectedProduct?.lesson_days}` to the `ClassScheduleSelector` at line ~1399, alongside the existing `allowedClassTypes` prop.

### 2. Fix ViewEditInvoiceDialog.tsx
Pass both `allowedClassTypes` and `allowedDays` from the invoice item's associated product to the `ClassScheduleSelector` at line ~780. This requires looking up the product for each item to get its `lesson_days` and `allowed_class_types`.

### 3. Also pass lessonsPerWeek
Both dialogs should also forward `lessonsPerWeek={selectedProduct?.lessons_per_week}` (CreateInvoiceDialog) and the equivalent for ViewEditInvoiceDialog, as `PaySchoolFeesDialog` already does this correctly.

