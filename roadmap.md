# Roadmap

## Recognized-student passport photos

- [x] Add passport photo upload and saved preview in `/hello` Update Personal Information
- [x] Reuse saved photo for photo-required `/hello` competition entries, allowing a submission-only replacement
- [x] Add default-on save-for-future-use switches to new `/hello` competition photo and Poom/Dan certificate uploads; show saved certificates in Personal Information
- [ ] Check saved-photo upload and competition submission with a real recognized session (blocked: external unmanaged Supabase session unavailable)

## Competition registration form

- [x] Prefill `/hello` competition email from saved Email 1
- [x] Remove general weight field while retaining category-specific required weight

## Invoice template payment details

- [x] Save cleared bank-transfer and PayNow QR fields and verify persisted values
- [x] Clear the previously retained Singapore details and verify public payment options and existing invoice PDF

## Country-specific invoice PDFs

- [x] Use saved country template for public invoice previews and School Fees invoices
- [x] Use saved country template for staff, student portal and `/hello` PDF downloads and emailed PDFs
- [x] Verify Singapore and Australian PDF appearance, including refunded invoices

## Accurate payment amounts from public forms to invoices

- [x] Store fee and GST separately on grading, competition, seminar and school-fee submissions
- [x] Public submit and import functions derive fee + GST consistently
- [x] Grading list no longer adds GST a second time
- [x] Correct past grading invoices (591 corrected: fee + 9% GST, payment matches amount received)
- [x] Fill fee/GST split on remaining grading, competition, seminar and school-fee submissions
- [x] Verified no public invoices remain with missing GST and no slip/amount mismatches

## Australian public payments

- [x] Treat Australian advertised fees as GST-inclusive in `/hello`
- [x] Store the extracted 10% GST without increasing the submitted total
- [x] Return the Australian invoice template and bank-transfer details for Australian branches

## Staff invoice creation: belt + payment date

- [x] Grading result pass promotes belt by 1, double by 2; confirmed/fail no change; invoice keeps student's current belt
- [x] Payment date in manual invoice creation defaults to the invoice date

## `/access` list readability

- [x] Align row spacing and field labels across five lists; prioritize student, status and amount on competition phone rows
- [x] Give narrow screens labelled, readable rows without losing tab-specific controls
- [x] Make School Fees, Grading, Competitions, Seminars, and Uniforms & Guards flow into structured second lines based on available list width
- [ ] Verify populated desktop and phone lists and existing actions (blocked: `/access` password and external Supabase session unavailable)
