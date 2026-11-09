# Fix Yui Cheung's belt and make the certificate icon download

## Rule
A grading product named "X >> Y" means the student grades at belt X and becomes belt Y when they pass. Yui's 19/09/2026 grading was "Red Tip >> Red", so after passing she is a **Red** belt.

## What I found
- Yui's 19/09/2026 grading record says Blue → Red. The "from" belt should be Red Tip.
- Her profile belt still shows **Red Tip**, because the automatic belt update skips belts that staff changed by hand.
- In the profile's Grading list, the grey medal icon is only a placeholder and does nothing when clicked.

## Changes
1. **Fix Yui**
   - Change her 19/09/2026 grading to **Red Tip → Red**, Pass, on both the registration and her grading record.
   - Set her profile belt to **Red**.
2. **Follow the invoice line from now on**
   - When a passed grading is linked to a grading invoice line "X >> Y", use X as the starting belt and Y as the new belt. This applies to both the grading record and the automatic belt update.
3. **Check for the same mistake elsewhere**
   - List other passed gradings whose booked belts don't match their invoice line, or whose profile belt is behind the passed result.
   - Report them to you without changing them.
4. **Certificate download**
   - The medal icon on Pass/Double rows becomes a button.
   - Clicking it downloads that grading's certificate PDF, using the same design as the Grading tab.
   - Uploaded certificate images keep their existing view icon.

## Technical
- Data fix through `run_sql` on `grading_registrations` (`current_belt`/`target_belt`), `student_grading_history` (`belt_from`/`belt_to`) and the student's belt.
- Update the registration-to-history sync trigger: when the linked `invoice_item` description matches "X >> Y", it overrides the booked belts.
- In `GradingRecordsSection`, load the name, country and scorecard from `grading_registration_id`, then call `downloadGradingCertificatePDF`.
