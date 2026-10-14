# Downloadable complete competition outline on /perthcomp

## Goal
Below the "Competition structure" section of the Poomsae Competition card, add a download link for the complete competition outline PDF the user uploaded (`2026_GAONHAE_POOMSAE_COMPETITION_PERTH-2.pdf`).

## Changes

### 1. Ship the uploaded PDF as a fixed file (Outcome A)
- Copy the uploaded PDF to `public/downloads/perth-2026-competition-outline.pdf` so the app serves it same-origin (needed for the `download` attribute to work).

### 2. Download link in the page — `src/pages/public/PublicPerthComp.tsx`
- After section 5 (Competition structure) inside the competition card, add a link styled like the page's secondary buttons: a Download icon plus "Download Complete Competition Outline (PDF)" pointing to `/downloads/perth-2026-competition-outline.pdf` with the `download` attribute.

## Verification
- Playwright: click the link inside `expect_download()`, confirm the downloaded file is non-empty and opens as a PDF (check first page renders).
- Confirm the build log is clean.
