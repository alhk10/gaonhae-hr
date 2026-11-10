# Info sheet: choose branches before download

## What changes
- The **Info sheet** button in `/access` Grading opens a dialog instead of downloading right away.
- The dialog lists branches with checkboxes (multi-select), defaulting to the branches the current password can access, plus a **Download** button (disabled until at least one branch is ticked).
- The PDF is built on the spot. The front (Name/Grade lines, `/hello` QR, attire and protective-gear rules) stays the same. The back shows only the ticked branches, each with its name, address, map image and a Google Maps QR code.
- Layout on the back adapts: 1 branch gets a large map, 2 branches stack like today, 3–4 branches use smaller cards. Still two A5 handouts per A4 landscape sheet, printed double-sided, flip on the long edge.

## Grading toolbar layout
- First row: date and branch filters only.
- Second row: Events, **Grading List** (download, now labelled), Info sheet, **Grading Summary** (download, now labelled), Certificates, Edit. The row wraps on narrow screens.

## Technical details
- New `src/utils/gradingInfoSheetPdf.ts` (jsPDF + `qrcode`) that recreates the current front page and draws the reverse from the selected branches.
- Branch name and address come from the `branches` table. Maps use OpenStreetMap static tiles fetched at download time, with a pin at a location looked up from the address. If the map can't load, a framed address plus QR code is shown instead. The current two maps (Balmoral Plaza, Bukit Merah) are bundled as fallback images.
- New `InfoSheetBranchDialog.tsx`, wired into `PublicGradingList.tsx`. The old static PDF in `public/downloads` is removed.
- Check: generate PDFs for 1, 2 and 3 branches and look at each page.
