

## Plan: Make WhatsApp message mirror the rich SMS template, via `wa.me`

### What changes

The WhatsApp share will produce the exact same message body as the blue SMS button — opening line with the ending term + the upcoming term and its date range, full itemized list, total, bank transfer details, and the Gaonhae signature — and it will open via the simpler `https://wa.me/<digits>?text=...` link.

### Final message format

```text
We have now reached the end of {endingTerm.name}. {upcomingTerm.name} will commence next week and will run from {start} to {end}.

Kindly arrange payment before the start of the term as follows:

Items:
{Product 1} – {amount 1}
{Product 2} – {amount 2}

Total: {total_amount}

Payment can be made via bank transfer using the details below:
{bank transfer info from active template for branch country}

Thank you for your continued support.
Gaonhae Taekwondo ({branch name})
```

Same template, derivation rules and graceful fallbacks as `shareInvoiceViaSMS` (including the `Term N YYYY` → `Term N+1 YYYY` last-resort name derivation).

### Files to update

**1. `src/utils/invoicePDFGenerator.ts`**

- Refactor `shareInvoiceViaWhatsApp` to:
  - Accept the same optional term context as SMS:
    `(invoice, whatsappNumber, terms?: { current?: SmsTermInfo | null; next?: SmsTermInfo | null })`
  - Build the message using identical logic to `shareInvoiceViaSMS` (extract a small shared `buildTermReminderMessage(invoice, terms)` helper and reuse it from both).
  - Open the chat via the simpler `wa.me` link only:
    `window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')`
  - Drop the `whatsapp://` deep link + 800ms fallback dance (no PDF, no link in body).
- Keep `normalizeWhatsAppTarget` (digits-only) — `wa.me` requires no leading `+`.

**2. `src/components/dashboard/BranchDashboard.tsx`**

- Add a `handleShareWhatsApp(invoice)` mirroring `handleShareSMS`:
  - Resolve mobile number (`whatsapp || phone`).
  - Fetch full invoice items, branch country, active template `bank_transfer_info`.
  - Resolve term context with the same chain already used for SMS:
    invoice line-item `term_id` → `getUpcomingTerm` → `getCurrentTerm`/`getMostRecentTerm`/`getNextTerm` fallback.
    Compute `endingTerm = getPreviousTerm(branchId, upcomingTerm.start_date)`.
  - Call `shareInvoiceViaWhatsApp(invoiceData, number, smsTerms)`.
- Wire this to the existing green WhatsApp icon in the Invoice & Payment row (currently wired to the older simple WhatsApp handler / `InvoiceManagementList`'s version on this page).

**3. `src/components/sales/InvoiceManagementList.tsx`**

- Update `handleShareWhatsApp` to also build and pass the term context, using the same resolution chain as Branch Dashboard's SMS handler. Extract the chain into a tiny helper (e.g. `src/utils/invoiceTermContext.ts → resolveInvoiceTermContext(invoice, fullInvoice)`) and call it from both `BranchDashboard.handleShareSMS`, `BranchDashboard.handleShareWhatsApp`, and `InvoiceManagementList.handleShareWhatsApp` to avoid drift.

### Files NOT changed

- SMS templates and SMS handlers (visible behavior unchanged).
- PDF generation.
- Phone storage / normalization rules.
- Overdue SMS button.

### Verification

1. Branch Dashboard → Hannah's Term 2 2026 invoice → click green WhatsApp icon → `wa.me` opens a chat with her number, prefilled message reads:
   *"We have now reached the end of Term 1 2026. Term 2 2026 will commence next week and will run from 28/04/2026 to <Term 2 end>. … Items … Total … Bank Transfer … Gaonhae Taekwondo (Morley)."*
2. Sales → Invoice Management → same green WhatsApp icon on a SG invoice → identical message structure with SG dates and ANEXT BANK details.
3. Invoice with no `term_id` on items but an upcoming term exists → uses upcoming as next, previous as ending.
4. Invoice with no `term_id` and no upcoming term → falls back to current/most-recent term as ending and next chronological term as next; if name still missing, derives "Term N+1 YYYY" from the ending term name.
5. Student with no `whatsapp` and no `phone` → toast: "No mobile number on file for this student", no chat opens.
6. SMS buttons (blue + red) → unchanged behavior and copy.
7. No PDF download is triggered when clicking WhatsApp.

### Out of scope

- Attaching the PDF to WhatsApp (web `wa.me` cannot attach files).
- Email share, SMS templates, overdue WhatsApp variant.
- Phone number storage or country-code normalization.

