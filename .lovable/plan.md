# Ready for Grading Test information sheet (2 × A5 on one A4, double-sided)

A printable PDF saved to Files. It's one A4 landscape sheet, printed on both sides, then cut down the middle to make two identical A5 handouts.

## Front (each A5 half)
- Gaonhae Taekwondo logo and the title "READY FOR GRADING TEST".
- A blank **Name** line and a blank **Grade** line for staff to write in.
- A large QR code that opens https://gaonhae.app/hello, with the caption **"Scan here to register"**.
- **Grading Attire**:
  - Clean, pressed uniform with the correct belt.
  - Plain white under-shirt for females
  - Single black ponytail for long hair
  - No accessories
- **Protective Gear**, using your wording:
  - Green belts & above are required to put on their arm, shin & groin guards before they report for grading.
  - Blue belts & above are required to put on their chestguards and headgear in addition to their arm, shin & groin guards.

## Back (each A5 half)
- Heading: "Grading Venues".
- **Balmoral Plaza**: 271 Bukit Timah Road #02-08, Singapore 259708. Includes a street map with a pin marking the venue, plus a small QR code that opens it in Google Maps.
- **Bukit Merah**: Block 162 Bukit Merah Central #02-3551, Singapore 150162. Same map, pin and Google Maps QR code.
- The back is mirrored so each half lines up with its front when printed double-sided (flip on the long edge).

## Notes
- The maps are drawn from OpenStreetMap, with its credit shown in small print, because Google's map images need a paid key. The QR codes beside the maps still open Google Maps.
- I'll use the Gaonhae blue and red already used on the progress cards.
- Cut guides will run down the centre on both sides.
- I'll check both pages as images before adding the sheet to the app.

## Where to get it
- Add an **Info sheet** button next to the existing Download PDF button in the /access Grading tab. Clicking it downloads the sheet.
- The sheet doesn't change, so it's made once and stored in the app. No copy goes to Files.

## Technical details
- The prebuilt PDF goes to `public/downloads/ready-for-grading-info-sheet.pdf`.
- In `src/pages/public/PublicGradingList.tsx`, add an `<a href download>` button with a FileText icon beside the Download PDF button (around line 1654).
- Python with reportlab and qrcode, A4 landscape, two 148 × 210 mm panels per page.
- Map images are built by stitching OSM tiles around geocoded coordinates (zoom about 17) and drawing a pin.
- Back page panels are in reverse order so the halves align when flipped on the long edge.
