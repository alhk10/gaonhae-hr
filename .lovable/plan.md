# QR code for https://gaonhae.app/perthcomp

Create a scannable QR code PNG that opens `https://gaonhae.app/perthcomp`, saved to Files for download.

## What changes
- A high-resolution QR PNG (black on white, error correction level H, wide quiet margin) saved as `/mnt/documents/gaonhae-perthcomp-qr.png`.

## Technical detail
- Generate offline with Python `qrcode` at about 1200x1200 px, ECC level H, 4-module quiet zone.
- Decode the rendered QR to confirm it points to the exact URL before delivering.

No changes to the app or its data.
