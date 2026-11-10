# Separate grading lines and certificates for combined Foundation gradings

## Cause (confirmed)
Xinyi's invoice has three Foundation grading lines, but only one grading record exists. My earlier fix joined the three lines into a single "Foundation 1 >> White" result, so her profile shows one **White** line and offers one certificate. Kaden and Arrissa are in the same state.

## Fix
1. **One grading record per Foundation line.** When an invoice has F1 >> F2, F2 >> F3 and F3 >> White, each line gets its own grading record in the same slot.
2. **Results apply to the whole set.** Marking Pass, Fail or Double on one record of a combined Foundation set applies the same result to the others, so staff mark it once.
3. **Profile shows each step.** The student's Grading section lists:
   - Foundation 1 · Pass, with its certificate
   - Foundation 2 · Pass, with its certificate
   - Foundation 3 · Pass, with its certificate

   The belt still ends at **White** after the last step.
4. **Undo the joined result.** Remove the chaining I added earlier, so each record uses only its own line.
5. **Repair existing students.** Rebuild the records for Xinyi, Kaden and Arrissa, and any other invoice with several Foundation lines but only one record, with the 08/10/2026 Pass copied to each line.
6. **Grading list.** A student in a combined set appears once, labelled "Foundation 1–3", so the list isn't cluttered. Downloading certificates from the list gives one certificate for each step.

## Technical notes
- A database trigger on `grading_registrations` insert/update syncs result and slot to sibling registrations that share an `invoice_id` and Foundation lines. A guard flag prevents the trigger from re-firing on its own updates.
- Revert the chaining loop in `_grading_effective_belts`, and remove `chainFoundationLines` and its test. Add a test that the three lines produce three certificate belts: Foundation 1, Foundation 2 and Foundation 3.
- Backfill: insert the missing sibling registrations from their invoice lines (`invoice_item_id`, `current_belt`/`target_belt` from each line, the same slot, term and result). The existing history sync then creates one history row per registration.
- Grading list grouping by `invoice_id`, in the `/access` grading list and the certificate download.
