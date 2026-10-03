# Restore Singapore PayNow QR and bank details

## Outcome

Students paying Singapore branch fees see the PayNow QR code and bank transfer details again on the /hello payment screen (and other public payment forms), and new Singapore invoice PDFs include them.

## Changes

1. Upload the supplied PayNow QR image to the public `invoice-qr-codes` storage bucket.
2. Update the active Singapore invoice template (`invoice_templates`, country `SG`) with:
   - `paynow_qr_url` — public URL of the uploaded QR image
   - `bank_transfer_info`:
     ```text
     ACCOUNT NAME: GAONHAE TAEKWONDO LLP
     BANK: ANEXT BANK PTE LTD
     ACCOUNT NUMBER: 11100167649
     SWIFT CODE: ANTPSGSGXXX
     REFERENCE: Student name
     ```
   - PayNow UEN: T18LL1687K (shown as part of the PayNow details where the template supports it; the QR itself encodes it)
3. Verify: query the template row to confirm the saved values, then load the /hello payment screen for a Singapore branch student and confirm the QR and bank details render.

## Technical details

- Data update only: one storage upload plus one `UPDATE` on the existing active `SG` row in `invoice_templates`. No schema or code changes — the display components (`PaymentInfoDisplay`, PDF generator) already render these fields when present.
- The Australia template is untouched.
- No historical invoices are modified.
