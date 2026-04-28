## Shift Footer Logos & Affiliation Text Right by 2cm

In `src/utils/gradingCertificatePDFGenerator.ts`, shift the World Taekwondo logo, Kukkiwon logo, and the centered "In Affiliation With" text 20mm to the right. Signature stays where it is.

### Changes
- `wtX`: `22` → `42`
- `kwX`: `60` → `80`
- `affiliationCenterX` recalculates automatically from the new logo positions, keeping the text centered between them.
- Signature coordinates untouched.