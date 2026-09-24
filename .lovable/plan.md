# Correct Australian GST and bank-transfer details

## Result

For Australian branches such as Morley, a listed fee of **$390.00 remains $390.00** because it already includes 10% GST. The payment summary will show:

- Total: **$390.00**
- GST (10% incl.): **$35.45**
- Amount to pay: **$390.00**

The bank-transfer panel will show:

- Account name: GAONHAE TAEKWONDO
- BSB: 803-439
- Account number: 238 648 651

## Changes

1. Update `/hello` pricing so Singapore GST remains added on top, while Australian GST is extracted from the displayed price rather than added again.
2. Update the `/hello` invoice function to store Australian lines and totals as GST-inclusive: subtotal plus extracted GST equals the submitted $390 total. Singapore remains GST-exclusive.
3. Correct the payment-options lookup to select the active invoice template by branch country, preventing the Singapore template from being returned for Australian branches.
4. Update the existing Australian invoice template with the supplied account details.
5. Verify the Morley payment screen, submitted payment amount, invoice subtotal/GST/total, and bank details together.

## Technical details

- Frontend and database calculations will follow the existing country tax setting: Australia inclusive, Singapore exclusive.
- No historical invoice totals will be changed in this task.
- Database function changes will remain `SECURITY DEFINER` with the existing restricted access pattern.
