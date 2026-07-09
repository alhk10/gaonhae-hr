## Problem

On `/hello`, students from non-Singapore branches (e.g. Kayden — Morley, Australia) are still seeing **PayNow** as a payment option, even though PayNow is Singapore-only. The current guard in `PublicHelloChat.tsx` only hides the PayNow `<SelectItem>` when `isSGBranch` is true, which is fragile:

- If `branch` hasn't loaded yet when the user reaches the payment step, or the user reached the payment step before the branch data resolved, the trigger can still display an unintended value.
- The PayNow QR / info card is still rendered based purely on `payMethod`, so if `payMethod` ever ends up as `'paynow'` for an AU branch, the QR shows.
- There is no server-side stripping — the RPC returns `paynow_qr_url` regardless of branch country.

## Fix

Harden `/hello` payment selection so PayNow is impossible for non-Singapore branches, and defense-in-depth on the server.

### 1. `src/pages/public/PublicHelloChat.tsx`

- Introduce a single derived flag `paynowAllowed = isSGBranch`.
- Build an `allowedMethods` array (`['paynow','bank_transfer']` for SG, `['bank_transfer']` otherwise) and render `<SelectItem>` from it — no inline conditional.
- Force-normalize `payMethod`: whenever `paynowAllowed` becomes false, if `payMethod === 'paynow'` reset to `'bank_transfer'` (covers async branch load and any stale state).
- Pass `paynowQrUrl={paynowAllowed ? paymentOptions?.paynow_qr_url : null}` to `PaymentInfoDisplay` so even a mis-set `payMethod` cannot render the SG QR for AU users.
- Keep the existing GST breakdown untouched.

### 2. `supabase/functions` / RPC `get_public_payment_options`

Add a new migration that updates `get_public_payment_options` to return `paynow_qr_url = NULL` when the branch's `country` is not `'Singapore'` (case-insensitive). This guarantees no non-SG branch can ever receive a PayNow QR from the backend.

## Out of scope

- Other public payment pages (grading/seminar/competition/guards) — only `/hello` was reported. If the same pattern exists there we can follow up in a separate task.
- Bank transfer info content, GST display, or any product/pricing logic.

## Verification

- Load `/hello` as a Morley (AU) student → payment step shows only "Bank Transfer" in the dropdown, no PayNow QR rendered, `payMethod` submitted as `bank_transfer`.
- Load `/hello` as a Singapore branch student → PayNow still available and defaults to PayNow as today.
- `supabase--read_query` confirms `get_public_payment_options` returns null `paynow_qr_url` for Morley.
