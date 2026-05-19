## Goal

Use a Singapore-specific signature image on the Grade Certificate PDF for SG branches, replacing the AU "Master Alvin Lee / Examiner" signature.

## Scope

Visual change to the certificate PDF only. No DB, RPC, or list/dialog changes.

## Changes

1. **Add SG signature asset**
   - Copy uploaded `image-907.png` (Kang Hyeonman / Headmaster — text is already baked into the image) to `src/assets/certificates/sg/master-signature.png`.

2. **`src/utils/gradingCertificatePDFGenerator.ts`**
   - Import the SG signature alongside the existing AU one.
   - Extend `GradingCertificateInput` with an optional `branchCountry?: string | null`.
   - In `drawCertificatePage`, pick the signature based on `branchCountry`:
     - `'SG' | 'Singapore'` (case-insensitive) → SG signature (PNG).
     - Otherwise → existing AU signature.
   - Keep `SIG_NATIVE` aspect-ratio logic; if the SG image has a different native aspect ratio, use a separate constant so it isn't stretched. (SG asset is roughly 456×280; AU stays 456×466.)
   - No standalone "Master Alvin Lee / Examiner" text is drawn by the generator today — that text is baked into the AU image. The SG image likewise has its own "Kang Hyeonman / Headmaster" baked in, so swapping the image alone satisfies "remove Master Alvin Lee and Examiner text".

3. **`src/pages/public/PublicGradingList.tsx`**
   - In `rowToCertInput`, pass `branchCountry: r.branch_country` through to the generator input. No other call-site changes needed.

## Out of scope

- Header logo, Kukkiwon / World Taekwondo logos, "In Affiliation With" text, scorecard page.
- Edit dialog, mass edit, results refresh, certificate eligibility — already addressed in prior turns.
