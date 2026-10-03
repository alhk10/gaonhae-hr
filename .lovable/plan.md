# Restore PayNow QR and bank details for student payments

## Current state (verified)

- The active Singapore invoice template has **no bank transfer details and no PayNow QR saved** — both were cleared on 30 Sep when the template was edited, and the QR image was deleted from storage at that time. The old values cannot be recovered from the database or storage.
- The Australia template still has its bank details (GAONHAE TAEKWONDO, BSB 803-439, account 238 648 651) and is unaffected.
- Because the Singapore fields are empty, the /hello payment screen (and other public payment forms) correctly show nothing under PayNow / Bank Transfer.

## Outcome

Students paying Singapore branch fees see the PayNow QR code and/or bank transfer details again on the payment screen, and new Singapore invoice PDFs include them.

## Changes

1. You provide the Singapore payment details once more:
   - The PayNow QR code image (upload it in chat), and/or
   - The bank transfer text (account name, bank, account number).
2. I upload the QR image to the `invoice-qr-codes` storage bucket and save both values onto the active Singapore invoice template.
3. Verify the /hello payment screen shows the QR and bank details for a Singapore branch student, and that a newly generated Singapore invoice PDF includes them.

## Technical details

- Data update only: one `UPDATE` on the existing active `SG` row in `invoice_templates` (bank_transfer_info, paynow_qr_url). No schema or code changes — the display components already render these fields when present.
- No historical invoices are modified.
