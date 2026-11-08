# Poom to Dan administrative conversion

## What changes for staff
- Grading a Poom holder only moves them up in Poom (1st Poom >> 2nd Poom >> 3rd Poom >> 4th Poom). It never goes from a Poom to a Dan.
- Grading a Dan holder only moves them up in Dan (1st Dan >> 2nd Dan ...).
- Changing from Poom to Dan, or moving up a Dan by conversion, now needs a conversion invoice, for example "STF 1st Poom to STF 1st Dan Conversion".
- After the conversion invoice is paid, staff change the belt by hand in the student profile. Nothing changes the belt automatically.
- The student profile shows both ranks after a conversion, for example "1st Dan (4th Poom)". The Poom the student held before converting is kept.

## Certificate step after payment
- When a conversion invoice is paid, a "Upload Dan certificate" item appears in Approvals in the branch dashboard and the /access Summary.
- Staff upload a photo of the certificate. The scan checks that:
  - the certificate is from the Singapore Taekwondo Federation,
  - the name matches the student (using the certificate name, if set),
  - and it reads the Date of Issue.
- If both checks pass, the item is marked complete and the Date of Issue is saved as the conversion date for the wait-period rules. If a check fails, staff see what didn't match and can re-upload, or confirm the details by hand with a reason.

## Conversion rules (each one is checked when the conversion invoice is made)
| Conversion | Minimum age | Required rank | Wait since previous conversion |
|---|---|---|---|
| 1st Dan | 15th birthday | any Poom (1st to 4th) | none |
| 2nd Dan | 16th birthday | 1st Dan | 1 year |
| 3rd Dan | 18th birthday | 2nd Dan | 2 years |
| 4th Dan | 21st birthday | 3rd Dan | 3 years |

- A 4th Poom student who turns 15 always converts to 1st Dan first. Later Dan ranks follow the birthday and wait rules above.
- The wait counts from the date of the previous Dan conversion. This is the Date of Issue on the verified certificate, or the invoice's paid date until a certificate is verified.
- If a rule is not met, the invoice form shows the reason and blocks the line. Superadmin can still add it after confirming an override.

## Where you will see it
- Student profile: a "Conversion due" badge when the student is eligible, showing the next conversion and a shortcut to create the invoice.
- Attendance tab: the same "Conversion due" badge next to the student's other badges (Unpaid, No invoice, Ready for grading).
- Invoice form: conversion products show which students are eligible and explain why other students are blocked.
- Belt dropdowns stop suggesting a Dan as the "next belt" after a Poom.

## Conversion due dialog
- Clicking "Conversion due" in Attendance or the student profile opens one dialog with two options:
  - Upload and scan a certificate, for students who already hold the Dan. After approval, this records the conversion without an invoice.
  - Issue a manual conversion invoice for the next conversion the student is eligible for.

## Conversion products (new "Conversion" category, placeholder prices to update later)
- STF 1st Poom > 1st Dan, STF 2nd Poom > 1st Dan, STF 3rd Poom > 1st Dan, STF 4th Poom > 1st Dan
- STF 1st Dan > 2nd Dan, STF 2nd Dan > 3rd Dan, STF 3rd Dan > 4th Dan

## Certificates
- Two types: STF (Singapore Taekwondo Federation) and Kukkiwon. Both are scanned for issuer, name, rank and Date of Issue.
- For Singapore branches, the student's rank and the conversion rules use the STF certificates. Kukkiwon certificates are kept as records.

## Grading section in student profile (placed after Invoices)
- One row for each grading and each conversion: Date of grading or issue, Belt, Result, plus a certificate icon when a certificate has been uploaded. Clicking the icon opens it.

## /hello
- Signed-in students see their grading results and uploaded certificates.
- Students can upload existing STF or Kukkiwon certificates. Each upload is scanned automatically and waits in Approvals for branch staff or superadmin to approve or reject.
- Approved certificates fill in automatically on competition and event forms, the same way passport photos do now. Students can still upload a different one.

## Technical details
- `src/constants/beltLevels.ts`: split the next-belt progression into separate Poom and Dan tracks. Black Tip >> 1st Poom (under 15) or 1st Dan (15+). `getNextBeltLevel` never crosses tracks. Remove the "at 15 they convert to Dan" behaviour.
- New `src/utils/danConversion.ts`: a pure `checkConversionEligibility(belt, dob, lastConversionDate, asOf)` function, plus tests for each birthday, prerequisite and wait boundary.
- Products: create or update STF conversion products for 1st, 2nd, 3rd and 4th Dan, priced per branch the same way as other products. Prices to be confirmed.
- Store on the student: `pre_conversion_poom` (shown in brackets) and `last_dan_conversion_at`. New `student_certificates` table (student, optional invoice, series stf|kukkiwon, rank, source staff|hello, private image path in `student-photos`, scanned issuer/name/rank/issue date, status pending|verified|rejected|manual), with branch-scoped RPCs. A trigger creates the pending row when a conversion invoice becomes paid or verified. The belt stays unchanged.
- The certificate scan runs as an edge function using the Lovable AI vision model. It returns the issuer, name and Date of Issue. Saving the result sets `last_dan_conversion_at` from the Date of Issue.
- `InvoiceDialog.tsx`: check eligibility when a conversion product is added. The database insert path checks the same rules again, so `/access` and the superadmin pages follow the same rule.
- Check the auto-conversion's source (likely the next-belt helper used in grading results and profile suggestions) before changing anything, and cover each place that calls it.

- /hello certificate uploads use the server-checked student session (same as passport photos). Competition and event forms copy the approved certificate into each submission.
- Grading section: merge `student_grading_history` with `student_certificates` per student.

## Open item
- Conversion fees for each conversion and each country are needed. Placeholders will be used until you confirm them.
