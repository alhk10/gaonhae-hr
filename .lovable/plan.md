# Fix missing PayNow QR on public payment page

## Root cause

The DB has two active `invoice_templates` rows, both with `branch_id = NULL`. Only one has `paynow_qr_url` set. The `get_public_payment_options` RPC currently orders by:

```
ORDER BY (it.branch_id = p_branch_id) DESC NULLS LAST
```

Both rows tie (NULL comparison), so Postgres may return the row without a QR — which is what's happening in the screenshot (PayNow selected, no image shown).

## Fix

Migration: update `get_public_payment_options` to prefer templates that actually have a PayNow QR, then by branch match.

```sql
ORDER BY
  (it.paynow_qr_url IS NOT NULL) DESC,
  (it.branch_id = p_branch_id) DESC NULLS LAST
```

No frontend changes needed — `PaymentInfoDisplay` already renders the QR correctly when `paynowQrUrl` is provided.

## Out of scope

- Cleaning up the empty duplicate template row (data fix, not a schema fix).
- Changes to bank transfer details.
