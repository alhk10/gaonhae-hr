# Roadmap

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
