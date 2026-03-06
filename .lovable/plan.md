

## Plan: Compact CreatePaymentDialog for Mobile

### Changes to `src/components/sales/CreatePaymentDialog.tsx`

**1. Dialog width & padding — fit to page**
- Change `max-w-2xl` to `max-w-[95vw] sm:max-w-2xl` on DialogContent
- Reduce form spacing from `space-y-6` to `space-y-3`

**2. Remove description text**
- Remove `DialogDescription` ("Record a payment against an invoice")

**3. Compact Invoice Details card**
- Reduce CardHeader padding, CardTitle to `text-sm`
- Reduce grid text to `text-xs`
- Balance Due: shrink from `text-lg` to `text-sm`
- **Remove quantity × unit price** from invoice items — show only description + total amount

**4. Compact Payment Details section**
- Reduce heading from `text-lg` to `text-sm`
- Shrink Label text, Input heights (`h-8`), Select triggers (`h-8`)
- Reduce Textarea rows from 3 to 2
- Upload button: `text-xs h-8`
- Proof file display: smaller padding

**5. Compact footer buttons**
- Cancel & Record Payment buttons: `text-xs h-8`

**6. Default payment method to PayNow for Singapore**
- In the initial `formData` state and `resetForm`, change default `payment_method` from `'bank_transfer'` to `'paynow'`
- The existing `useEffect` on line 326-336 already handles switching to PayNow for Singapore branches — this just ensures the initial default matches

### Scope
Single file: `src/components/sales/CreatePaymentDialog.tsx`. Layout + one default value change.

