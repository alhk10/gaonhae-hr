## Plan — Bulk print selected student certificates

Scope: Add a bulk certificate print/download action to the grading list screens. No database changes.

### 1. Add bulk certificate action for selected students
- Add a **Print Certificates (N)** button near the existing grading list bulk actions in:
  - `BranchGradingList.tsx`
  - `GradingListTab.tsx`
- The button uses the current selected student rows.
- It only prints students eligible for certificates:
  - `result = pass` prints 1 certificate
  - `result = double` prints 2 certificates
- Students without `pass` or `double` are skipped.

### 2. Generate one combined PDF
- Add a bulk PDF helper to the existing grading certificate PDF generator.
- Instead of downloading one file per student, generate **one PDF file** containing all selected certificates.
- Each certificate keeps the existing certificate layout, scorecard, belt text, pass styling, height/weight labels, and current PDF rules.

### 3. Double pass handling
- For students with `result = double`, include both certificates in the same combined PDF:
  - Certificate I for the first promotion
  - Certificate II for the second promotion
- The bulk print should therefore produce 2 certificate sets for each double-pass student.

### 4. Payment warning before printing
- If selected students include unpaid grading records, show one confirmation dialog before generating.
- The dialog lists unpaid students and asks whether to continue.
- If confirmed, proceed with eligible certificates.

### 5. User feedback and edge cases
- Show a toast after generation with a summary, for example:
  - certificates generated
  - students skipped because they are not pass/double
- If no selected students are eligible, show a clear message and do not generate a PDF.

## Technical details
- Reuse the existing single-certificate generation logic where possible to avoid duplicating certificate layout code.
- Keep existing certificate button behavior in the Actions column unchanged.
- Do not change grading results, payment status, certificate eligibility, or database structure.
- Apply the feature consistently in both grading list implementations.