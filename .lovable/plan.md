# Make cleared invoice-template payment details stay cleared

## Outcome
Removing bank-transfer information or the PayNow QR code from a country invoice template and saving it removes those details from newly opened invoice PDFs and payment screens that use that template. Existing invoice amounts and payments stay unchanged.

## Changes
1. Fix the template editor so clearing the bank field and removing the QR code are saved explicitly as empty values, and confirm the saved values after the update before reporting success. Avoid deleting an uploaded QR image before the template update succeeds.
2. Check the saved Singapore and Australia template records after saving, then reload the editor and verify the removed details remain absent.
3. Trace invoice PDFs and public payment screens to ensure they read the current active country template and do not restore removed details through an old fallback or stale selection. Hide payment details when the saved field is empty.
4. Verify a newly generated invoice PDF and the relevant public payment display after clearing each field, including reopening an existing invoice.

## Technical details
- The Singapore template row currently still contains both the bank text and PayNow QR URL despite a recent update; the PDF generator displays either field whenever the saved template supplies it. The template editor passes cleared bank text as `undefined` and removes the QR storage object before saving, while the update service sends its payload to `invoice_templates`.
- The public payment options are served separately by `get_public_payment_options`; confirm those values reflect the same updated template. Preserve country-specific selection and existing access rules.
