

## Problem

When branch dashboard users (employees with student view access) open the PaySchoolFeesDialog or PayGradingDialog via "Select Term", they can see and click the "Pay" button. This should not be allowed -- branch users should use the "Create Invoice" flow in the Branch Dashboard instead.

## Solution

Pass the `readOnly` prop from `StudentDashboard` into both `PaySchoolFeesDialog` and `PayGradingDialog`. When `readOnly` is true:

1. **Hide the Pay button** and payment-related fields (payment method, reference number, proof of payment upload) in both dialogs
2. **Show an info message** directing the user to use "Create Invoice" in the Branch Dashboard instead
3. Keep the term/class selection visible so branch staff can still browse term details

## Changes

### 1. `src/components/dashboard/PaySchoolFeesDialog.tsx`
- Add `readOnly?: boolean` to `PaySchoolFeesDialogProps`
- In the payment step, conditionally hide payment method selector, reference number, proof upload, and the Pay button when `readOnly` is true
- Show an info alert: "To create invoices and collect payments, please use the Invoice & Payment tab in the Branch Dashboard."
- Change the Cancel button to "Close" when readOnly

### 2. `src/components/dashboard/PayGradingDialog.tsx`
- Same changes as above: add `readOnly?: boolean` prop
- Hide payment fields and Pay button when readOnly
- Show the same info message directing to Branch Dashboard

### 3. `src/components/dashboard/StudentDashboard.tsx`
- Pass `readOnly={readOnly}` to all 4 instances of `PaySchoolFeesDialog` and `PayGradingDialog` (manual + auto-triggered)

