

## Plan: Add student name to term reminder message

### What changes

In `src/utils/invoicePDFGenerator.ts` (function `buildTermReminderMessage`, lines 528–598), update the message body to insert the student's name into the "Kindly arrange payment" line. This message is the one shared via SMS and WhatsApp from the Invoice & Payment tab.

### Updated message body

```
Good {Morning/Afternoon/Evening},

We have now reached the end of {current term name}. {next term name} {commence phrase} and will run from {next_start} to {next_end}.

Kindly arrange payment for {Student Name} before the start of the term as follows:

{product_1} – {amount_1}
{product_2} – {amount_2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{branch bank transfer details}

Thank you for your continued support.
Gaonhae Taekwondo {branch}
```

### Implementation

1. Inside `buildTermReminderMessage`, derive the student name from `invoice.student?.name`. Trim it; fall back to `"your child"` when missing (e.g., test invoices without a student) so the sentence still reads naturally.
2. Change line 591 from:
   ```ts
   `Kindly arrange payment before the start of the term as follows:\n\n` +
   ```
   to:
   ```ts
   `Kindly arrange payment for ${studentName} before the start of the term as follows:\n\n` +
   ```
3. Remove the redundant `Items:\n` label on line 592 so the items list flows directly under the intro line, matching the requested format. Items are already formatted as `{product} – {amount}` per line (line 534), so no change to item formatting is needed.

### Behaviour after change

- SMS and WhatsApp share buttons in the Invoice & Payment tab now produce a message that explicitly names the student, making multi-child households unambiguous.
- All existing dynamic placeholders (greeting, current/next term names, commence phrase, date range, items, total, bank transfer info, branch name) continue to work exactly as today.
- When `invoice.student.name` is missing, the sentence becomes: *"Kindly arrange payment for your child before the start of the term as follows:"* — still grammatical.

### Files affected

- `src/utils/invoicePDFGenerator.ts` (only — `buildTermReminderMessage` function)

No changes to:
- The Invoice PDF body (PDF uses a different generator, unchanged).
- The SMS/WhatsApp share button wiring or phone-number normalization.
- Any other call site — `buildTermReminderMessage` is the single source for both SMS and WhatsApp reminder text.

### Verification

1. Open Branch Dashboard → Invoice & Payment → click WhatsApp on any invoice → message preview includes "Kindly arrange payment for {STUDENT NAME} before the start of the term as follows:" followed by the product lines.
2. Click SMS on the same invoice → identical body text.
3. Invoice with multiple line items → each appears as `{product} – {amount}` on its own line, no `Items:` header.
4. Invoice without an attached student record → reads "Kindly arrange payment for your child …" (graceful fallback).
5. Greeting, term names, and bank transfer block all still render as before.

### Out of scope

- The PDF invoice's notes/body text.
- Translating the template into other languages.
- Adding payment links / QR codes into the SMS/WhatsApp body.

