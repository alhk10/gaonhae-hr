# Update proof of payment wording on /hello

- On the /hello payment screens (school fees/outstanding invoices and other checkouts), change the "Proof of Payment *" label to: "Please upload your payment proof to complete payment process. *"
- Make it slightly larger (one step up from the current size).
- Staff screens and photo/certificate uploads keep their current labels.

## Technical
- `PublicHelloChat.tsx`: pass the new `label` to the payment `ProofOfPaymentUpload` usages (~L2664, ~L2755).
- `ProofOfPaymentUpload.tsx`: add optional `labelClassName` prop; /hello passes `text-base`.
