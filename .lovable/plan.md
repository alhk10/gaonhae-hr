

## Plan: WhatsApp share — text-only message, no PDF, no link

### What changes

Simplify `shareInvoiceViaWhatsApp` in `src/utils/invoicePDFGenerator.ts` so clicking the WhatsApp icon on an invoice:

1. Opens a WhatsApp chat directly with the recipient.
2. Prefills a plain text message (invoice number, amount due, due date, branch name).
3. Does **not** download the PDF.
4. Does **not** include any link to the PDF or invoice.

### Implementation

**`src/utils/invoicePDFGenerator.ts` — `shareInvoiceViaWhatsApp`**

- Remove the PDF generation/download step entirely.
- Remove any URL/link from the message body.
- Sanitize the phone number to digits-only (required by WhatsApp): `whatsappNumber.replace(/\D/g, '')`.
- Use a more reliable launch chain for mobile:
  1. Try native deep link: `whatsapp://send?phone={digits}&text={encodedMessage}`
  2. Fallback to: `https://api.whatsapp.com/send?phone={digits}&text={encodedMessage}`
- Navigate via `window.location.href` (more reliable than `window.open` after async work; `window.open` is unnecessary now that there's no PDF step).
- Update the success toast to: "Opening WhatsApp…" (drop the "attach PDF" instruction).

**Message body (plain text, no link):**

```
Hi {Parent/Student Name},

This is a reminder for invoice {INV-XXXX} from {Branch Name}.
Amount due: ${amount}
Due date: {DD/MM/YYYY}

Thank you.
```

### SMS — unchanged

`shareInvoiceViaSMS` and `shareInvoiceOverdueReminderViaSMS` keep their current behavior:
- Continue using the `sms:` scheme.
- Continue preserving the leading `+` in the phone number.
- No change to message templates.

To prevent future cross-contamination between the two paths, add two small helpers in `src/utils/invoicePDFGenerator.ts`:

```ts
const normalizeWhatsAppTarget = (v: string) => v.replace(/\D/g, '');   // digits only
const normalizeSmsTarget      = (v: string) => v.replace(/[\s\-\(\)]/g, ''); // keep leading +
```

WhatsApp uses the first; SMS functions use the second.

### Files affected

- `src/utils/invoicePDFGenerator.ts` — rewrite `shareInvoiceViaWhatsApp` (text-only, no PDF, deep-link launch); add the two normalization helpers; refactor SMS functions to use the SMS helper. No changes to PDF generation or any other caller.

### Verification

1. Sales → Invoice Management → click WhatsApp on Hannah Song's invoice (`+61 431589013`) → WhatsApp opens a chat directly with that contact, prefilled text only, no PDF download, no link in message.
2. Same test on a Singapore invoice (`+65 …`) — chat opens correctly.
3. Branch Dashboard → blue SMS button → still opens `sms:` with the standard reminder text.
4. Branch Dashboard → red overdue SMS button → still opens `sms:` with the overdue template.
5. Confirm no file downloads when clicking WhatsApp.

### Out of scope

- PDF generation logic (untouched).
- SMS message templates and behavior (unchanged).
- Stored phone numbers (already correct).

