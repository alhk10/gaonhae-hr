# Remove grading scorecard page for Singapore branches

## What changes
- Grading certificate PDFs for Singapore branches (Balmoral? no — all branches whose country is Singapore, e.g. Bukit Merah, Carpe Diem Stradia) will contain only the certificate page. The second "GRADING SCORECARD" page is no longer added.
- Applies everywhere a certificate is downloaded: student profile grading records, /access Grading tab (single and bulk), branch dashboard and sales grading lists.
- Australian branches keep the scorecard page exactly as today.
- Scorecard entry columns in the grading lists are left unchanged.

## Technical details
- In `src/utils/gradingCertificatePDFGenerator.ts`, make `hasScorecardContent` return false when `branchCountry` is SG/Singapore (same `isSG` test already used in the file). All single, bulk and double-certificate paths already go through this check.
