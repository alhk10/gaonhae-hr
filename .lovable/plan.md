## Why the duplicates appear

The `/grading-list` page calls the `get_public_grading_list` RPC, which `UNION ALL`s two sources:

1. `grading_registrations` (joined to the invoice) — shows the belt transition (e.g. `Red → Black Tip`), no amount/proof.
2. `grading_payment_submissions` — shows the submitted belt, amount, and proof image.

When a public submission is verified and then **Imported as Invoice**, a `grading_registration` row is created and the submission gets `matched_invoice_id` set + `status = 'verified'`. But the RPC only filters out `status = 'rejected'`, so the verified-and-imported submission keeps appearing alongside the new registration. That is exactly what is shown for VIHAAN RAMM, XINYUAN CHARLES LIU, DAYEN XUAN RONG TAN and SAISHA BANERJEE — one registration row (transition belt, no $) + one submission row (single belt, with $ and proof).

## Fix

Update `public.get_public_grading_list` so the submission branch of the UNION also excludes rows that have already been imported into an invoice:

```sql
WHERE gps.status <> 'rejected'
  AND gps.matched_invoice_id IS NULL   -- new
  AND (gs.grading_date IS NULL OR ...)
  AND (p_branch_id IS NULL OR gps.branch_id = p_branch_id)
```

Everything else in the function stays identical (same columns, same registration branch, same ordering, same SECURITY DEFINER + search_path).

## Effect on the affected rows

- VIHAAN RAMM (Balmoral, Red → Black Tip): submission row disappears, registration row remains. The Kembangan VIHAAN RAMM row is a separate submission with its own invoice — unaffected.
- XINYUAN CHARLES LIU: Balmoral `Green Tip → Green` registration kept; the duplicate `Green Tip` Kembangan submission (row 5) is hidden once imported. The other Kembangan submission (row 4, pending verification, not yet imported) stays.
- DAYEN XUAN RONG TAN: Balmoral registration kept, Jurong West submission hidden.
- SAISHA BANERJEE: registration kept, Kembangan submission hidden.

Pending-verification and not-yet-imported submissions continue to show normally. Rejected submissions stay hidden as today.

## Verification

After the migration:

```sql
SELECT source, student_name, current_belt, target_belt, paid_status, amount
FROM public.get_public_grading_list(NULL, '2026-06-28', '2026-06-28')
WHERE student_name IN (
  'VIHAAN RAMM','XINYUAN CHARLES LIU','DAYEN XUAN RONG TAN','SAISHA BANERJEE'
)
ORDER BY student_name, source;
```

Expect each of the four names to appear once per grading slot (registration only) for the imported cases, with their original pending-verification submissions (if any) still listed.

No frontend changes required.
