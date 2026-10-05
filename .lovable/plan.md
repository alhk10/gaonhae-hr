# Morley: grading scores on /access, printed on certificates

## What changes

1. **Score entry (Morley rows only), inline on a second line.** On the /access Grading tab, each Morley student gets a second line directly under their row with small labelled boxes:
   - Height (cm), Weight (kg), with BMI shown automatically
   - Poomsae, Balchagi, Kyorugi, Hoshinsul (scores out of 10)
   - Push-ups, Leg Raises, Air Squats
   
   Each box saves itself shortly after you stop typing; there's no Save button. On phones the boxes wrap onto extra lines. If you haven't picked a result by hand, Pass, Double or Fail is set from the scores, the same way the branch dashboard does it today. A result you've picked yourself is never overwritten.
2. **Certificate PDF (Morley only).** Certificates downloaded for Morley students, one at a time or several together, include the second page with the scores table and the result. Other branches' certificates stay exactly as they are now: one page, no scores.
3. **Who can use it.** Staff signed in with the Morley password or the all-branch password, in edit mode. Other branch passwords won't see the button.

## Notes

- Scores can only be saved once the student has a grading record. Students who paid through the public form but haven't been matched yet show the boxes greyed out with "Match student first".
- The scores are the same ones staff see in the branch dashboard grading list, so both stay in sync.

## Technical notes

- New SECURITY DEFINER RPC `admin_update_grading_scorecard(p_registration_id uuid, p_scorecard jsonb)`. It merges labels into `grading_registrations.scorecard` and recomputes `result` (pass/double/fail bands matching `computeAutoResult`) unless `result_manual_override` is set. It rejects registrations whose slot branch isn't Morley.
- Extend `get_public_grading_list` to return `scorecard` (from `grading_registrations`; null for submission rows). Add the field to `PublicGradingListRow`.
- `PublicGradingList.tsx`: after each Morley `TableRow`, render a second `TableRow` with one full-width `TableCell` (`colSpan` = column count) holding a flex-wrap row of compact labelled inputs. Labels come from `DEFAULT_SCORECARD_LABELS`, with BMI via `computeBmi`. Each input debounces 400 ms, then calls the RPC. This reuses the `InlineScorecardCell` pattern, but saves through the RPC instead of a direct table write. Gate on `r.branch_name === 'Morley'` and edit mode. In `rowToCertInput`, pass `scorecard: isMorley ? r.scorecard ?? [] : []` and `result`. The PDF generator already adds page 2 only when the scorecard has content.
- Verify: enter scores for a Morley student, check the result updates, then download a certificate and confirm page 2 shows the scores. Confirm a Balmoral certificate is unchanged.
