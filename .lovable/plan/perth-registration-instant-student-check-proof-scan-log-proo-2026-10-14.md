# Perth registration: instant student check, proof scan, log proof icon

## What changes for the parent
1. **Instant student check** — when "I am a Gaonhae Taekwondo student" is ticked (and first name, last name and date of birth are filled), the form checks our records straight away, and again if those details change.
   - Match: shows a green "Gaonhae student confirmed — $40 rate" note; total uses $40.
   - No match: shows "We couldn't match these details to an active Gaonhae student, so the $45 rate applies.", unticks and greys out the checkbox (re-enabled if name/DOB are edited), and the total uses $45.
   - If name or DOB is missing when ticked, a hint asks to fill them first.
2. **Proof scan on upload** — the payment screenshot is read as soon as it's uploaded and compared with the total due (AUD). Shows the same match / mismatch / couldn't-read notice used elsewhere. It re-checks if the total changes. Mismatch is a warning, not a block (consistent with other forms; staff review it).
3. **Staff log** — each registration row shows a receipt icon (opens the proof) plus a coloured badge: green "Amount matches", amber "Amount differs ($X)", grey "Not read".

## Technical details
- New public SECURITY DEFINER RPC `check_perth_gaonhae_student(first, last, dob)` returning only a boolean, using the same rule as submit (uppercase name match, DOB ±1 day, status active/trial). Granted to anon. No student data returned.
- Debounced (~500ms) call in `PublicPerthComp.tsx`; `unit` derived from the confirmed result; submit still re-verifies server-side.
- Add `proof_scan_status`, `proof_scan_amount`, `proof_scan_details` columns to `perth_event_registrations`; `submit_perth_event_registration` accepts and stores them (mismatch allowed).
- Use `usePaymentProofScan` with currency `AUD`, `PaymentProofScanNotice` under the upload; `waitForResult()` before submit.
- Log row: `Receipt` icon link + scan badge; include scan status column in log PDF.
