## Restrict PayNow to Singapore branches on `/hello`

Kayden is at Morley (Australia) but the payment step shows PayNow. PayNow is a Singapore-only rail, so students at Australian branches shouldn't see it.

### Change (frontend only)

File: `src/pages/public/PublicHelloChat.tsx`

1. Use the existing `isSGBranch` flag (already computed from `branch?.country`).
2. In the payment-method `Select` (~line 1328–1334): only render the `PayNow` `SelectItem` when `isSGBranch` is true. Always render `Bank Transfer`.
3. Change the initial `payMethod` state (line 185) so it defaults to `bank_transfer`, and add an effect that sets it to `'paynow'` only when `isSGBranch` becomes true (keeps the current SG default). For non-SG branches this guarantees the selected method is `bank_transfer` and the PayNow QR block never renders.

### Out of scope

No changes to other public payment pages (grading, seminar, guards, competition) or the staff-facing invoice dialogs — this fix is scoped to the `/hello` chat flow the user reported. Happy to extend to those flows if you want.