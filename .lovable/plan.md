# Prefill school-fee choices from past invoices

On the matched-student school-fees step in `/hello`, automatically select the student's most recent applicable fee type and payment option when reliable invoice history exists.

## Changes

1. Add a secure, session-validated Supabase function that returns the matched student's latest non-cancelled school-fee choice:
   - Fee product ID and name.
   - Payment plan: `four_weeks` or `term`.
   - Prefer explicit `payment_plan` invoice metadata.
   - For older invoices without that metadata, infer `four_weeks` only when the billed quantity/weeks clearly equals four; otherwise treat a term-based school-fee invoice as `term`.

2. Load this preference after `/hello` has matched the student and loaded the branch's available school-fee products.

3. Apply the preference only when it is still valid:
   - Automatically select the matching fee card.
   - Automatically highlight **4 weeks** or **Full term**.
   - Keep the existing current-term four-week lock as the highest-priority rule.
   - Fall back to the current defaults when no history exists, the old product is inactive/unavailable for the branch, or the history is ambiguous.
   - Do not overwrite a choice the student has already made during the current visit.

4. Verify the full flow for students with explicit modern history, older invoice history, unavailable past products, and no usable history.

## Technical details

- Reuse invoice and invoice-item history; no new table is required.
- Protect the lookup with the existing public-chat session validation so anonymous visitors cannot query another student's history.
- Keep manual selection available after prefilling.
- Scope this change to the `/hello` flow shown in the reference; the standalone `/fees` form cannot safely use student history before it identifies and verifies a student.
