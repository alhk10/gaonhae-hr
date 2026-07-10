## Problem

`/hello`, `/comps`, `/pay`, `/guards`, and `/seminars` all load payment info from one RPC — `get_public_payment_options`. When a Singapore branch is selected the PayNow QR does not show.

Root cause is in the RPC's template lookup. There are two active rows in `invoice_templates` with `branch_id = NULL`:
- one with `paynow_qr_url` set
- one with `paynow_qr_url = NULL`

Current SQL:

```sql
ORDER BY (it.branch_id = p_branch_id) DESC NULLS LAST
LIMIT 1
```

For SG branches (which have no branch-specific template) both global rows tie and Postgres returns the one without a QR. Verified: `SELECT * FROM get_public_payment_options('headquarters','White')` returns `branch_country: Singapore` with `paynow_qr_url: NULL`, so `PaymentInfoDisplay` renders nothing on all five public pages.

## Fix

Update `get_public_payment_options` template selection to be deterministic and prefer rows that actually carry payment info:

```sql
ORDER BY
  (it.branch_id = p_branch_id) DESC,
  (it.paynow_qr_url IS NOT NULL) DESC,
  (it.bank_transfer_info IS NOT NULL) DESC,
  it.updated_at DESC NULLS LAST
LIMIT 1
```

Keep the existing Singapore-only guard that strips `paynow_qr_url` for non-SG branches. Because all five pages (`PublicHelloChat`, `PublicCompetitionPayment`, `PublicGradingPayment`, `PublicGuardsPurchase`, `PublicSeminarPayment`) already read `paynow_qr_url` from this RPC and render it via `PaymentInfoDisplay`, no frontend changes are needed — the QR will appear automatically for every SG branch after the migration.

## Out of scope

- Not deduping the two global `invoice_templates` rows — that's a data-cleanup task the user can do in Sales Settings.
- Not changing which payment methods are offered on `/comps`, `/pay`, `/guards`, `/seminars` for non-SG branches. Those pages currently always show PayNow in the dropdown; the user only asked to ensure PayNow + QR appear for SG, not to restrict AU. Say the word if you also want PayNow hidden for AU branches on those four pages (like `/hello` already does).
