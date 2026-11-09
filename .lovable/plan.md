# Fix Yui Cheung's grading record and make the certificate icon download

## What I found
- Yui's 19/09/2026 grading was booked from **Blue to Red**, so her grading record says Red. Her invoice line says "Red Tip >> Red".
- Her profile belt already shows **Red Tip**. It was left alone because staff had changed it by hand.
- In the Grading list on her profile, the grey medal icon is only a placeholder. It does nothing when clicked.

## Changes
1. **Fix Yui's record**
   - Change her 19/09/2026 grading to **Blue → Red Tip** on both the grading registration and her grading record.
   - Keep her belt as Red Tip.
2. **Check for the same mistake elsewhere**
   - List other passed gradings where the booked target belt doesn't match the next belt in order, or doesn't match the invoice line.
   - Report them to you without changing them.
3. **Certificate download**
   - In the profile's Grading list, the medal icon on Pass/Double rows becomes a button.
   - Clicking it downloads that grading's certificate PDF. It uses the same certificate design as the Grading tab, filled with the student's certificate name, the belt achieved, the grading date and the scorecard.
   - Uploaded certificate images keep their existing "view" icon.

## Technical
- Data fix through `run_sql` on `grading_registrations.target_belt` and `student_grading_history.belt_to`, with history ID `f94f996e…` and registration ID `2d561d16…`.
- `GradingRecordsSection` needs the student name, branch country and scorecard per history row. Load them from the linked `grading_registration_id`, the same way the Grading tab does, then call `downloadGradingCertificatePDF`.
