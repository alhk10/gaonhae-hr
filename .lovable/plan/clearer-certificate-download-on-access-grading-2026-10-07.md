# Clearer certificate download on /access Grading

## What is happening
The two selected students (Kai En Ernest Lim, Le Yuan) were skipped for two reasons:
- Their **Result is still blank**. Certificates are only made for **Pass** or **Double**.
- Their slot is **Black Tip >> 1st Poom**. Poom/Dan gradings are left out on purpose because Kukkiwon issues those certificates.

The button still said "Certificates (2)" and then showed "No eligible rows selected", which was confusing.

## Changes
1. The Certificates button counts only students who can actually get a certificate, for example "Certificates (0 of 2)". It is greyed out when none of them can.
2. When some are skipped, the message names each student and the reason: "no result set", "Poom/Dan grading", "missing grading date" or "missing belt".
3. A short hint under a student's certificate checkbox explains why that student can't get one yet.
4. The certificate rules stay the same: Pass gets one, Double gets two, Poom/Dan and blank results are skipped.

## Technical details
- `PublicGradingList.tsx`: add `certIneligibleReason(row)`, which returns a reason string or null. `isCertEligible` will use it.
- Use it for the button count/disabled state, the per-student hint, and a skipped-students summary toast in `handleDownloadSelectedCertificates` and Print All.
- No database changes.
