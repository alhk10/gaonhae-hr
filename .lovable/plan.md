

## Plan: Restrict Payment Proof Upload to Images Only

### Problem
Payment proof file inputs currently accept both images and PDFs (`accept="image/*,.pdf"`). They should only accept image uploads.

### Changes

Update the `accept` attribute on file inputs in three files:

1. **`src/components/sales/CreatePaymentDialog.tsx`** (line 536): Change `accept="image/*,.pdf"` → `accept="image/*"`
2. **`src/components/dashboard/PayGradingDialog.tsx`** (line 813): Change `accept="image/*,.pdf"` → `accept="image/*"`
3. **`src/components/dashboard/PaySchoolFeesDialog.tsx`** (line 826): Change `accept="image/*,.pdf"` → `accept="image/*"`

Additionally, add client-side validation in each file's upload handler to reject non-image files as a safety measure (in case users bypass the file picker).

