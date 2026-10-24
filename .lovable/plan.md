# /hello duplicates, transaction code, Foundation grading, auto-verify

## 1. Prevent duplicate /hello submissions
- Lock the Submit/Pay button as soon as it's pressed and keep it locked until the result comes back. This covers grading, school fees, uniforms, guards, competition and outstanding-invoice payments.
- Give every checkout one reference that stays the same across retries. The server returns the existing record instead of creating a second one.
- Server check: if the same student already has a pending or verified submission with the same items (same grading slot and level, same competition event, or the same products and sizes) from the last 24 hours, show "Already submitted" with the existing reference instead of saving again.
- Fix the current per-session check so a second, different purchase in the same session isn't mistaken for the first one.
- Fix grading checkout so it finishes on the thank-you screen instead of jumping to /access.

## 2. Show the transaction code on success
- The thank-you screen shows the invoice/payment reference (for example INV-202610-0145 / GP2610148571 / COMP-…) with a Copy button, the amount, and "Pending verification" or "Verified".
- Competition entries show their reference the same way.

## 3. Grade Foundation 1, 2 and 3 together
- A student can pay for any mix of Foundation 1, 2 and 3 in the same grading slot and term.
- The duplicate-grading block and the one-grading-per-term rule compare the level, so different Foundation levels aren't flagged. Paying for the same level twice is still blocked.
- On a Pass, belt advancement moves up to the highest Foundation level paid for.

## 4. Automatic verification and invoicing
Applies to Grading, Competition, and Uniforms & guards submissions, whether they come from /hello or from staff lists.
- Auto-verify only when all of these hold:
  - the student is matched;
  - the screenshot was read and its amount matches the amount due exactly, to the cent (the current $0.05 allowance is removed everywhere, including school fees and outstanding-invoice scans, so $539.55 against $539.60 is not a match);
  - the payment isn't cash or credit;
  - the submission hasn't been rejected or flagged as a duplicate.
- Then the system does what staff do today with **Verify payment** followed by **Import as Invoice**. It creates or links one invoice, marks it paid and verified, records the payment, and uses credit first. It never creates a duplicate invoice.
- This runs as soon as the screenshot scan finishes, and again whenever a staff member re-matches a submission.
- Catch-up: existing pending rows that already meet the conditions (for example SARINA MARIE MCGOLDRICK, $309.89) are processed once.
- Anything that doesn't qualify (unreadable screenshot, wrong amount, unmatched) stays in the list for manual review, as now.
- An "Auto-verified" tag goes into the staff log and match history.

## Technical details
- The client sends a `client_ref` (`newClientRef`) on `submit_public_chat_invoice` and on the competition, grading and guards RPCs. Add a unique partial index on (`client_ref`) and use an "on conflict, return existing" pattern. Replace the `internal_notes LIKE session=` lookup.
- Add a 24-hour item-fingerprint guard in each submit RPC.
- Make the grading duplicate trigger key on (student, slot, product) instead of (student, slot).
- Add a new SECURITY DEFINER `try_auto_verify_submission(kind, id)`. It reuses the existing `admin_verify_*` and `admin_match_*` and import paths internally, and is idempotent through `matched_invoice_id` / `invoice_id`. Call it from the scan-recording step and the match RPCs, plus a one-off backfill.
- Add regression tests for the auto-verify eligibility rule and for Foundation multi-level duplicate keys.
