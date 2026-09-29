# Print All Certificates button (Branch Dashboard > Grading)

## What changes
- Add a **Print All Certificates (N)** button next to the existing **Print** button on the Students for Grading list. It shows all the time; you don't need to tick any students first.
- It prints certificates for **every student currently showing in the list**, so it follows the chosen term and filter (All / Missing Details / Ready for Printing / Yet to Receive).
- **N** counts the certificates, not the students. A double promotion counts as 2.
- **Double promotion:** each double student gets 2 certificates, one after the other:
  - Certificate I: the belt they passed from (for example, Red Tip)
  - Certificate II: the next belt up (for example, Red)
  - Each certificate is followed by its scorecard page.
- Students who can't get a certificate are left out, and a short message says how many were skipped. This covers students whose result isn't Pass or Double, students with no grading date, and Poom/Dan belts.
- If any included student hasn't paid for grading, the same "Print Anyway?" warning appears as for selected-student printing.
- The button is disabled while certificates are generating, and for branches that don't have a certificate template yet (same rule as today).
- The existing "Print Certificates (selected)" button stays as it is.

## Technical details
- File: `src/components/dashboard/BranchGradingList.tsx` only.
- New handler `handlePrintAllCertificates` runs the existing `buildBulkInputs(displayedStudents)`. That function already adds a second input for `double` using `getNextBeltLevel`. The handler then uses the existing unpaid-warning dialog and `runBulkDownload`.
- The button count comes from `buildBulkInputs(displayedStudents).inputs.length`, memoised.
- The file is saved as `Certificates_All_<date>.pdf`, passed to `runBulkDownload` as a filename prefix.
