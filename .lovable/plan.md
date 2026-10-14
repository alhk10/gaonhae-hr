# Downloadable complete competition outline on /perthcomp

## Goal
Below the "Competition structure" section of the Poomsae Competition card, add a download link for a complete competition outline PDF that visitors can save or print.

## Changes

### 1. Prebuild the outline PDF (Outcome A — fixed file)
- Generate `public/downloads/perth-2026-competition-outline.pdf` in the sandbox with Python (reportlab), Gaonhae-branded (dark red accents, logo at the top).
- Content, matching the page and server rules exactly:
  - Event overview: Sunday 29 Nov 2026, Scarborough Community Centre 2 – Function Room, $45 per event / $40 Gaonhae students (GST included), no spectator fee, registration closes 10 Nov 2026, max 100 participants, max 2 events.
  - 1. Eligibility (open to all clubs; age, gender and event categories; age by birth year)
  - 2. Age categories (4–6 · 7–8 · 9–11 · 12–14 · 15–17 · 18 & above)
  - 3. Poomsae events (Geup 10 – Taegeuk 1 Jang through Geup 1 – Taegeuk 8 Jang; Poom/Dan – Taegeuk 7 Jang, Taegeuk 8 Jang, Koryo, Keumgang, Taebaek)
  - 4. Event eligibility (own grade and higher only; Poom/Dan only Poom/Dan events; max 2 events; rank at registration)
  - 5. Competition structure (single-elimination recognised poomsae; grouped by age, gender and event; designated poomsae, winners advance)
  - 6. Gaonhae belt / grade mapping (Foundation 1–3 non-geup; White 10 Geup … Black Tip 1 Geup; Poom/Dan)
  - 7. Registration & payment (bank details with participant-name reference; registration via the /perthcomp page)
- Prebuilt from fixed inputs, so the page loads no PDF library.

### 2. Download link in the page — `src/pages/public/PublicPerthComp.tsx`
- After section 5 (Competition structure) inside the competition card, add a link styled like the page's secondary buttons: a Download icon plus "Download Complete Competition Outline (PDF)" pointing to the same-origin path `/downloads/perth-2026-competition-outline.pdf` with the `download` attribute.

## Verification
- Confirm the PDF exists in `public/downloads/` and renders correctly (inspect rendered pages as images).
- Playwright: click the link inside `expect_download()`, confirm the downloaded file is non-empty and opens as a PDF.

## Notes
- The PDF is static; if event rules change later, the file is regenerated to match.
