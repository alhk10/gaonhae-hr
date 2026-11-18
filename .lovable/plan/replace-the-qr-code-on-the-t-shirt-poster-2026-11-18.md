# Replace the QR code on the T-shirt poster

## What you'll get
- A copy of your poster where the QR code links to **https://gaonhae.app/hello**. The current code is unreadable.
- The new code fits the same white rounded box, with the Gaonhae logo in the centre. It uses high error-correction, so it still scans with the logo on top.
- Everything else on the poster stays exactly the same.
- The finished poster is saved to your Files as a PNG, ready to share or print.

## Steps
1. Make a QR code for https://gaonhae.app/hello and place it over the old code, matching its size and position.
2. Check by scanning it in software that it opens the right link.
3. Show you the finished poster.

## Technical details
- Generated with Python `qrcode` (error level H) and composited with PIL into the box at roughly x 712-912, y 1245-1440.
- The centre logo is cropped from the existing QR code's logo area.
- The QR code is decoded with `zbar`/`pyzbar` to verify the link.
- This is a one-off image change. Nothing in the app changes.
