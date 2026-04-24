

## Plan: Fix sibling-merge silently falling back to single-invoice message

### Root cause

In `src/components/dashboard/BranchDashboard.tsx`, `buildShareInvoicePayload` resolves the clicked student's email via `getStudentById(invoice.student_id).catch(() => null)`. When that service call returns `null` (transient error, RLS edge, or logging side-effect), `clickedEmail` becomes `''` and the function silently returns just the clicked invoice — no toast, no warning. This explains why clicking SMS on Leah Giam produces a single-invoice message even though Eli and Phoebe share the same email and have active draft invoices in the same branch.

### Fix

Make email resolution direct, simple, and observable.

1. **Replace** `getStudentById(...).catch(() => null)` with a direct Supabase query inside `buildShareInvoicePayload`:
   ```ts
   const { data: clickedStudent, error: stuErr } = await supabase
     .from('students')
     .select('id, first_name, last_name, email')
     .eq('id', invoice.student_id)
     .maybeSingle();
   if (stuErr) console.warn('[ShareInvoice] failed to load clicked student', stuErr);
   ```
   Removes the `.catch(() => null)` swallow and the service-layer logging side-effects.

2. **Trim+lowercase** the email defensively; if still empty, log a warning so the silent fallback becomes diagnosable:
   ```ts
   const clickedEmail = (clickedStudent?.email ?? '').trim().toLowerCase();
   if (!clickedEmail) {
     console.warn('[ShareInvoice] No email on clicked student → single-invoice send', { studentId: invoice.student_id });
     return { invoices: [clickedPayload], terms, bankInfo };
   }
   ```

3. **Surface silent failures** of the sibling lookups (errors are currently destructured but ignored):
   ```ts
   const { data: siblings, error: sibErr } = await supabase.from('students')...
   if (sibErr) console.warn('[ShareInvoice] sibling lookup failed', sibErr);

   const { data: siblingInvoices, error: invErr } = await supabase.from('invoices')...
   if (invErr) console.warn('[ShareInvoice] sibling invoices lookup failed', invErr);
   ```

4. **Keep** the existing status filter `['draft','sent','unpaid','partial','partially_paid','overdue']` and the `balance_due > 0` post-filter — both already correct (verified against DB for Leah Giam / Eli / Phoebe and Eden / Ejun).

5. **No change** to `buildCombinedReminderMessage`, the SMS/WhatsApp send paths, the discount-line logic, or term-context resolution — those are correct once the multi-invoice branch is taken.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` — only `buildShareInvoicePayload`. No other call sites change. No DB / edge function changes.

### Verification

1. **Leah Giam family** (email `trinh.tpm@gmail.com`): click SMS on Leah Giam's invoice → message opens 3 student blocks (Eli, Leah Giam, Phoebe), each with items, subtotal; Grand Total = $795.00; intro reads "your children" (plural); bank info + signature.
2. **Leah You family** (sibling: GENIE You): click SMS on Leah You's invoice → both Leah You and Genie You blocks merged into one message; Grand Total = sum of their balances; intro "your children".
3. **Eden Jung family** (sibling: EJUN Jung): click SMS on Eden Jung's invoice → both Eden and Ejun blocks merged; Grand Total = sum of their balances; intro "your children".
4. **No siblings**: click SMS on a student with a unique email → falls back to single-invoice template, intro "your child", no regression.
5. **WhatsApp button** on each of the above → identical merged body opens in WhatsApp.
6. **Console**: during testing, if a fallback occurs, a `[ShareInvoice]` warning prints the reason (missing email, sibling query error, etc.).
7. **Toast** fires only on the multi-invoice branch: `Combined reminder for {N} invoices across {M} student(s).`

### Out of scope

- Cross-branch sibling merging.
- Matching by phone or WhatsApp number.
- Changing the overdue-reminder template.
- Updating `InvoiceManagementList.tsx` (Sales module).

