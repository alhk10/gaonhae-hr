

## Fix: WhatsApp link fails for international numbers (`+61…`)

### Root cause

Hannah Song's record is correctly stored as `+61 431589013` (verified in DB). The bug is in `shareInvoiceViaWhatsApp` in `src/utils/invoicePDFGenerator.ts` (line 502):

```ts
const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, '');
// → "+61431589013"
window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
// → https://wa.me/+61431589013   ← INVALID
```

The `wa.me` URL scheme requires a **digits-only** phone number (no `+`, no spaces). When the `+` is left in, WhatsApp can't resolve the contact, which triggers the "phone number is not registered with WhatsApp" dialog you screenshotted — even when the number is a valid registered WhatsApp account.

The correct URL for Hannah is `https://wa.me/61431589013` (country code + local, no `+`).

### The fix (1-line change)

In `src/utils/invoicePDFGenerator.ts`, replace the regex on line 502 to strip everything that isn't a digit:

```ts
// Before
const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, '');

// After
const cleanNumber = whatsappNumber.replace(/\D/g, '');
```

This handles `+`, spaces, dashes, brackets, and any other formatting in one shot. Singapore numbers like `+65 91234567` become `6591234567`, Australian `+61 431589013` becomes `61431589013` — both valid `wa.me` targets.

### Verification

1. Branch Dashboard → find Hannah Song's invoice → click WhatsApp icon → opens `https://wa.me/61431589013?text=…` → WhatsApp resolves the contact correctly.
2. Singapore students (`+65 …`) continue to work (already worked because `+65` happened to also fail the same way? — confirm: any `+` prefix produced a broken URL, so SG numbers were also affected; this fix repairs both).
3. Numbers stored without `+` (legacy, digits only) continue to work — `replace(/\D/g, '')` is a no-op on already-clean digits.

### Files affected

- `src/utils/invoicePDFGenerator.ts` — one-line regex change in `shareInvoiceViaWhatsApp`.

### Out of scope

- Hannah's stored phone number (already correct, no change needed).
- SMS sharing (uses `sms:` scheme, which accepts `+` and is unaffected).
- WhatsApp message body / PDF attachment workflow (unchanged).

